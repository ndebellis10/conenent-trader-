/* The Covenant model as playbook strategies.

   Distilled from knowledge/ (the same source Alan is trained on) so a new
   trader's playbook isn't empty and the model's rules are written down where
   they log trades. Seeded once per user; deleting a strategy is respected and
   it won't reappear. */

export const COVENANT_SEED_FLAG = 'ct-playbook-seeded'

export const COVENANT_STRATEGIES = [
  {
    name: 'PDI — Pre-Distribution Inversion',
    description:
      'The core Covenant setup. Price accumulates and builds liquidity, an aggressive manipulation leg raids it and leaves a fair value gap behind, and the inversion of that gap gets you into the distribution before it happens. Entry lands near the bottom of the range, so the risk-to-reward is strong by construction.',
    entryRules:
      '1. Identify the accumulation range — ideally equal highs AND equal lows.\n' +
      '2. Wait for the manipulation leg to sweep that liquidity. It should be aggressive.\n' +
      '3. Mark the fair value gap the manipulation leg leaves behind (2m/3m typical — higher timeframe is better).\n' +
      '4. Enter when that gap is INVERSED — a candle body must close through it. A wick poking through is not an inversion.\n' +
      '5. No FVG left by the manipulation leg = no trade. Skip it.',
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
  },
  {
    name: 'AMD — Accumulation, Manipulation, Distribution',
    description:
      'The market-structure frame the whole model sits on. Price moves in three phases, and knowing which one you are in tells you whether to wait, fade, or ride.',
    entryRules:
      'Accumulation: price ranges and builds liquidity (equal highs/lows). Do not trade the chop.\n' +
      'Manipulation: an aggressive leg raids that liquidity. The first move off the NY open is manipulation roughly 8 times out of 10 — fade it, do not chase it.\n' +
      'Distribution: the real move. This is what PDI gets you into early.',
    exitRules:
      'Ride distribution toward the opposing liquidity pool. Take partials into internal highs/lows rather than holding for a perfect top.',
    riskRules:
      'Do not trade during accumulation — that is where accounts bleed.\n' +
      'If you cannot identify which phase you are in, you do not have a trade.',
  },
  {
    name: 'Pre-Market Routine',
    description:
      'The three-step mark-up done before the session so the plan is set before price moves.',
    entryRules:
      '1. Mark untested session levels (Asia/London highs and lows, PDH/PDL).\n' +
      '2. Mark PD arrays and higher-timeframe gaps.\n' +
      '3. Mark swing highs and lows.\n' +
      'Draw on 4H / 1H / 15m. Drop to 1m/2m/3m/30s only for the inversion entry.',
    exitRules:
      'Pre-plan where liquidity sits — those levels are the targets you will be taking partials into.',
    riskRules:
      'No marked levels means no plan, and no plan means no trade.',
  },
]

/* Strategies the user has not already got (matched on name). */
export function missingCovenantStrategies(playbook = []) {
  const have = new Set((playbook || []).map(p => String(p.name || '').toLowerCase()))
  return COVENANT_STRATEGIES.filter(s => !have.has(s.name.toLowerCase()))
}
