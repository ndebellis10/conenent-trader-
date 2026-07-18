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

  const token = process.env.GITHUB_TOKEN

  // ── Shared helper: read leaderboard file directly from GitHub Contents API ──
  // Decodes base64 content in-process — bypasses raw.githubusercontent.com CDN
  // caching so deletes and syncs are always reflected immediately.
  async function readFile() {
    const metaR = await fetch(
      'https://api.github.com/repos/ndebellis10/conenent-trader-/contents/backend/data/leaderboard.json',
      { headers: { Authorization: `token ${token}`, 'User-Agent': 'covenant-trader', Accept: 'application/vnd.github.v3+json', 'Cache-Control': 'no-cache' } }
    )
    if (!metaR.ok) return { traders: [], banned: [], sha: null }
    const meta = await metaR.json()
    try {
      // Decode base64 content directly — no second HTTP request, no CDN cache
      const data = JSON.parse(Buffer.from(meta.content, 'base64').toString('utf-8'))
      return { traders: data.traders || [], banned: data.banned || [], sha: meta.sha }
    } catch {
      return { traders: [], banned: [], sha: meta.sha }
    }
  }

  async function writeFile(sha, traders, banned, message = 'leaderboard update') {
    const content = Buffer.from(JSON.stringify({ traders, banned }, null, 2)).toString('base64')
    const body    = { message, content }
    if (sha) body.sha = sha
    await fetch(
      'https://api.github.com/repos/ndebellis10/conenent-trader-/contents/backend/data/leaderboard.json',
      { method: 'PUT', headers: { Authorization: `token ${token}`, 'User-Agent': 'covenant-trader', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
  }

  if (req.method === 'GET') {
    if (!token) return res.status(200).json({ traders: [] })
    try {
      const { traders, banned } = await readFile()
      const HIDDEN = ['nickisthebesttrader@faithtrader.app']
      const bannedLower = (banned || []).map(e => e.toLowerCase())
      const visible = traders.filter(t =>
        t.email &&
        !HIDDEN.includes(t.email.toLowerCase()) &&
        !bannedLower.includes(t.email.toLowerCase())
      )
      // Never cache — deletions must be visible to all users immediately
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ traders: visible })
    } catch (e) {
      return res.status(200).json({ traders: [], error: String(e) })
    }
  }

  if (req.method === 'POST') {
    if (!token) return res.status(200).json({ ok: true })
    const entry = req.body
    if (!entry?.email) return res.status(400).json({ error: 'email required' })
    const HIDDEN = ['nickisthebesttrader@faithtrader.app']
    if (HIDDEN.includes(entry.email.toLowerCase())) return res.status(200).json({ ok: true })
    try {
      const { traders, banned, sha } = await readFile()

      // Banned users: tell the client explicitly so it can stop syncing forever
      if (banned.map(e => e.toLowerCase()).includes(entry.email.toLowerCase())) {
        return res.status(200).json({ ok: true, banned: true })
      }

      const idx      = traders.findIndex(t => t.email === entry.email)
      const existing = idx >= 0 ? traders[idx] : null
      const joined_at = existing?.joined_at || new Date().toISOString()
      const updated   = { ...entry, joined_at, updated_at: new Date().toISOString() }
      if (idx >= 0) traders[idx] = updated; else traders.push(updated)

      await writeFile(sha, traders, banned, 'leaderboard sync')
      return res.status(200).json({ ok: true })
    } catch (e) {
      return res.status(200).json({ ok: true, warning: String(e) })
    }
  }

  if (req.method === 'DELETE') {
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'alanluvsisreal'
    if (req.headers['x-admin-key'] !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' })

    const email = new URL(req.url, 'http://x').searchParams.get('email')
    if (!email) return res.status(400).json({ error: 'email required' })
    if (!token) return res.status(200).json({ ok: true })

    try {
      const { traders, banned, sha } = await readFile()

      // Remove from active traders
      const newTraders = traders.filter(t => t.email?.toLowerCase() !== email.toLowerCase())

      // Add to banned list so they can never re-sync back in
      const newBanned = banned.includes(email.toLowerCase())
        ? banned
        : [...banned, email.toLowerCase()]

      await writeFile(sha, newTraders, newBanned, 'leaderboard delete')
      return res.status(200).json({ ok: true })
    } catch (e) {
      return res.status(200).json({ ok: true, warning: String(e) })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
