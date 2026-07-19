import { describe, it, expect } from 'vitest'
import { tradeDurationMs, formatDuration, avgTradeDuration } from './tradeTime'

/* Times arrive in two shapes: "HH:MM" from the manual log form (needing the
   trade's date for context) and full ISO stamps from a Tradovate import. */

const MIN = 60000
const HOUR = 3600000

describe('tradeDurationMs', () => {
  it('measures an HH:MM pair against the trade date', () => {
    expect(tradeDurationMs({ date: '2026-07-18', entryTime: '09:30', exitTime: '10:15' }))
      .toBe(45 * MIN)
  })

  it('measures ISO timestamps without needing the date', () => {
    expect(tradeDurationMs({
      entryTime: '2026-07-18T09:30:00',
      exitTime: '2026-07-18T11:00:00',
    })).toBe(90 * MIN)
  })

  it('accepts a single-digit hour', () => {
    expect(tradeDurationMs({ date: '2026-07-18', entryTime: '9:30', exitTime: '9:45' }))
      .toBe(15 * MIN)
  })

  it('rolls a session past midnight forward a day', () => {
    // Exited at 00:30 after entering at 23:45 — 45 minutes, not negative
    expect(tradeDurationMs({ date: '2026-07-18', entryTime: '23:45', exitTime: '00:30' }))
      .toBe(45 * MIN)
  })

  it('returns null when either end is missing', () => {
    expect(tradeDurationMs({ date: '2026-07-18', entryTime: '09:30' })).toBeNull()
    expect(tradeDurationMs({ date: '2026-07-18', exitTime: '09:30' })).toBeNull()
    expect(tradeDurationMs({ date: '2026-07-18' })).toBeNull()
  })

  it('returns null for HH:MM without a usable date', () => {
    expect(tradeDurationMs({ entryTime: '09:30', exitTime: '10:00' })).toBeNull()
    expect(tradeDurationMs({ date: 'not-a-date', entryTime: '09:30', exitTime: '10:00' })).toBeNull()
  })

  it('returns null rather than throwing on junk', () => {
    expect(tradeDurationMs(null)).toBeNull()
    expect(tradeDurationMs({})).toBeNull()
    expect(tradeDurationMs({ date: '2026-07-18', entryTime: 'lunchtime', exitTime: '10:00' }))
      .toBeNull()
  })

  it('rejects an implausibly long span as unknown', () => {
    expect(tradeDurationMs({
      entryTime: '2026-01-01T09:30:00',
      exitTime: '2026-06-01T09:30:00',
    })).toBeNull()
  })

  it('counts a zero-length trade as zero, not unknown', () => {
    expect(tradeDurationMs({ date: '2026-07-18', entryTime: '09:30', exitTime: '09:30' })).toBe(0)
  })
})

describe('formatDuration', () => {
  it('renders minutes under an hour', () => {
    expect(formatDuration(38 * MIN)).toBe('38m')
  })

  it('renders hours and minutes', () => {
    expect(formatDuration(4 * HOUR + 12 * MIN)).toBe('4h 12m')
  })

  it('drops the minutes on a whole hour', () => {
    expect(formatDuration(2 * HOUR)).toBe('2h')
  })

  it('falls back to seconds for a scalp under half a minute', () => {
    // Rounds to the nearest minute first, so the seconds branch is for <30s
    expect(formatDuration(20000)).toBe('20s')
    expect(formatDuration(0)).toBe('0s')
  })

  it('rounds a 45-second trade up to a minute', () => {
    expect(formatDuration(45000)).toBe('1m')
  })

  it('shows a dash when the duration is unknown', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(undefined)).toBe('—')
    expect(formatDuration(NaN)).toBe('—')
  })
})

describe('avgTradeDuration', () => {
  it('averages only the trades that have both ends', () => {
    const result = avgTradeDuration([
      { date: '2026-07-18', entryTime: '09:00', exitTime: '10:00' }, // 60m
      { date: '2026-07-18', entryTime: '09:00', exitTime: '09:30' }, // 30m
      { date: '2026-07-18', entryTime: '09:00' },                    // skipped
    ])
    expect(result.counted).toBe(2)
    expect(result.ms).toBe(45 * MIN)
  })

  it('reports nothing to average rather than NaN', () => {
    expect(avgTradeDuration([])).toEqual({ ms: null, counted: 0 })
    expect(avgTradeDuration()).toEqual({ ms: null, counted: 0 })
    expect(avgTradeDuration([{ date: '2026-07-18' }])).toEqual({ ms: null, counted: 0 })
  })
})
