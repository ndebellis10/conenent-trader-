/* The Covenant model as a single playbook strategy.

   Distilled from knowledge/ — the same source Alan is trained on — so the
   model's rules live where trades get logged. Seeded once per user; if it's
   deleted it stays deleted, with a banner offering to re-add it. */

export const COVENANT_SEED_FLAG = 'ct-playbook-seeded-v2'

/* Earlier builds seeded three separate cards; they get folded into the one. */
export const LEGACY_COVENANT_NAMES = [
  'pdi — pre-distribution inversion',
  'amd — accumulation, manipulation, distribution',
  'pre-market routine',
]

export const COVENANT_STRATEGY = {
  name: 'Covenant Model',
  description:
    'Price moves in three phases — accumulation builds liquidity, an aggressive manipulation leg raids it, then distribution is the real move. PDI (Pre-Distribution Inversion) gets you into that distribution before it happens: the manipulation leg leaves a fair value gap, and the inversion of that gap is the entry. Because entry lands near the bottom of the range, the risk-to-reward is strong by construction.',
  entryRules:
    'PRE-MARKET\n' +
    '1. Mark untested session levels (Asia/London highs and lows, PDH/PDL).\n' +
    '2. Mark PD arrays and higher-timeframe gaps.\n' +
    '3. Mark swing highs and lows.\n' +
    'Draw on 4H / 1H / 15m. Drop to 1m/2m/3m/30s only for the entry.\n' +
    '\n' +
    'THE ENTRY (PDI)\n' +
    '1. Identify the accumulation range — ideally equal highs AND equal lows.\n' +
    '2. Wait for the manipulation leg to sweep that liquidity. It should be aggressive.\n' +
    '3. Mark the fair value gap it leaves behind (2m/3m typical — higher timeframe is better).\n' +
    '4. Enter on the INVERSION of that gap — a candle body must close through it. A wick poking through is not an inversion.\n' +
    '5. No FVG left by the manipulation leg = no trade. Skip it.\n' +
    '\n' +
    'The first move off the NY open is manipulation roughly 8 times out of 10 — fade it, do not chase it. Never trade the accumulation chop.',
  exitRules:
    'Target internal liquidity — the internal highs (or lows) of the range.\n' +
    'First take-profit at the accumulation high/low.\n' +
    'Partial at 1:1 (mid-FVG) and at internal highs/lows, move to breakeven, let runners go.\n' +
    'When in doubt, take 1:1.',
  riskRules:
    'Stop goes at the swing low/high at the bottom peak of the manipulation move — not tighter.\n' +
    'Never take the trade for less than 1:1.\n' +
    'Scale size to prop-firm percentages; risk a fixed % per trade.\n' +
    'Think like a risk manager first and a trader second.',
}

export function hasCovenantStrategy(playbook = []) {
  return (playbook || []).some(
    p => String(p.name || '').toLowerCase() === COVENANT_STRATEGY.name.toLowerCase()
  )
}

/* Old three-card seeds, so they can be cleared out. */
export function legacyCovenantEntries(playbook = []) {
  return (playbook || []).filter(
    p => LEGACY_COVENANT_NAMES.includes(String(p.name || '').toLowerCase())
  )
}
