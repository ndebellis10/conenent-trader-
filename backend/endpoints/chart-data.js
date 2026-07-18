/**
 * /api/chart-data — Yahoo Finance OHLCV proxy
 *
 * Fetches candlestick data server-side to bypass browser CORS restrictions.
 * Supports MNQ=F, NQ=F, MES=F, ES=F and any other Yahoo Finance symbol.
 *
 * GET /api/chart-data?symbol=MNQ=F&interval=60m&range=1y
 * GET /api/chart-data?symbol=MNQ=F&interval=5m&from=1700000000&to=1702000000
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { symbol, interval, range, from, to } = req.query

  if (!symbol || !interval) {
    res.status(400).json({ error: 'symbol and interval are required' })
    return
  }

  // Keep = in the path (futures tickers like MNQ=F need the literal =)
  // Only strip characters that could cause path injection
  const safeSym = String(symbol).replace(/[^a-zA-Z0-9=._\-^]/g, '')

  let url = `https://query1.finance.yahoo.com/v8/finance/chart/${safeSym}`
    + `?interval=${interval}&includePrePost=false&events=div%7Csplit`

  if (from && to) {
    url += `&period1=${from}&period2=${to}`
  } else {
    url += `&range=${range || '1y'}`
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':          'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      res.status(response.status).json({ error: `Yahoo Finance returned ${response.status}` })
      return
    }

    const data = await response.json()

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).json(data)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to fetch chart data' })
  }
}
