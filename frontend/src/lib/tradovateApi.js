const BASE = {
  live: 'https://live.tradovateapi.com/v1',
  demo: 'https://demo.tradovateapi.com/v1',
}

/* ── Auth (goes through our Vercel proxy) ── */
export async function authenticate(username, password, environment = 'live', cid = 0, sec = '') {
  const res = await fetch('/api/tradovate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: username, password, environment, cid, sec }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Authentication failed')
  return data
}

/* ── Generic authenticated GET ── */
async function tvGet(path, token, environment) {
  const res = await fetch(`${BASE[environment] || BASE.live}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) throw new Error('Session expired — please reconnect in Settings')
  if (!res.ok) throw new Error(`Tradovate error (${res.status})`)
  return res.json()
}

export async function fetchFills(token, environment = 'live') {
  return tvGet('/fill/list', token, environment)
}

export async function fetchAccounts(token, environment = 'live') {
  return tvGet('/account/list', token, environment)
}

/* ── Point values by contract ticker ── */
function getPointValue(ticker) {
  const t = (ticker || '').toUpperCase()
  if (t.startsWith('MNQ')) return 2
  if (t.startsWith('NQ'))  return 20
  if (t.startsWith('MES')) return 5
  if (t.startsWith('ES'))  return 50
  if (t.startsWith('MYM')) return 0.5
  if (t.startsWith('YM'))  return 5
  if (t.startsWith('MCL')) return 100
  if (t.startsWith('CL'))  return 1000
  if (t.startsWith('MGC')) return 10
  if (t.startsWith('GC'))  return 100
  if (t.startsWith('SI'))  return 5000
  return 10
}

/* Strip expiry letters/numbers from ticker to get base symbol */
function cleanTicker(ticker) {
  if (!ticker) return 'UNK'
  return ticker.replace(/[A-Z]\d{2,}$/, '').replace(/\d+!?$/, '') || ticker.slice(0, 3)
}

/*
 * Map Tradovate fills → Covenant Trader trade objects.
 * Uses FIFO position tracking per contract.
 * Skips fill IDs already in existingIds.
 */
export function mapFillsToTrades(fills, existingIds = []) {
  if (!Array.isArray(fills) || !fills.length) return []

  const skipIds = new Set(existingIds.map(String))
  const eligible = fills.filter(f => !skipIds.has(String(f.id)))
  if (!eligible.length) return []

  // Group by contractId and sort chronologically
  const byContract = {}
  for (const fill of eligible) {
    const key = String(fill.contractId || fill.contractTicker || 'unknown')
    if (!byContract[key]) byContract[key] = []
    byContract[key].push(fill)
  }

  const trades = []

  for (const cFills of Object.values(byContract)) {
    const sorted = [...cFills].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const ticker = sorted[0].contractTicker || String(sorted[0].contractId)
    const pv = getPointValue(ticker)
    const sym = cleanTicker(ticker)

    // FIFO position state
    let netQty = 0        // positive = long, negative = short
    let entries = []      // [{ price, qty, time }]
    let side = null       // 'Long' | 'Short'

    for (const fill of sorted) {
      const isBuy = fill.action === 'Buy'
      const qty = fill.qty || 1
      const price = parseFloat(fill.price)

      if (netQty === 0) {
        // Opening fresh position
        netQty = isBuy ? qty : -qty
        side = isBuy ? 'Long' : 'Short'
        entries = [{ price, qty, time: fill.timestamp }]
      } else if ((netQty > 0 && !isBuy) || (netQty < 0 && isBuy)) {
        // Closing or reversing
        let toClose = qty
        while (toClose > 0 && entries.length > 0) {
          const entry = entries[0]
          const matchQty = Math.min(toClose, entry.qty)
          const rawPnl = side === 'Long'
            ? (price - entry.price) * matchQty * pv
            : (entry.price - price) * matchQty * pv
          const pnl = parseFloat(rawPnl.toFixed(2))

          trades.push({
            date: fill.timestamp.slice(0, 10),
            symbol: sym,
            direction: side,
            timeframe: 'Day Trade',
            entryPrice: String(entry.price),
            exitPrice: String(price),
            positionSize: String(matchQty),
            commission: '0',
            netPnl: pnl,
            grossPnl: pnl,
            result: pnl > 0 ? 'Win' : pnl < 0 ? 'Loss' : 'Breakeven',
            followedPlan: 'Yes',
            movedStop: 'No',
            sizedCorrectly: 'Yes',
            preTrade: '',
            postTrade: '',
            mindsetNotes: '',
            strategyName: '',
            tradeNotes: 'Auto-imported from Tradovate',
            scripture: '',
            prayer: '',
            gratitude: '',
            createdAt: fill.timestamp,
            source: 'tradovate',
            tradovateId: String(fill.id),
          })

          entry.qty -= matchQty
          toClose -= matchQty
          netQty += isBuy ? matchQty : -matchQty
          if (entry.qty === 0) entries.shift()
        }

        // If overshoot → open reversed position
        if (toClose > 0) {
          side = isBuy ? 'Long' : 'Short'
          netQty = isBuy ? toClose : -toClose
          entries = [{ price, qty: toClose, time: fill.timestamp }]
        }
      } else {
        // Adding to existing position
        netQty += isBuy ? qty : -qty
        entries.push({ price, qty, time: fill.timestamp })
      }
    }
  }

  return trades
}
