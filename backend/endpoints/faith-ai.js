/**
 * POST /api/faith-ai
 *
 * Admin-only AI endpoints. Dispatches on req.body.type:
 *   "coach"   — analyze a single trade + last 20 trades
 *   "summary" — 30-day pattern summary
 *
 * Auth: x-admin-key header
 *
 * ── Supabase: run this once in the SQL editor ────────────────────────
 * CREATE TABLE IF NOT EXISTS ai_feedback (
 *   id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id       uuid,
 *   trade_id      uuid,
 *   feedback_json jsonb,
 *   created_at    timestamptz DEFAULT now()
 * );
 * ────────────────────────────────────────────────────────────────────
 */
import Anthropic from '@anthropic-ai/sdk'
import { applySecurity, handleOptions, requireMethod, limitBody, getClientIP } from './_lib/security.js'

// Read the API key and strip any leading BOM (﻿) or surrounding whitespace.
// A pasted key with a hidden BOM makes the Anthropic SDK throw a ByteString error
// when it builds the auth header ("character at index 0 has a value of 65279").
function getApiKey() {
  const raw = process.env.ANTHROPIC_API_KEY
  if (!raw) return ''
  return raw.replace(/[^ -~]/g, '').trim()
}

// In-memory rate limit — chat: 50/hr, coach/summary: 20/hr
const _rl = new Map()
function rateLimit(ip, type) {
  const now = Date.now()
  const window = 60 * 60 * 1000
  const limit = type === 'chat' ? 50 : 20
  const key = `${ip}:${type}`
  const entry = _rl.get(key) || { count: 0, reset: now + window }
  if (now > entry.reset) { entry.count = 0; entry.reset = now + window }
  entry.count++
  _rl.set(key, entry)
  return entry.count <= limit
}

const CHAT_SYSTEM = `You are Alan — the "Ask Alan" AI, an elite trading coach and spiritual mentor inside Covenant Trader, a Christian trading journal. You are like a blend of an ICT futures master and a wise pastor. The user trades ES and NQ futures using ICT concepts (liquidity hunts, Market Structure Shifts, Fair Value Gaps, Order Blocks, killzones, London/NY sessions).

Guidelines:
- Be direct and specific — ALWAYS reference their actual numbers, percentages, and dollar amounts from the dashboard data
- When asked what to work on or what they're best at, quote the REPORT ANALYSIS section from the context — name the specific metric and number
- Weave in scripture naturally when it genuinely fits (don't force it on every message)
- Keep responses concise: 2-4 short paragraphs max
- Speak like a trusted coach who has studied their trading journal inside and out
- Be honest, even when it's hard to hear — call out bad patterns directly
- Never say "I don't have access to your data" — you DO have full access to their dashboard`

const COACH_SYSTEM = `You are an elite trading coach built into Covenant Trader, a Christian trading journal. The user trades ES and NQ futures using ICT concepts — they hunt liquidity, wait for manipulation, and target London and Asian session highs and lows. Analyze the trade provided and the recent trade history. Cover: 1) Execution quality (did they wait for manipulation, was entry confluent with MSS/FVG/OB/killzone), 2) Psychology (flag FOMO, revenge trading, hesitation, overconfidence), 3) Patterns across recent trades (what's working, what's recurring mistake), 4) One Bible verse directly applied to what this trader needs to hear right now. Be direct and concise. No fluff.`

const SUMMARY_SYSTEM = `You are an elite trading coach built into Covenant Trader, a Christian trading journal. The user trades ES and NQ futures using ICT concepts. Analyze 30 days of trades and give a honest, direct pattern summary. Include a Bible verse relevant to this trader's season. Be specific — name patterns, name mistakes, name wins. No fluff.`

function formatTrade(t) {
  return {
    date:         t.date,
    symbol:       t.symbol,
    direction:    t.direction,
    result:       t.result,
    netPnl:       t.netPnl ?? t.net_pnl,
    strategy:     t.strategyName ?? t.strategy_name,
    followedPlan: t.followedPlan ?? t.followed_plan,
    overRisked:   t.overRisked ?? t.sized_correctly,
    movedStop:    t.movedStop  ?? t.moved_stop,
    preTrade:     t.preTrade   ?? t.pre_trade,
    postTrade:    t.postTrade  ?? t.post_trade,
    entryQuality: t.entryQuality ?? t.entry_quality,
    exitQuality:  t.exitQuality  ?? t.exit_quality,
    notes:        t.tradeNotes   ?? t.trade_notes,
  }
}

function buildTraderContext(trades, goals, completions, settings, playbook) {
  const sections = []

  // ── Account settings ──
  if (settings && (settings.name || settings.startingBalance)) {
    const bal = parseFloat(settings.startingBalance) || 10000
    const risk = settings.riskPerTrade || 1
    sections.push(`ACCOUNT SETTINGS:
Trader name: ${settings.name || 'Trader'}
Starting balance: $${bal.toLocaleString()}
Risk per trade: ${risk}%
Currency: ${settings.currency || 'USD'}`)
  }

  // ── Goals ──
  if (goals && goals.length) {
    const today = new Date().toISOString().split('T')[0]
    const todayDone = (completions && completions[today]) || []
    const completedToday = goals.filter(g => todayDone.includes(g.id))
    const goalLines = goals.map(g => `  ${todayDone.includes(g.id) ? '✓' : '○'} ${g.text}`).join('\n')
    sections.push(`DAILY GOALS (${completedToday.length}/${goals.length} done today):
${goalLines}`)
  }

  // ── Playbook strategies ──
  if (playbook && playbook.length) {
    const strats = playbook.slice(0, 10).map(s => `  - ${s.name || s.title || 'Strategy'}${s.description ? `: ${s.description}` : ''}`).join('\n')
    sections.push(`PLAYBOOK STRATEGIES (${playbook.length} total):
${strats}`)
  }

  // ── Trade data ──
  if (!trades || !trades.length) {
    sections.push('TRADE HISTORY: No trades logged yet.')
    return '\n\n' + sections.join('\n\n')
  }

  const fmt = trades.slice(0, 100).map(formatTrade)
  const wins   = fmt.filter(t => t.result === 'Win')
  const losses = fmt.filter(t => t.result === 'Loss')
  const pnls   = fmt.map(t => parseFloat(t.netPnl) || 0)
  const totalPnl = pnls.reduce((a, b) => a + b, 0)
  const avgWin   = wins.length   ? wins.reduce((a, t) => a + (parseFloat(t.netPnl) || 0), 0) / wins.length   : 0
  const avgLoss  = losses.length ? losses.reduce((a, t) => a + (parseFloat(t.netPnl) || 0), 0) / losses.length : 0
  const winRate  = Math.round(wins.length / fmt.length * 100)

  const now = Date.now()
  const weekAgo  = now - 7  * 24 * 60 * 60 * 1000
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000
  const weekTrades  = fmt.filter(t => new Date(t.date || 0).getTime() >= weekAgo)
  const monthTrades = fmt.filter(t => new Date(t.date || 0).getTime() >= monthAgo)
  const weekPnl  = weekTrades.reduce((a, t)  => a + (parseFloat(t.netPnl) || 0), 0)
  const monthPnl = monthTrades.reduce((a, t) => a + (parseFloat(t.netPnl) || 0), 0)

  // Streak
  let streak = 0
  const sorted = [...fmt].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
  if (sorted.length) {
    const first = sorted[0].result
    for (const t of sorted) { if (t.result === first) streak++; else break }
    streak = first === 'Win' ? streak : -streak
  }
  const streakLabel = streak > 0 ? `${streak} wins in a row` : streak < 0 ? `${Math.abs(streak)} losses in a row` : 'none'

  // Best / worst trade
  const byPnl   = [...fmt].sort((a, b) => (parseFloat(b.netPnl) || 0) - (parseFloat(a.netPnl) || 0))
  const best    = byPnl[0]
  const worst   = byPnl[byPnl.length - 1]

  // Discipline
  const followedPlan = fmt.filter(t => t.followedPlan === 'Yes').length
  const brokenPlan   = fmt.filter(t => t.followedPlan === 'No').length
  const overRisked   = fmt.filter(t => t.overRisked === 'Yes').length
  const movedStop    = fmt.filter(t => t.movedStop === 'Yes').length

  // Psychology patterns
  const psychFields = ['sleepQuality','energyLevel','focusLevel','stressLevel','revengeTrade','movedStopFear']
  const psychLines = psychFields.map(field => {
    const groups = {}
    fmt.forEach(t => {
      const val = t[field] || (t.notes && '')
      // pull directly from raw trade object since formatTrade may not include psych fields
    })
    return null
  }).filter(Boolean)

  // Pull psych directly from raw trades
  const raw = trades.slice(0, 100)
  const psychSummary = {}
  ;['sleepQuality','energyLevel','focusLevel','stressLevel','revengeTrade','movedStopFear'].forEach(field => {
    const groups = {}
    raw.forEach(t => {
      const v = t[field]; if (!v) return
      if (!groups[v]) groups[v] = { count: 0, pnl: 0, wins: 0 }
      groups[v].count++
      groups[v].pnl += parseFloat(t.netPnl) || 0
      if (t.result === 'Win') groups[v].wins++
    })
    if (Object.keys(groups).length) {
      psychSummary[field] = Object.entries(groups)
        .map(([v, d]) => `${v}: ${d.count} trades, ${Math.round(d.wins/d.count*100)}% win, $${d.pnl.toFixed(2)} P&L`)
        .join(' | ')
    }
  })

  // Pre/post emotions
  const emotions = {}
  raw.forEach(t => {
    const e = t.preTrade; if (!e) return
    if (!emotions[e]) emotions[e] = { count: 0, pnl: 0 }
    emotions[e].count++
    emotions[e].pnl += parseFloat(t.netPnl) || 0
  })
  const emotionLines = Object.entries(emotions)
    .map(([e, d]) => `${e}: ${d.count} trades, $${d.pnl.toFixed(2)} P&L`)
    .join(' | ')

  // Best sessions
  const sessions = {}
  raw.forEach(t => {
    const s = t.tradingSession; if (!s) return
    if (!sessions[s]) sessions[s] = { count: 0, pnl: 0, wins: 0 }
    sessions[s].count++
    sessions[s].pnl += parseFloat(t.netPnl) || 0
    if (t.result === 'Win') sessions[s].wins++
  })
  const sessionLines = Object.entries(sessions)
    .map(([s, d]) => `${s}: ${d.count} trades, $${d.pnl.toFixed(2)} P&L`)
    .join(' | ')

  // Strategy breakdown
  const strategies = {}
  raw.forEach(t => {
    const s = t.strategyName; if (!s) return
    if (!strategies[s]) strategies[s] = { count: 0, pnl: 0, wins: 0 }
    strategies[s].count++
    strategies[s].pnl += parseFloat(t.netPnl) || 0
    if (t.result === 'Win') strategies[s].wins++
  })
  const stratLines = Object.entries(strategies).slice(0, 8)
    .map(([s, d]) => `${s}: ${d.count}T, ${Math.round(d.wins/d.count*100)}%W, $${d.pnl.toFixed(2)}`)
    .join(' | ')

  const recent5 = fmt.slice(0, 5).map(t =>
    `${t.date || '?'} | ${t.symbol || '?'} ${t.direction || ''} | ${t.result} | $${t.netPnl}`
  ).join('\n')

  sections.push(`PERFORMANCE SUMMARY (${fmt.length} total trades):
Win rate: ${winRate}% (${wins.length}W / ${losses.length}L)
Total P&L: $${totalPnl.toFixed(2)}
Avg win: +$${avgWin.toFixed(2)} | Avg loss: -$${Math.abs(avgLoss).toFixed(2)}
This week: ${weekTrades.length} trades, $${weekPnl.toFixed(2)}
This month: ${monthTrades.length} trades, $${monthPnl.toFixed(2)}
Current streak: ${streakLabel}
Best trade: $${parseFloat(best?.netPnl || 0).toFixed(2)} (${best?.symbol || '?'} ${best?.date || ''})
Worst trade: $${parseFloat(worst?.netPnl || 0).toFixed(2)} (${worst?.symbol || '?'} ${worst?.date || ''})`)

  sections.push(`DISCIPLINE (${fmt.length} trades):
Followed plan: ${followedPlan}/${fmt.length} (${Math.round(followedPlan/fmt.length*100)}%)
Broke plan: ${brokenPlan} times
Over-risked: ${overRisked} times
Moved stop loss: ${movedStop} times`)

  if (emotionLines) sections.push(`PRE-TRADE EMOTIONS:\n${emotionLines}`)
  if (sessionLines) sections.push(`SESSION PERFORMANCE:\n${sessionLines}`)
  if (stratLines)   sections.push(`STRATEGY BREAKDOWN:\n${stratLines}`)

  const psychEntries = Object.entries(psychSummary)
  if (psychEntries.length) {
    sections.push(`PSYCHOLOGY PATTERNS:\n` + psychEntries.map(([k, v]) => `${k}: ${v}`).join('\n'))
  }

  // ── Report Analysis: compute #1 strength and #1 weakness ──
  const analysisLines = []

  // Best discipline insight
  if (fmt.length >= 3) {
    const planFollowedTrades = fmt.filter(t => t.followedPlan === 'Yes')
    const planBrokenTrades   = fmt.filter(t => t.followedPlan === 'No')
    if (planFollowedTrades.length && planBrokenTrades.length) {
      const followedWR = Math.round(planFollowedTrades.filter(t => t.result === 'Win').length / planFollowedTrades.length * 100)
      const brokenWR   = Math.round(planBrokenTrades.filter(t => t.result === 'Win').length  / planBrokenTrades.length  * 100)
      const diff = followedWR - brokenWR
      if (diff > 15) analysisLines.push(`STRENGTH — Following the plan: ${followedWR}% win rate when following plan vs ${brokenWR}% when breaking it (+${diff}% edge)`)
      if (diff < -5) analysisLines.push(`WEAKNESS — Plan discipline: win rate actually drops ${Math.abs(diff)}% when following the plan — something is wrong with the strategy itself`)
      if (brokenWR < followedWR - 10) analysisLines.push(`WEAKNESS — Breaking the plan costs money: ${brokenWR}% win rate when plan is broken vs ${followedWR}% when followed`)
    }

    // Over-risking
    const overRiskedTrades = fmt.filter(t => t.overRisked === 'Yes')
    if (overRiskedTrades.length >= 2) {
      const orPnl = overRiskedTrades.reduce((a, t) => a + (parseFloat(t.netPnl) || 0), 0)
      if (orPnl < 0) analysisLines.push(`WEAKNESS — Over-risking: ${overRiskedTrades.length} trades where you over-sized, total loss $${Math.abs(orPnl).toFixed(2)}`)
    }

    // Revenge trading
    const revengeTrades = raw.filter(t => t.revengeTrade === 'Yes')
    if (revengeTrades.length >= 2) {
      const rvPnl = revengeTrades.reduce((a, t) => a + (parseFloat(t.netPnl) || 0), 0)
      analysisLines.push(`WEAKNESS — Revenge trading: ${revengeTrades.length} revenge trades, net $${rvPnl.toFixed(2)} — this is draining your account`)
    }

    // Best session
    const sessionPnls = Object.entries(sessions).sort((a, b) => b[1].pnl - a[1].pnl)
    if (sessionPnls.length) {
      const [bestSession, bsd] = sessionPnls[0]
      const [worstSession, wsd] = sessionPnls[sessionPnls.length - 1]
      if (bsd.count >= 2) analysisLines.push(`STRENGTH — Best session: ${bestSession} (${bsd.count} trades, $${bsd.pnl.toFixed(2)} P&L, ${Math.round(bsd.wins/bsd.count*100)}% win rate)`)
      if (wsd.count >= 2 && wsd.pnl < 0) analysisLines.push(`WEAKNESS — Worst session: ${worstSession} (${wsd.count} trades, $${wsd.pnl.toFixed(2)} P&L) — consider avoiding this session`)
    }

    // Best strategy
    const stratPnls = Object.entries(strategies).sort((a, b) => b[1].pnl - a[1].pnl)
    if (stratPnls.length) {
      const [bestStrat, bst] = stratPnls[0]
      const [worstStrat, wst] = stratPnls[stratPnls.length - 1]
      if (bst.count >= 2) analysisLines.push(`STRENGTH — Best strategy: "${bestStrat}" (${bst.count} trades, $${bst.pnl.toFixed(2)} P&L, ${Math.round(bst.wins/bst.count*100)}% win rate)`)
      if (wst.count >= 2 && wst.pnl < 0) analysisLines.push(`WEAKNESS — Worst strategy: "${worstStrat}" ($${wst.pnl.toFixed(2)} P&L) — this setup is costing you`)
    }

    // Psychology: sleep
    const sleepGroups = {}
    raw.forEach(t => { if (!t.sleepQuality) return; if (!sleepGroups[t.sleepQuality]) sleepGroups[t.sleepQuality] = { pnl: 0, count: 0, wins: 0 }; sleepGroups[t.sleepQuality].count++; sleepGroups[t.sleepQuality].pnl += parseFloat(t.netPnl) || 0; if (t.result === 'Win') sleepGroups[t.sleepQuality].wins++ })
    const goodSleep = sleepGroups['Good'] || sleepGroups['Excellent']
    const poorSleep = sleepGroups['Poor'] || sleepGroups['Fair']
    if (goodSleep && poorSleep && goodSleep.count >= 2 && poorSleep.count >= 2) {
      const goodWR = Math.round(goodSleep.wins / goodSleep.count * 100)
      const poorWR = Math.round(poorSleep.wins / poorSleep.count * 100)
      if (poorWR < goodWR - 15) analysisLines.push(`WEAKNESS — Sleep impact: win rate drops from ${goodWR}% (good sleep) to ${poorWR}% (poor sleep) — sleep is directly affecting your trading`)
      if (goodWR > poorWR + 15) analysisLines.push(`STRENGTH — Sleep discipline: you perform ${goodWR - poorWR}% better with good sleep — keep protecting your sleep`)
    }

    // Direction bias
    const longs  = fmt.filter(t => t.direction === 'Long')
    const shorts = fmt.filter(t => t.direction === 'Short')
    if (longs.length >= 3 && shorts.length >= 3) {
      const longWR  = Math.round(longs.filter(t => t.result === 'Win').length  / longs.length  * 100)
      const shortWR = Math.round(shorts.filter(t => t.result === 'Win').length / shorts.length * 100)
      const longPnl  = longs.reduce((a, t)  => a + (parseFloat(t.netPnl) || 0), 0)
      const shortPnl = shorts.reduce((a, t) => a + (parseFloat(t.netPnl) || 0), 0)
      if (longWR > shortWR + 15) analysisLines.push(`STRENGTH — Long bias: ${longWR}% win rate Long vs ${shortWR}% Short — you clearly read upside better`)
      if (shortWR > longWR + 15) analysisLines.push(`STRENGTH — Short bias: ${shortWR}% win rate Short vs ${longWR}% Long — you read downside better`)
      if (shortPnl < 0 && longPnl > 0) analysisLines.push(`WEAKNESS — Short trades are losing you money ($${shortPnl.toFixed(2)}) while Longs are profitable ($${longPnl.toFixed(2)})`)
      if (longPnl < 0 && shortPnl > 0) analysisLines.push(`WEAKNESS — Long trades are losing you money ($${longPnl.toFixed(2)}) while Shorts are profitable ($${shortPnl.toFixed(2)})`)
    }
  }

  if (analysisLines.length) {
    sections.push(`REPORT ANALYSIS (your #1 strength and biggest weakness — always reference these):\n` + analysisLines.join('\n'))
  }

  sections.push(`LAST 5 TRADES:\n${recent5}`)

  // Last 20 trades as compact rows (not full JSON — keeps context manageable)
  const last20 = fmt.slice(0, 20).map(t =>
    `${t.date||'?'} | ${t.symbol||'?'} ${t.direction||''} | ${t.result} | $${t.netPnl} | plan:${t.followedPlan||'?'} | strat:${t.strategy||'?'}`
  ).join('\n')
  sections.push(`RECENT 20 TRADES (compact):\n${last20}`)

  return `\n\n=== TRADER DASHBOARD (reference these specific numbers) ===\n` +
    sections.join('\n\n') +
    `\n=== END DASHBOARD ===`
}

async function handleChat(body, res) {
  const { message, history = [], trades = [], goals, completions, settings, playbook } = body
  if (!message) return res.status(400).json({ error: 'message is required' })

  const apiKey = getApiKey()
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured.' })

  const traderContext = buildTraderContext(trades, goals, completions, settings, playbook)

  const systemWithContext = CHAT_SYSTEM + traderContext + `

IMPORTANT RULES:
1. Always reference the trader's ACTUAL numbers — win rate, P&L, streak, specific dollar amounts.
2. When asked "what should I work on?" or "what am I best at?" — go directly to the REPORT ANALYSIS section above and cite those exact findings with the numbers.
3. If they ask a general question like "how am I doing?" — lead with their win rate, total P&L, this week's P&L, and current streak. Then mention their #1 strength and #1 weakness from the report analysis.
4. Never give generic advice when real data exists. Every answer should feel like it came from someone who studied their journal.
5. Address the trader by their first name (see "Trader name" above) — greet them by name and use it naturally once or twice in longer replies. Never invent a name: if no trader name is given, just say "trader".`

  const msgs = [
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ]

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 600,
    system: systemWithContext,
    messages: msgs,
  })

  return res.status(200).json({ reply: response.content[0]?.text || '' })
}

async function handleCoach(body, res) {
  const { trade, recentTrades = [], userId } = body
  if (!trade) return res.status(400).json({ error: 'trade is required' })

  const apiKey = getApiKey()
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured.' })

  const prompt = `TRADE BEING ANALYZED:\n${JSON.stringify(formatTrade(trade), null, 2)}\n\nLAST ${Math.min(recentTrades.length, 20)} TRADES:\n${JSON.stringify(recentTrades.slice(0, 20).map(formatTrade), null, 2)}\n\nRespond ONLY with valid JSON:\n{"execution":"...","psychology":"...","patterns":"...","scripture":"...","scriptureRef":"..."}`

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 800,
    system: COACH_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  })

  const match = (response.content[0]?.text || '').match(/\{[\s\S]*\}/)
  if (!match) return res.status(422).json({ error: 'AI returned unexpected format. Try again.' })
  const feedback = JSON.parse(match[0])

  return res.status(200).json(feedback)
}

async function handleSummary(body, res) {
  const { trades = [] } = body
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recent = trades.filter(t => new Date(t.createdAt || t.created_at || t.date || 0) >= cutoff).slice(0, 100)
  if (!recent.length) return res.status(400).json({ error: 'No trades found in the last 30 days.' })

  const apiKey = getApiKey()
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured.' })

  const prompt = `Here are the last 30 days of trades (${recent.length} total):\n${JSON.stringify(recent.map(formatTrade), null, 2)}\n\nRespond ONLY with valid JSON:\n{"strength":"...","weakness":"...","ruleChange":"...","scripture":"...","scriptureRef":"..."}`

  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 700,
    system: SUMMARY_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  })

  const match = (response.content[0]?.text || '').match(/\{[\s\S]*\}/)
  if (!match) return res.status(422).json({ error: 'AI returned unexpected format.' })
  const result = JSON.parse(match[0])
  return res.status(200).json({ ...result, tradeCount: recent.length })
}

export default async function handler(req, res) {
  applySecurity(req, res)
  if (handleOptions(req, res)) return
  if (!requireMethod(req, res, 'POST')) return
  if (!limitBody(req, res, 1_000_000)) return

  const ip = getClientIP(req)
  const { type } = req.body || {}
  if (!rateLimit(ip, type)) return res.status(429).json({ error: 'Too many requests. Please wait and try again.' })

  try {
    if (type === 'chat')    return await handleChat(req.body, res)
    if (type === 'coach')   return await handleCoach(req.body, res)
    if (type === 'summary') return await handleSummary(req.body, res)
    return res.status(400).json({ error: 'type must be "chat", "coach" or "summary"' })
  } catch (e) {
    console.error('[faith-ai error]', type, e?.status, e?.message, e?.stack?.slice(0, 300))
    return res.status(500).json({ error: e?.message || 'AI request failed. Please try again.' })
  }
}
