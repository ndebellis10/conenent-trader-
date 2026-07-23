import { mapFillsToTrades } from './tradovateApi'

/* CSV import helpers — shared by the live Log Trade importer and the
   separate Backtesting importer, so both parse identically. */

export function parseCsvLine(line) {
  const result = []
  let cur = '', inQ = false
  for (const ch of line) {
    if (ch === '"') inQ = !inQ
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
    else cur += ch
  }
  result.push(cur.trim())
  return result.map(v => v.replace(/^"|"$/g, '').trim())
}

export function normKey(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, '') }

// Known Tradovate / common header words — used to identify the real header row
const HEADER_WORDS = new Set([
  'date','time','datetime','contract','symbol','instrument','ticker',
  'bs','buysell','action','side','direction',
  'qty','quantity','contracts','price','fillprice',
  'commission','pnl','pl','profit','loss','netpnl','grosspnl',
  'entry','exit','open','close','result',
])

export function findHeaderRow(allLines) {
  for (let i = 0; i < Math.min(allLines.length, 20); i++) {
    const cells = parseCsvLine(allLines[i]).map(normKey)
    const hits = cells.filter(c => {
      if (HEADER_WORDS.has(c)) return true
      for (const hw of HEADER_WORDS) { if (c.includes(hw)) return true }
      return false
    })
    if (hits.length >= 2) return i
  }
  return 0
}

// Normalize a stored trade time (ISO timestamp or "HH:MM") for an <input type="time">
export function toTimeInput(value) {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{1,2}:\d{2}$/.test(raw)) return raw.padStart(5, '0')
  const d = new Date(raw)
  if (isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Parse any date string Tradovate might export (MM/DD/YYYY, YYYY-MM-DD, with time, etc.)
export function parseAnyDate(raw) {
  if (!raw) return new Date().toISOString().split('T')[0]
  // Remove AM/PM and extra time parts for simple comparison
  const clean = raw.trim()
  // Try ISO-ish first: YYYY-MM-DD
  let m = clean.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`
  // US format: MM/DD/YYYY
  m = clean.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`
  // Fallback: JS Date parse
  try {
    const d = new Date(clean)
    if (!isNaN(d)) return d.toISOString().split('T')[0]
  } catch {}
  return clean.slice(0, 10)
}

export function cleanSymbol(raw) {
  if (!raw) return 'UNK'
  // Strip expiry codes like H4, M24, Z5, etc. (letter + 1-2 digits at end)
  return raw.trim().toUpperCase().replace(/[A-Z]\d{1,2}$/, '').replace(/\d+$/, '') || raw.trim().slice(0, 6).toUpperCase()
}

export function parseTradeCSV(text) {
  const allLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (allLines.length < 2) return { trades: [], error: 'CSV is empty or has only headers.', debug: '' }

  const headerIdx = findHeaderRow(allLines)
  const rawHeaders = parseCsvLine(allLines[headerIdx])
  const headers = rawHeaders.map(normKey)

  const col = (...keys) => {
    for (const k of keys) {
      const norm = normKey(k)
      const i = headers.findIndex(h => h === norm)
      if (i !== -1) return i
    }
    for (const k of keys) {
      const norm = normKey(k)
      if (!norm) continue
      const i = headers.findIndex(h => h.includes(norm))
      if (i !== -1) return i
    }
    return -1
  }

  const dateCol   = col('Date/Time','datetime','filltime','fill time','date','timestamp','time')
  const symCol    = col('Contract','contract','symbol','instrument','ticker','market','product')
  const actionCol = col('B/S','bs','buysell','buy/sell','action','side','direction','type')
  const qtyCol    = col('Qty','qty','quantity','contracts','size','volume','shares','lots')
  const priceCol  = col('Fill Price','fillprice','fill price','avgfillprice','price','avgprice','tradeprice')
  const entryCol  = col('entryprice','entry price','entry','openprice','open price','avgentry','avg entry','buyprice','avg buy')
  const exitCol   = col('exitprice','exit price','exit','closeprice','close price','avgexit','avg exit','sellprice','avg sell')
  // Net P&L gets priority over Gross P&L
  const netPnlCol  = col('Net P&L','net p&l','net p/l','netpl','netpnl')
  const grossPnlCol = col('Gross P&L','gross p&l','gross p/l','grosspl','grosspnl','realized p&l','realizedpl','pnl','profit','pl','gain')
  const pnlCol     = netPnlCol !== -1 ? netPnlCol : grossPnlCol
  const commCol   = col('Commission','commission','fees','fee','comm')
  const notesCol  = col('notes','comment','description','tradenotes','trade notes')
  // Separate entry/exit time columns, if the export has them (some do)
  const entryTimeCol = col('entrytime','entry time','opentime','open time','buytime','boughttime')
  const exitTimeCol  = col('exittime','exit time','closetime','close time','selltime','soldtime')

  const debug = `Row ${headerIdx+1}: [${rawHeaders.slice(0,8).join(' | ')}] action:${actionCol} price:${priceCol} entry:${entryCol} exit:${exitCol} netPnl:${netPnlCol} grossPnl:${grossPnlCol}`

  // Every column NOT already mapped to a trade field gets appended to the notes,
  // so no information in the CSV is lost on import.
  const usedCols = new Set(
    [dateCol, symCol, actionCol, qtyCol, priceCol, entryCol, exitCol,
     netPnlCol, grossPnlCol, commCol, notesCol, entryTimeCol, exitTimeCol]
      .filter(i => i !== -1)
  )
  const extraInfo = (r) => {
    const parts = []
    for (let i = 0; i < rawHeaders.length; i++) {
      if (usedCols.has(i)) continue
      const key = String(rawHeaders[i] ?? '').trim()
      const val = String(r[i] ?? '').trim()
      if (key && val) parts.push(`${key}: ${val}`)
    }
    return parts.join(' | ').slice(0, 1500)
  }

  const dataLines = allLines.slice(headerIdx + 1)
  const rows = dataLines.map(parseCsvLine).filter(r => r.some(c => c))
  if (!rows.length) return { trades: [], error: 'No data rows found after headers.', debug }

  const get = (r, idx) => idx !== -1 ? String(r[idx] || '').replace(/[$,]/g, '').trim() : ''
  const parseMoney = v => {
    const s = String(v).replace(/[$,\s]/g, '').replace(/^\((.+)\)$/, '-$1')
    const n = parseFloat(s)
    return isFinite(n) ? n : null
  }

  // ── Strategy A: Tradovate fills (B/S column + fill price + Net P&L already in CSV) ──
  // Tradovate puts Net P&L on CLOSING fills, 0 on opening fills.
  // We just read closing fills directly — no FIFO math needed.
  const hasFillsFormat = actionCol !== -1 && priceCol !== -1 && pnlCol !== -1

  if (hasFillsFormat) {
    // Opening fills (P&L 0/blank) carry the ENTRY time. Queue them FIFO per
    // symbol so each closing fill can grab its matching entry time → the trade
    // gets a duration (time in trade).
    const openTimes = {}
    for (const r of rows) {
      const p = parseMoney(get(r, pnlCol))
      if (p !== null && p !== 0) continue  // this is a closing fill, skip
      const s = cleanSymbol(get(r, symCol))
      const t = get(r, dateCol)
      if (s && t) (openTimes[s] = openTimes[s] || []).push(t)
    }

    const trades = []
    for (const r of rows) {
      const rawPnl = parseMoney(get(r, pnlCol))
      // Only closing fills have non-zero P&L
      if (rawPnl === null || rawPnl === 0) continue
      const rawAction = get(r, actionCol).toUpperCase()
      // Prefer a column that literally states the position; otherwise infer from
      // the closing fill: S = was Long (sold to close), B = was Short (bought to close)
      let direction
      if (rawAction.includes('LONG')) direction = 'Long'
      else if (rawAction.includes('SHORT')) direction = 'Short'
      else {
        const isSell = rawAction === 'S' || rawAction.startsWith('SE') || rawAction === 'SELL'
        direction = isSell ? 'Long' : 'Short'
      }
      const sym = cleanSymbol(get(r, symCol))
      const comm = parseMoney(get(r, commCol)) ?? 0
      // Exit time = this closing fill; entry time = the matching opening fill
      const exitRaw  = get(r, dateCol)
      const entryRaw = (openTimes[sym] && openTimes[sym].shift()) || ''
      // Re-derive gross from net+commission if we only have net
      const netPnl  = netPnlCol  !== -1 ? (parseMoney(get(r, netPnlCol))  ?? rawPnl) : rawPnl
      const grossPnl = grossPnlCol !== -1 ? (parseMoney(get(r, grossPnlCol)) ?? netPnl + comm) : netPnl + comm

      trades.push({
        date:         parseAnyDate(get(r, dateCol)),
        symbol:       sym,
        direction,
        result:       netPnl > 0 ? 'Win' : netPnl < 0 ? 'Loss' : 'Breakeven',
        netPnl,
        grossPnl,
        positionSize: get(r, qtyCol) || '1',
        commission:   String(comm),
        exitPrice:    get(r, priceCol),
        entryPrice:   '',
        entryTime:    toTimeInput(entryRaw),
        exitTime:     toTimeInput(exitRaw),
        timeframe:    'Day Trade',
        tradeNotes:   ['Imported from Tradovate', extraInfo(r)].filter(Boolean).join(' | '),
        followedPlan: '', movedStop: '', overRisked: '', strategyName: '',
        source:       'tradovate-csv',
      })
    }

    if (trades.length > 0) return { trades, error: null, debug }

    // P&L column found but all rows are 0 — fall through to FIFO pairing
  }

  // ── Strategy B: fills format without P&L column — FIFO price pairing ──
  if (actionCol !== -1 && priceCol !== -1) {
    const fills = rows.map((r, i) => {
      const rawAction = get(r, actionCol).toUpperCase()
      const price = parseMoney(get(r, priceCol)) ?? 0
      const raw   = get(r, dateCol) || ''
      // Parse timestamp for ordering (handles MM/DD/YYYY AM/PM)
      const tsStr = raw.replace(/(\d+\/\d+\/\d+)\s/, '$1T').replace(' AM','').replace(' PM','')
      let ts
      try { ts = new Date(tsStr); if (isNaN(ts)) throw 0 } catch { ts = new Date() }
      return {
        id: i,
        contractTicker: get(r, symCol),
        action: (rawAction === 'B' || rawAction === 'BUY' || rawAction.startsWith('BU')) ? 'Buy' : 'Sell',
        qty:    Math.abs(parseFloat(get(r, qtyCol)) || 1),
        price,
        timestamp: ts.toISOString(),
      }
    }).filter(f => f.price > 0 && f.contractTicker)

    if (!fills.length) return { trades: [], error: `No fill prices found. Headers: ${rawHeaders.slice(0,8).join(', ')}`, debug }

    const trades = mapFillsToTrades(fills)
    if (!trades.length) return { trades: [], error: 'Could not pair Buy+Sell fills into trades. Check that both opening and closing fills are in the CSV.', debug }
    return { trades, error: null, debug }
  }

  // ── Strategy C: trade-per-row (entry + exit prices, or just P&L per row) ──
  const trades = rows.map(r => {
    const rawPnl = parseMoney(get(r, pnlCol)) ?? 0
    const rawDir = get(r, actionCol).toUpperCase()
    const direction = (rawDir === 'B' || rawDir === 'BUY' || rawDir.includes('LONG')) ? 'Long'
                    : (rawDir === 'S' || rawDir === 'SELL' || rawDir.includes('SHORT')) ? 'Short'
                    : 'Long'
    const sym = cleanSymbol(get(r, symCol))
    const comm = parseMoney(get(r, commCol)) ?? 0
    // Calculate from entry/exit if P&L column is missing
    const entryP = parseFloat(get(r, entryCol)) || 0
    const exitP  = parseFloat(get(r, exitCol))  || 0
    const qty    = parseFloat(get(r, qtyCol))   || 1
    let netPnl = rawPnl
    if (netPnl === 0 && entryP > 0 && exitP > 0) {
      const pts = direction === 'Long' ? exitP - entryP : entryP - exitP
      netPnl = parseFloat((pts * qty * 2 - comm).toFixed(2))
    }
    return {
      date:         parseAnyDate(get(r, dateCol)),
      symbol:       sym,
      direction,
      result:       netPnl > 0 ? 'Win' : netPnl < 0 ? 'Loss' : 'Breakeven',
      netPnl,
      grossPnl:     netPnl + comm,
      entryPrice:   get(r, entryCol),
      exitPrice:    get(r, exitCol),
      entryTime:    toTimeInput(get(r, entryTimeCol)),
      exitTime:     toTimeInput(get(r, exitTimeCol)),
      positionSize: String(qty),
      commission:   String(comm),
      tradeNotes:   [get(r, notesCol) || 'Imported from CSV', extraInfo(r)].filter(Boolean).join(' | '),
      timeframe: 'Day Trade', followedPlan: '', movedStop: '', overRisked: '',
      strategyName: '', source: 'csv',
    }
  }).filter(t => t.symbol && t.symbol !== 'UNK')

  if (!trades.length) {
    return { trades: [], error: `No valid trades found. Headers detected: ${rawHeaders.slice(0, 10).join(', ')}`, debug }
  }
  return { trades, error: null, debug }
}

/* ── Column-mapping helpers (Tradezella-style) ───────────────── */
export function extractCsvData(text) {
  const allLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (allLines.length < 2) return null
  const headerIdx = findHeaderRow(allLines)
  const rawHeaders = parseCsvLine(allLines[headerIdx])
  const normHeaders = rawHeaders.map(normKey)
  const rawRows = allLines.slice(headerIdx + 1).map(parseCsvLine).filter(r => r.some(c => c)).slice(0, 500)
  return { rawHeaders, normHeaders, rawRows }
}

export function buildAutoMapping(normHeaders) {
  const find = (...keys) => {
    for (const k of keys) {
      const n = normKey(k); const i = normHeaders.findIndex(h => h === n); if (i !== -1) return i
    }
    for (const k of keys) {
      const n = normKey(k); if (!n) continue; const i = normHeaders.findIndex(h => h.includes(n)); if (i !== -1) return i
    }
    return -1
  }
  return {
    dateIdx:   find('Date/Time','datetime','filltime','fill time','date','timestamp','time'),
    symIdx:    find('Contract','contract','symbol','instrument','ticker','market','product'),
    actionIdx: find('B/S','bs','buysell','buy/sell','action','side','direction','type'),
    qtyIdx:    find('Qty','qty','quantity','contracts','size','volume','lots'),
    priceIdx:  find('Fill Price','fillprice','fill price','price','avgprice','tradeprice'),
    pnlIdx:    find('Net P&L','net p&l','netpnl','netpl','Net P/L','Gross P&L','grosspnl','realized p&l','realizedpl','pnl','profit','pl','gain','realized'),
    commIdx:   find('Commission','commission','fees','fee','comm'),
  }
}

export function tradesFromMapping(rawRows, mapping) {
  const { dateIdx, symIdx, actionIdx, qtyIdx, priceIdx, pnlIdx, commIdx } = mapping
  const get = (r, idx) => (idx >= 0) ? String(r[idx] || '').replace(/[$,]/g, '').trim() : ''
  const parseMoney = v => {
    const s = String(v).replace(/[$,\s]/g, '').replace(/^\((.+)\)$/, '-$1')
    const n = parseFloat(s); return isFinite(n) ? n : null
  }

  // Strategy A: direct P&L per closing fill (non-zero rows)
  if (pnlIdx >= 0) {
    const closing = rawRows.filter(r => { const p = parseMoney(get(r, pnlIdx)); return p !== null && p !== 0 })
    if (closing.length > 0) {
      return {
        trades: closing.map(r => {
          const netPnl = parseMoney(get(r, pnlIdx)) || 0
          const rawA = get(r, actionIdx).toUpperCase()
          let direction
          if (rawA.includes('LONG')) direction = 'Long'
          else if (rawA.includes('SHORT')) direction = 'Short'
          else { const isSell = rawA === 'S' || rawA.startsWith('SE') || rawA === 'SELL'; direction = isSell ? 'Long' : 'Short' }
          const sym = cleanSymbol(get(r, symIdx))
          const comm = parseMoney(get(r, commIdx)) ?? 0
          return {
            date: parseAnyDate(get(r, dateIdx)), symbol: sym, direction,
            result: netPnl > 0 ? 'Win' : netPnl < 0 ? 'Loss' : 'Breakeven',
            netPnl, grossPnl: netPnl + comm,
            positionSize: get(r, qtyIdx) || '1', commission: String(comm),
            exitPrice: get(r, priceIdx), entryPrice: '',
            timeframe: 'Day Trade', tradeNotes: 'Imported from Tradovate',
            followedPlan: '', movedStop: '', overRisked: '', strategyName: '', source: 'tradovate-csv',
          }
        }), error: null,
      }
    }
  }

  // Strategy B: FIFO pairing when no P&L column or all-zero P&L
  if (actionIdx >= 0 && priceIdx >= 0) {
    const fills = rawRows.map((r, i) => {
      const rawA = get(r, actionIdx).toUpperCase()
      const price = parseMoney(get(r, priceIdx)) ?? 0
      const raw = get(r, dateIdx) || ''
      const tsStr = raw.replace(/(\d+\/\d+\/\d+)\s/, '$1T').replace(' AM', '').replace(' PM', '')
      let ts; try { ts = new Date(tsStr); if (isNaN(ts)) throw 0 } catch { ts = new Date() }
      return {
        id: i, contractTicker: get(r, symIdx),
        action: (rawA === 'B' || rawA === 'BUY' || rawA.startsWith('BU')) ? 'Buy' : 'Sell',
        qty: Math.abs(parseFloat(get(r, qtyIdx)) || 1), price, timestamp: ts.toISOString(),
      }
    }).filter(f => f.price > 0 && f.contractTicker)
    if (fills.length > 0) {
      const trades = mapFillsToTrades(fills)
      if (trades.length > 0) return { trades, error: null }
    }
    return { trades: [], error: 'Could not pair Buy+Sell fills. Make sure both opening and closing fills are in your CSV.' }
  }

  // Strategy C: trade per row
  const trades = rawRows.map(r => {
    const rawPnl = parseMoney(get(r, pnlIdx)) ?? 0
    const rawA = get(r, actionIdx).toUpperCase()
    const direction = (rawA === 'B' || rawA === 'BUY' || rawA.includes('LONG')) ? 'Long' : 'Short'
    const sym = cleanSymbol(get(r, symIdx))
    const comm = parseMoney(get(r, commIdx)) ?? 0
    return {
      date: parseAnyDate(get(r, dateIdx)), symbol: sym, direction,
      result: rawPnl > 0 ? 'Win' : rawPnl < 0 ? 'Loss' : 'Breakeven',
      netPnl: rawPnl, grossPnl: rawPnl + comm,
      positionSize: get(r, qtyIdx) || '1', commission: String(comm),
      exitPrice: '', entryPrice: '', timeframe: 'Day Trade', tradeNotes: 'Imported from CSV',
      followedPlan: '', movedStop: '', overRisked: '', strategyName: '', source: 'csv',
    }
  }).filter(t => t.symbol && t.symbol !== 'UNK')
  if (!trades.length) return { trades: [], error: 'No trades found. Try adjusting the column mapping.' }
  return { trades, error: null }
}

/* Merge rows that are really partial exits (scale-outs) of ONE position into a
   single combined trade. Groups by symbol + direction + day, then sums P&L /
   contracts, size-weights the entry & exit prices, keeps the earliest entry
   time and latest exit time (so time-in-trade spans the whole position), and
   re-derives Win/Loss from the combined P&L. Rows that stand alone are
   returned untouched. Used when the importer asks "separate trades or
   partials?" and the user picks partials. */
export function mergePartials(trades) {
  if (!Array.isArray(trades) || trades.length < 2) return trades || []
  const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n }
  const groups = new Map()
  const order = []
  for (const t of trades) {
    const key = `${String(t.symbol || '').toUpperCase()}|${t.direction || ''}|${String(t.date || '').slice(0, 10)}`
    if (!groups.has(key)) { groups.set(key, []); order.push(key) }
    groups.get(key).push(t)
  }
  const out = []
  for (const key of order) {
    const g = groups.get(key)
    if (g.length === 1) { out.push(g[0]); continue }

    const qty       = g.reduce((s, t) => s + num(t.positionSize), 0)
    const netPnl    = g.reduce((s, t) => s + num(t.netPnl), 0)
    const grossPnl  = g.reduce((s, t) => s + (t.grossPnl != null ? num(t.grossPnl) : num(t.netPnl)), 0)
    const commission = g.reduce((s, t) => s + num(t.commission), 0)

    // size-weighted average price across the partials
    const wavg = field => {
      let n = 0, d = 0
      for (const t of g) {
        const p = num(t[field]); const w = num(t.positionSize) || 1
        if (p) { n += p * w; d += w }
      }
      return d ? (n / d).toFixed(2) : ''
    }
    const entryTimes = g.map(t => t.entryTime).filter(Boolean).sort()
    const exitTimes  = g.map(t => t.exitTime).filter(Boolean).sort()
    const notes = g.map(t => t.tradeNotes).filter(Boolean)

    out.push({
      ...g[0],
      positionSize: String(qty || g.length),
      netPnl,
      grossPnl,
      commission: commission ? String(commission) : (g[0].commission || ''),
      entryPrice: wavg('entryPrice') || g[0].entryPrice || '',
      exitPrice:  wavg('exitPrice')  || g[g.length - 1].exitPrice || '',
      entryTime: entryTimes[0] || g[0].entryTime || '',
      exitTime:  exitTimes[exitTimes.length - 1] || g[g.length - 1].exitTime || '',
      result: netPnl > 0 ? 'Win' : netPnl < 0 ? 'Loss' : 'Breakeven',
      tradeNotes: [`Combined ${g.length} partial fills into one trade.`, ...notes].join(' | ').slice(0, 1800),
    })
  }
  return out
}
