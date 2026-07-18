/**
 * leaderboardApi.js
 * Syncs leaderboard data via /api/leaderboard-data (GitHub-backed, no Supabase needed)
 */

import { liveTrades, backtestTrades, summarize } from './tradeFilters'

export const supabaseConfigured = true

const HIDDEN = ['nickisthebesttrader@faithtrader.app']

const banKey = (email) => `ft-lb-banned-${email.toLowerCase()}`

export async function syncLeaderboard(displayName, email, trades) {
  if (!email || HIDDEN.includes(email.toLowerCase())) return
  // If the server already told us this account is banned, never sync again
  if (typeof localStorage !== 'undefined' && localStorage.getItem(banKey(email))) return

  // Always sync — use email prefix as fallback if no real name set yet
  const name = (displayName && displayName !== 'Trader' && !displayName.includes('@'))
    ? displayName
    : email.split('@')[0]

  // Backtest-tagged trades are paper results — they never count toward live rank
  const live       = liveTrades(trades)
  const bt         = summarize(backtestTrades(trades))
  const wins       = live.filter(t => t.result === 'Win').length
  const total      = live.length
  const winRate    = total ? (wins / total) * 100 : 0
  const totalPnl   = live.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
  const rrT        = live.filter(t => t.riskReward)
  const avgRR      = rrT.length ? rrT.reduce((s, t) => s + parseFloat(t.riskReward), 0) / rrT.length : null
  const avgEntry   = total ? live.reduce((s, t) => s + (t.entryQuality ?? 5), 0) / total : 0
  const avgExit    = total ? live.reduce((s, t) => s + (t.exitQuality  ?? 5), 0) / total : 0
  const avgFaith   = total ? live.reduce((s, t) => s + (t.faithRating  ?? 0), 0) / total : 0
  const discipline = total ? live.reduce((s, t) => {
    if (t.followedPlan === 'Yes')       return s + 1
    if (t.followedPlan === 'Partially') return s + 0.5
    return s
  }, 0) / total : 0
  const faithScore = Math.round(
    winRate * 0.35 + discipline * 100 * 0.20 +
    (avgEntry / 10) * 100 * 0.15 + (avgExit / 10) * 100 * 0.15 + (avgFaith / 5) * 100 * 0.15
  )

  fetch('/api/leaderboard-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, display_name: name, total_trades: total, wins,
      win_rate: Math.round(winRate * 10) / 10,
      total_pnl: Math.round(totalPnl * 100) / 100,
      avg_rr: avgRR != null ? Math.round(avgRR * 100) / 100 : null,
      avg_entry: Math.round(avgEntry * 10) / 10,
      avg_exit:  Math.round(avgExit  * 10) / 10,
      avg_faith: Math.round(avgFaith * 10) / 10,
      discipline: Math.round(discipline * 1000) / 1000,
      faith_score: faithScore, name_confirmed: true,
      backtest_trades:  bt.count,
      backtest_pnl:     bt.pnl,
      backtest_win_rate: bt.winRate,
    }),
  })
  .then(r => r.json())
  .then(data => {
    // Server says this account is banned — permanently stop syncing from this client
    if (data?.banned && typeof localStorage !== 'undefined') {
      localStorage.setItem(banKey(email), '1')
    }
  })
  .catch(() => {})
}

export async function getLeaderboard() {
  try {
    const r = await fetch('/api/leaderboard-data')
    if (!r.ok) return []
    const { traders } = await r.json()
    return (traders || []).sort((a, b) => (b.faith_score || 0) - (a.faith_score || 0))
  } catch {
    return []
  }
}
