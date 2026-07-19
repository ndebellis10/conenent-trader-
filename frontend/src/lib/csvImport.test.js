import { describe, it, expect } from 'vitest'
import { parseCsvLine, normKey, findHeaderRow, toTimeInput, parseAnyDate, cleanSymbol } from './csvImport'

/* Broker exports are messy — quoted fields with commas inside, preamble rows
   before the real header, and three different date conventions. */

describe('parseCsvLine', () => {
  it('splits a plain row', () => {
    expect(parseCsvLine('NQ,Buy,2,100.50')).toEqual(['NQ', 'Buy', '2', '100.50'])
  })

  it('keeps commas that live inside quotes', () => {
    expect(parseCsvLine('NQ,"1,250.00",Win')).toEqual(['NQ', '1,250.00', 'Win'])
  })

  it('trims surrounding whitespace', () => {
    expect(parseCsvLine(' NQ , Buy ')).toEqual(['NQ', 'Buy'])
  })

  it('preserves empty cells so column positions stay aligned', () => {
    expect(parseCsvLine('NQ,,Win')).toEqual(['NQ', '', 'Win'])
    expect(parseCsvLine(',,')).toEqual(['', '', ''])
  })

  it('handles a single column', () => {
    expect(parseCsvLine('NQ')).toEqual(['NQ'])
  })
})

describe('normKey', () => {
  it('reduces a header to comparable letters and digits', () => {
    expect(normKey('Net P&L')).toBe('netpl')
    expect(normKey('Buy/Sell')).toBe('buysell')
    expect(normKey('  Fill Price  ')).toBe('fillprice')
  })

  it('does not throw on non-strings', () => {
    expect(normKey(null)).toBe('null')
    expect(normKey(42)).toBe('42')
  })
})

describe('findHeaderRow', () => {
  it('finds the header on the first line when there is no preamble', () => {
    const lines = ['Date,Symbol,Qty,Price', '07/18/2026,NQ,2,100']
    expect(findHeaderRow(lines)).toBe(0)
  })

  it('skips broker preamble rows above the header', () => {
    const lines = [
      'Account Statement',
      'Generated 07/18/2026',
      '',
      'Date,Contract,B/S,Qty,Price',
      '07/18/2026,NQZ5,Buy,2,100',
    ]
    expect(findHeaderRow(lines)).toBe(3)
  })

  it('needs two header-ish words, so a one-word title row is not mistaken for it', () => {
    const lines = ['Date', 'Date,Symbol,Qty', 'x,y,z']
    expect(findHeaderRow(lines)).toBe(1)
  })

  it('falls back to row 0 when nothing looks like a header', () => {
    expect(findHeaderRow(['aaa,bbb', 'ccc,ddd'])).toBe(0)
  })
})

describe('parseAnyDate', () => {
  it('reads ISO dates', () => {
    expect(parseAnyDate('2026-07-18')).toBe('2026-07-18')
  })

  it('reads US MM/DD/YYYY', () => {
    expect(parseAnyDate('07/18/2026')).toBe('2026-07-18')
  })

  it('pads single-digit months and days', () => {
    expect(parseAnyDate('7/8/2026')).toBe('2026-07-08')
    expect(parseAnyDate('2026-7-8')).toBe('2026-07-08')
  })

  it('ignores a trailing time', () => {
    expect(parseAnyDate('07/18/2026 09:30:00')).toBe('2026-07-18')
    expect(parseAnyDate('2026-07-18T09:30:00')).toBe('2026-07-18')
  })

  it('falls back to today when there is no date at all', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(parseAnyDate('')).toBe(today)
    expect(parseAnyDate(null)).toBe(today)
  })
})

describe('toTimeInput', () => {
  it('passes through HH:MM', () => {
    expect(toTimeInput('09:30')).toBe('09:30')
  })

  it('pads a single-digit hour', () => {
    expect(toTimeInput('9:30')).toBe('09:30')
  })

  it('reduces an ISO timestamp to HH:MM', () => {
    expect(toTimeInput('2026-07-18T09:30:00')).toBe('09:30')
  })

  it('returns empty for missing or unparseable values', () => {
    expect(toTimeInput('')).toBe('')
    expect(toTimeInput(null)).toBe('')
    expect(toTimeInput('lunchtime')).toBe('')
  })
})

describe('cleanSymbol', () => {
  it('strips a futures expiry code', () => {
    expect(cleanSymbol('NQZ5')).toBe('NQ')
    expect(cleanSymbol('ESH24')).toBe('ES')
  })

  it('uppercases and trims', () => {
    expect(cleanSymbol('  nqz5 ')).toBe('NQ')
  })

  it('leaves a plain ticker alone', () => {
    expect(cleanSymbol('AAPL')).toBe('AAPL')
  })

  it('returns a placeholder for nothing', () => {
    expect(cleanSymbol('')).toBe('UNK')
    expect(cleanSymbol(null)).toBe('UNK')
  })
})
