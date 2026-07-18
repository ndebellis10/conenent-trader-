import { requireAdmin } from './_lib/adminAuth.js'
import { supabaseAdmin, supabaseConfigured } from './_lib/supabase-admin.js'

const HIDDEN = ['nickisthebesttrader@faithtrader.app']
/**
 * /api/leaderboard-data
 * Also handles ?action=historical for backtesting market data (merged to stay within Vercel's 12-function limit)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,x-admin-key')

  if (req.method === 'OPTIONS') return res.status(200).end()

  /* ── Historical market data proxy (for backtesting replay) ── */
  const qs = new URL(req.url, 'http://x').searchParams
  if (qs.get('action') === 'historical' && req.method === 'GET') {
    const symbol   = (qs.get('symbol') || '').replace(/[^A-Za-z0-9=\-\.]/g, '').toUpperCase()
    const interval = ['1m','2m','5m','15m','30m','60m','90m','1h','1d','5d','1wk','1mo','3mo'].includes(qs.get('interval')) ? qs.get('interval') : '60m'
    const range    = ['1d','5d','1mo','3mo','6mo','1y','2y','5y','10y','ytd','max'].includes(qs.get('range')) ? qs.get('range') : '2y'
    if (!symbol) return res.status(400).json({ candles: [], error: 'symbol required' })
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&includePrePost=false`
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Accept: 'application/json' } })
      if (!r.ok) return res.status(200).json({ candles: [], error: `Yahoo ${r.status}` })
      const data   = await r.json()
      const result = data?.chart?.result?.[0]
      if (!result) return res.status(200).json({ candles: [], error: 'No data' })
      const { timestamp, indicators, meta } = result
      const quote = indicators?.quote?.[0]
      if (!timestamp || !quote) return res.status(200).json({ candles: [], error: 'Empty response' })
      const candles = timestamp
        .map((t, i) => ({ time: t, open: quote.open[i], high: quote.high[i], low: quote.low[i], close: quote.close[i], volume: quote.volume[i] || 0 }))
        .filter(c => c.open != null && c.high != null && c.low != null && c.close != null && isFinite(c.open) && isFinite(c.close))
      return res.status(200).json({ candles, meta: { symbol: meta.symbol, currency: meta.currency, exchange: meta.exchangeName, interval: meta.dataGranularity } })
    } catch (e) {
      return res.status(200).json({ candles: [], error: String(e) })
    }
  }

  /* ── ForexFactory USD economic news (this week's calendar, USD only) ── */
  if (qs.get('action') === 'news' && req.method === 'GET') {
    try {
      const r = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.xml', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', Accept: 'application/xml,text/xml' },
      })
      if (!r.ok) return res.status(200).json({ events: [], error: `feed ${r.status}` })
      const xml  = await r.text()
      const pick = (block, tag) => {
        const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'))
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : ''
      }
      const events = []
      for (const b of (xml.match(/<event>[\s\S]*?<\/event>/gi) || [])) {
        if (pick(b, 'country').toUpperCase() !== 'USD') continue
        events.push({
          title:    pick(b, 'title'),
          date:     pick(b, 'date'),
          time:     pick(b, 'time'),
          impact:   pick(b, 'impact'),
          forecast: pick(b, 'forecast'),
          previous: pick(b, 'previous'),
        })
      }
      res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600')
      return res.status(200).json({ events, updated: new Date().toISOString() })
    } catch (e) {
      return res.status(200).json({ events: [], error: String(e) })
    }
  }

  /* ── Storage: Supabase `leaderboard` table ──────────────────────────
     Previously a GitHub-backed JSON file, which needed GITHUB_TOKEN to
     write. Without it every sync silently no-opped while still returning
     {ok:true}, so the board looked broken with no error anywhere. Supabase
     is already configured for auth, so the standings live there now and
     writes work with no extra configuration. */

  if (req.method === 'GET') {
    if (!supabaseConfigured) {
      return res.status(503).json({ traders: [], error: 'Leaderboard storage is not configured.' })
    }
    try {
      const { data, error } = await supabaseAdmin
        .from('leaderboard')
        .select('*')
        .eq('hidden', false)
        .order('total_pnl', { ascending: false })
      if (error) throw error

      const visible = (data || []).filter(
        t => t.email && !HIDDEN.includes(String(t.email).toLowerCase())
      )
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ traders: visible })
    } catch (e) {
      return res.status(200).json({ traders: [], error: String(e.message || e) })
    }
  }

  if (req.method === 'POST') {
    const entry = req.body
    if (!entry?.email) return res.status(400).json({ error: 'email required' })
    if (HIDDEN.includes(String(entry.email).toLowerCase())) return res.status(200).json({ ok: true })
    if (!supabaseConfigured) {
      // Report the failure instead of pretending it saved
      return res.status(503).json({ ok: false, error: 'Leaderboard storage is not configured.' })
    }

    try {
      const email = String(entry.email).toLowerCase()

      // A hidden/banned trader must never sync themselves back in
      const { data: existing } = await supabaseAdmin
        .from('leaderboard').select('hidden, joined_at').eq('email', email).maybeSingle()
      if (existing?.hidden) return res.status(200).json({ ok: true, banned: true })

      const row = {
        email,
        display_name:      entry.display_name || email.split('@')[0],
        total_trades:      entry.total_trades ?? 0,
        wins:              entry.wins ?? 0,
        win_rate:          entry.win_rate ?? 0,
        total_pnl:         entry.total_pnl ?? 0,
        avg_rr:            entry.avg_rr ?? null,
        avg_entry:         entry.avg_entry ?? 0,
        avg_exit:          entry.avg_exit ?? 0,
        avg_faith:         entry.avg_faith ?? 0,
        discipline:        entry.discipline ?? 0,
        faith_score:       entry.faith_score ?? 0,
        backtest_trades:   entry.backtest_trades ?? 0,
        backtest_pnl:      entry.backtest_pnl ?? 0,
        backtest_win_rate: entry.backtest_win_rate ?? 0,
        joined_at:         existing?.joined_at || entry.joined_at || new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      }

      const { error } = await supabaseAdmin.from('leaderboard').upsert(row, { onConflict: 'email' })
      if (error) throw error
      return res.status(200).json({ ok: true })
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message || e) })
    }
  }

  /* Admin: hide a trader from the board (and stop them re-syncing) */
  if (req.method === 'DELETE') {
    if (requireAdmin(req, res)) return

    const url2  = new URL(req.url, 'http://x')
    const email = (url2.searchParams.get('email') || '').toLowerCase()
    const unhide = url2.searchParams.get('unhide') === '1'
    if (!email) return res.status(400).json({ error: 'email required' })
    if (!supabaseConfigured) return res.status(503).json({ ok: false, error: 'Leaderboard storage is not configured.' })

    try {
      const { error } = await supabaseAdmin
        .from('leaderboard')
        .update({ hidden: !unhide })
        .eq('email', email)
      if (error) throw error
      return res.status(200).json({ ok: true, hidden: !unhide })
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e.message || e) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
