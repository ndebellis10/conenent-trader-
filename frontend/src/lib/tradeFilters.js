/* Live vs backtest trade split.

   Trades imported through the Backtest page carry a 'Backtest' tag (see
   LogTrade.jsx). Those are paper results — they must never count toward live
   P&L, the Covenant Score, or live leaderboard rank. Use these helpers at any
   call site that reports real performance. */

export const BACKTEST_TAG = 'Backtest'

export function isBacktestTrade(t) {
  const tags = t?.tags
  if (!Array.isArray(tags)) return false
  return tags.some(tag => String(tag).toLowerCase() === BACKTEST_TAG.toLowerCase())
}

/* Real, live-money trades — the default for anything performance-related. */
export function liveTrades(trades) {
  return (trades || []).filter(t => !isBacktestTrade(t))
}

/* Paper/backtest trades only. */
export function backtestTrades(trades) {
  return (trades || []).filter(isBacktestTrade)
}

/* Win rate / P&L / count for a set of trades — shared by the leaderboard. */
export function summarize(trades) {
  const list = trades || []
  const wins = list.filter(t => t.result === 'Win').length
  const pnl  = list.reduce((s, t) => s + (parseFloat(t.netPnl) || 0), 0)
  return {
    count:   list.length,
    wins,
    winRate: list.length ? Math.round((wins / list.length) * 1000) / 10 : 0,
    pnl:     Math.round(pnl * 100) / 100,
  }
}
