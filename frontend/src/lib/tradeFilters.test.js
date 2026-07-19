import { describe, it, expect } from 'vitest'
import { isBacktestTrade, liveTrades, backtestTrades, summarize } from './tradeFilters'

/* The live/backtest split guards every number a trader makes decisions on.
   When this broke, paper trades silently inflated real P&L on the dashboard. */

const live = (over = {}) => ({ result: 'Win', netPnl: '100', tags: ['Breakout'], ...over })
const paper = (over = {}) => ({ result: 'Win', netPnl: '100', tags: ['Backtest'], ...over })

describe('isBacktestTrade', () => {
  it('flags a trade tagged Backtest', () => {
    expect(isBacktestTrade(paper())).toBe(true)
  })

  it('ignores case, since tags are user-entered', () => {
    expect(isBacktestTrade({ tags: ['backtest'] })).toBe(true)
    expect(isBacktestTrade({ tags: ['BACKTEST'] })).toBe(true)
  })

  it('finds the tag alongside others', () => {
    expect(isBacktestTrade({ tags: ['Breakout', 'Backtest', 'NQ'] })).toBe(true)
  })

  it('treats an untagged trade as live', () => {
    expect(isBacktestTrade(live())).toBe(false)
    expect(isBacktestTrade({})).toBe(false)
    expect(isBacktestTrade({ tags: [] })).toBe(false)
  })

  it('does not match a tag that merely contains the word', () => {
    expect(isBacktestTrade({ tags: ['Backtesting notes'] })).toBe(false)
  })

  it('survives malformed input instead of throwing', () => {
    expect(isBacktestTrade(null)).toBe(false)
    expect(isBacktestTrade(undefined)).toBe(false)
    expect(isBacktestTrade({ tags: 'Backtest' })).toBe(false) // string, not array
    expect(isBacktestTrade({ tags: [null, 'Backtest'] })).toBe(true)
  })
})

describe('liveTrades / backtestTrades', () => {
  const mixed = [live({ netPnl: '10' }), paper({ netPnl: '999' }), live({ netPnl: '20' })]

  it('keeps paper trades out of the live set', () => {
    expect(liveTrades(mixed)).toHaveLength(2)
    expect(liveTrades(mixed).every(t => !isBacktestTrade(t))).toBe(true)
  })

  it('returns only paper trades for the backtest set', () => {
    expect(backtestTrades(mixed)).toHaveLength(1)
    expect(backtestTrades(mixed)[0].netPnl).toBe('999')
  })

  it('splits every trade into exactly one side', () => {
    expect(liveTrades(mixed).length + backtestTrades(mixed).length).toBe(mixed.length)
  })

  it('handles no trades at all', () => {
    expect(liveTrades([])).toEqual([])
    expect(liveTrades(null)).toEqual([])
    expect(liveTrades(undefined)).toEqual([])
    expect(backtestTrades(null)).toEqual([])
  })
})

describe('summarize', () => {
  it('counts wins and totals P&L', () => {
    const s = summarize([
      { result: 'Win', netPnl: '100' },
      { result: 'Loss', netPnl: '-40' },
      { result: 'Win', netPnl: '60' },
    ])
    expect(s.count).toBe(3)
    expect(s.wins).toBe(2)
    expect(s.pnl).toBe(120)
  })

  it('reports win rate to one decimal place', () => {
    const s = summarize([
      { result: 'Win', netPnl: '1' },
      { result: 'Loss', netPnl: '1' },
      { result: 'Loss', netPnl: '1' },
    ])
    expect(s.winRate).toBe(33.3)
  })

  it('does not count breakevens as wins', () => {
    const s = summarize([
      { result: 'Win', netPnl: '50' },
      { result: 'Breakeven', netPnl: '0' },
    ])
    expect(s.wins).toBe(1)
    expect(s.winRate).toBe(50)
  })

  it('returns zeroes for an empty set rather than dividing by zero', () => {
    expect(summarize([])).toEqual({ count: 0, wins: 0, winRate: 0, pnl: 0 })
    expect(summarize(null).winRate).toBe(0)
  })

  it('rounds money to cents', () => {
    expect(summarize([{ result: 'Win', netPnl: '10.005' }, { result: 'Win', netPnl: '0.001' }]).pnl)
      .toBe(10.01)
  })

  it('treats unparseable P&L as zero instead of NaN', () => {
    const s = summarize([{ result: 'Win', netPnl: 'n/a' }, { result: 'Win', netPnl: '25' }])
    expect(s.pnl).toBe(25)
    expect(Number.isNaN(s.pnl)).toBe(false)
  })

  it('accepts numbers as well as strings', () => {
    expect(summarize([{ result: 'Win', netPnl: 100 }, { result: 'Loss', netPnl: -25.5 }]).pnl)
      .toBe(74.5)
  })
})
