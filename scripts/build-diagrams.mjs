/**
 * Generates the Ask Alan concept diagrams into frontend/public/diagrams/.
 *
 * Hand-writing a dozen candle charts in raw SVG drifts — spacing, colours and
 * body widths stop matching between files. Generating them keeps one visual
 * language, so a trader who learns to read one diagram can read all of them.
 *
 * Every shape here is drawn from Alan's own definitions in knowledge/*.md.
 * The comment above each diagram quotes the line it came from.
 *
 * Run after editing:  npm run diagrams:build
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'public', 'diagrams')
mkdirSync(OUT, { recursive: true })

const UP = '#22C55E', DOWN = '#EF4444', WICK = '#9AA0A6'
const BLUE = '#3B82F6', PURPLE = '#A78BFA', TEXT = '#E8EAED', MUTED = '#9AA0A6'
const BW = 21 // body width

const CSS = `
  .t{font:700 15px system-ui,-apple-system,sans-serif;fill:${TEXT}}
  .s{font:500 12px system-ui,-apple-system,sans-serif;fill:${MUTED}}
  .c{font:700 10.5px system-ui,-apple-system,sans-serif;fill:${MUTED};letter-spacing:.07em}
  .b{font:700 11px system-ui,-apple-system,sans-serif;fill:${BLUE};letter-spacing:.06em}
  .p{font:700 11px system-ui,-apple-system,sans-serif;fill:${PURPLE};letter-spacing:.06em}
  .g{font:700 11px system-ui,-apple-system,sans-serif;fill:${UP};letter-spacing:.06em}
  .r{font:700 11px system-ui,-apple-system,sans-serif;fill:${DOWN};letter-spacing:.06em}
  .w{stroke:${WICK};stroke-width:2.2}
  .lv{stroke:#6B7280;stroke-width:1.4;stroke-dasharray:6 5}
`

/** One candle. y values are screen coords, so smaller y = higher price. */
function candle(x, wickTop, wickBot, bodyTop, bodyBot, up = true) {
  return `<line class="w" x1="${x}" y1="${wickTop}" x2="${x}" y2="${wickBot}"/>`
    + `<rect x="${x - BW / 2}" y="${bodyTop}" width="${BW}" height="${bodyBot - bodyTop}" rx="1.5" fill="${up ? UP : DOWN}"/>`
}

/** A shaded zone with a dashed border. */
function zone(x, y, w, h, colour, opacity = '.14') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${colour}" fill-opacity="${opacity}" stroke="${colour}" stroke-width="1.4" stroke-dasharray="5 4" rx="2"/>`
}

function hline(x1, x2, y, colour = MUTED, dash = true) {
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${colour}" stroke-width="1.5"${dash ? ' stroke-dasharray="6 5"' : ''}/>`
}

function svg(name, title, subtitle, body, h = 400, desc = '') {
  const out = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 ${h}" width="720" height="${h}" role="img">
  <title>${title}</title>
  <desc>${desc || subtitle}</desc>
  <style>${CSS}</style>
  <rect x="0" y="0" width="720" height="${h}" rx="12" fill="#0E1420"/>
  <text class="t" x="40" y="30">${title}</text>
  <text class="s" x="40" y="50">${subtitle}</text>
${body}
</svg>
`
  writeFileSync(join(OUT, `${name}.svg`), out)
  return name
}

const made = []

/* ── Market structure ───────────────────────────────────────────────────────
   "A market is bullish when price is making higher highs and higher lows...
    A bearish downtrend is created by lower highs and lower lows... Consolidation:
    price moves sideways between support and resistance." (knowledge/50) */
{
  const panel = (ox, pts, labels, colour) => {
    let s = `<polyline points="${pts.map(([x, y]) => `${ox + x},${y}`).join(' ')}" fill="none" stroke="${colour}" stroke-width="2.6" stroke-linejoin="round"/>`
    for (const [x, y, txt, cls] of labels) s += `<text class="${cls}" x="${ox + x}" y="${y}" text-anchor="middle">${txt}</text>`
    return s
  }
  const up = [[0, 300], [30, 210], [55, 250], [90, 150], [115, 195], [150, 100], [180, 130]]
  const dn = [[0, 110], [30, 200], [55, 160], [90, 260], [115, 220], [150, 310], [180, 280]]
  const rg = [[0, 250], [30, 160], [60, 250], [90, 160], [120, 250], [150, 160], [180, 250]]
  svg('market-structure', 'Market Structure', 'Three ways price moves. We trade the first two.',
    panel(60, up, [[30, 200, 'HH', 'g'], [90, 140, 'HH', 'g'], [150, 90, 'HH', 'g'], [55, 272, 'HL', 'g'], [115, 217, 'HL', 'g']], UP)
    + panel(275, dn, [[30, 222, 'LH', 'r'], [90, 282, 'LH', 'r'], [55, 150, 'LL', 'r'], [115, 210, 'LL', 'r'], [150, 332, 'LL', 'r']], DOWN)
    + panel(490, rg, [], MUTED)
    + hline(490, 680, 160) + hline(490, 680, 250)
    // Short enough to fit the 215px panel pitch — the long versions ran into
    // each other.
    + `<text class="c" x="60"  y="355">UPTREND — HH + HL</text>`
    + `<text class="c" x="275" y="355">DOWNTREND — LH + LL</text>`
    + `<text class="c" x="490" y="355">RANGE — WE STAY AWAY</text>`,
    380)
  made.push('market-structure')
}

/* ── Break of structure ─────────────────────────────────────────────────────
   An uptrend of higher highs and higher lows ends when price closes back
   through the last higher low. (knowledge/60) */
{
  let b = ''
  const highs = [[110, 230], [210, 165], [310, 110]]
  const lows = [[160, 285], [260, 220]]
  b += `<polyline points="70,330 110,230 160,285 210,165 260,220 310,110 360,175 410,240 460,255 510,300 560,275 610,330" fill="none" stroke="${UP}" stroke-width="2.6" stroke-linejoin="round"/>`
  b += hline(70, 660, 220, BLUE)
  // Sits right of the HH/HL run — at x=70 it collided with the first HH label.
  b += `<text class="b" x="540" y="212">LAST HIGHER LOW</text>`
  for (const [x, y] of highs) b += `<text class="g" x="${x}" y="${y - 10}" text-anchor="middle">HH</text>`
  for (const [x, y] of lows) b += `<text class="g" x="${x}" y="${y + 20}" text-anchor="middle">HL</text>`
  b += zone(455, 220, 205, 115, DOWN, '.10')
  b += `<text class="r" x="470" y="258">BREAK OF STRUCTURE</text>`
  b += `<text class="s" x="470" y="278">price closes below the last HL —</text>`
  b += `<text class="s" x="470" y="295">the uptrend is over</text>`
  svg('bos', 'Break of Structure', 'The trend holds until price closes back through the last higher low.', b, 380)
  made.push('bos')
}

/* ── AMD ────────────────────────────────────────────────────────────────────
   "Accumulation... price is just bouncing in a range... creating equal highs
    and equal lows... it builds up liquidity for a move to happen." (knowledge/19) */
{
  let b = ''
  b += zone(60, 150, 210, 130, MUTED, '.10')
  b += hline(60, 270, 150) + hline(60, 270, 280)
  b += `<polyline points="70,270 100,160 130,272 160,158 190,270 220,160 250,268" fill="none" stroke="${MUTED}" stroke-width="2.4" stroke-linejoin="round"/>`
  b += `<text class="c" x="66" y="142">EQUAL HIGHS</text>`
  b += `<text class="c" x="66" y="298">EQUAL LOWS</text>`
  b += `<text class="c" x="66" y="362">1 — ACCUMULATION</text>`
  b += `<text class="s" x="66" y="380">liquidity builds</text>`

  b += `<polyline points="250,268 285,330 320,300" fill="none" stroke="${DOWN}" stroke-width="2.8" stroke-linejoin="round"/>`
  b += zone(268, 280, 62, 62, DOWN, '.13')
  b += `<text class="c" x="278" y="362">2 — MANIPULATION</text>`
  b += `<text class="s" x="278" y="380">the low gets swept</text>`

  b += `<polyline points="320,300 380,220 420,250 480,140 520,175 580,90 620,110" fill="none" stroke="${UP}" stroke-width="2.8" stroke-linejoin="round"/>`
  b += `<text class="c" x="420" y="362">3 — DISTRIBUTION</text>`
  b += `<text class="s" x="420" y="380">the real move</text>`
  // 410 tall: the stage captions sit clear of the manipulation zone, which
  // reaches y=342 and was previously running through them.
  svg('amd', 'AMD', 'Accumulation → Manipulation → Distribution. The trap comes before the move.', b, 410)
  made.push('amd')
}

/* ── Liquidity ──────────────────────────────────────────────────────────────
   "Buy-side liquidity is above the highs... Sell-side liquidity is the same but
    at the lows." Equal highs/lows are where stops cluster. (knowledge/54) */
{
  let b = ''
  b += zone(60, 96, 600, 34, BLUE, '.13')
  b += `<text class="b" x="70" y="118">BUY-SIDE LIQUIDITY — STOPS ABOVE THE HIGHS</text>`
  b += zone(60, 288, 600, 34, DOWN, '.13')
  b += `<text class="r" x="70" y="310">SELL-SIDE LIQUIDITY — STOPS BELOW THE LOWS</text>`
  b += hline(60, 660, 130) + hline(60, 660, 288)
  b += candle(110, 130, 250, 160, 235, true)
  b += candle(165, 148, 288, 175, 268, false)
  b += candle(220, 132, 262, 158, 244, true)
  b += candle(275, 155, 290, 182, 272, false)
  b += candle(330, 131, 244, 152, 228, true)
  b += candle(385, 160, 289, 190, 270, false)
  b += candle(440, 134, 238, 160, 220, true)
  b += candle(495, 150, 287, 178, 266, false)
  b += `<text class="c" x="70" y="352">PRICE RANGES BETWEEN THEM — BOTH POOLS ARE A TARGET</text>`
  svg('liquidity', 'Liquidity', 'Resting stop-losses. Price reaches for them.', b, 380)
  made.push('liquidity')
}

/* ── Liquidity sweep ────────────────────────────────────────────────────────
   "Wick out the liquidity — a long wick clears the level but the candle does
    NOT close beyond it, then reverses." (knowledge/54) */
{
  let b = ''
  b += hline(60, 660, 290, TEXT, false)
  // Kept short so it ends left of the sweep candle's wick at x=275.
  b += `<text class="c" x="60" y="312">EQUAL LOWS — STOPS SIT HERE</text>`
  b += candle(110, 130, 200, 145, 190, false)
  b += candle(165, 165, 250, 178, 240, false)
  b += candle(220, 205, 286, 220, 278, false)
  b += candle(275, 250, 345, 262, 288, false)   // wick pierces, body closes back above
  b += `<text class="p" x="292" y="336">the wick takes them out —</text>`
  b += `<text class="p" x="292" y="352">the candle closes back above</text>`
  b += candle(330, 200, 285, 215, 268, true)
  b += candle(385, 150, 240, 165, 222, true)
  b += candle(440, 110, 195, 125, 180, true)
  b += candle(495, 82, 158, 95, 140, true)
  svg('liquidity-sweep', 'Liquidity Sweep', 'The level breaks, then it does not. That is the tell.', b, 380)
  made.push('liquidity-sweep')
}

/* ── Displacement ───────────────────────────────────────────────────────────
   "A candle with really really strong displacement... simply a candle with
    huge movement to either side." (knowledge/61) */
{
  let b = ''
  b += candle(110, 190, 250, 205, 240, true)
  b += candle(160, 200, 262, 212, 250, false)
  b += candle(210, 195, 255, 208, 244, true)
  b += candle(260, 202, 258, 214, 248, false)
  b += zone(292, 90, 56, 190, BLUE, '.12')
  b += candle(320, 100, 275, 118, 262, true)   // the displacement candle
  b += candle(380, 95, 165, 108, 150, true)
  b += candle(430, 88, 155, 100, 142, true)
  b += candle(480, 100, 168, 112, 158, false)
  // Below the candles, not beside them — at y=150 this text ran straight
  // through the three candles that follow the displacement.
  b += `<text class="b" x="300" y="312">STRONG DISPLACEMENT</text>`
  b += `<text class="s" x="300" y="332">huge body, little wick — this is</text>`
  b += `<text class="s" x="300" y="349">the move we build the trade on</text>`
  svg('displacement', 'Displacement', 'One candle doing what the last ten could not.', b, 380)
  made.push('displacement')
}

/* ── Rejection wick ─────────────────────────────────────────────────────────
   "A candle with a decent size body or even a small body and a huge wick...
    we tried to close way low and price absolutely rejected off that and went
    higher." (knowledge/62) */
{
  let b = ''
  b += zone(60, 268, 600, 44, BLUE, '.12')
  b += `<text class="b" x="70" y="294">4H FAIR VALUE GAP</text>`
  b += candle(150, 140, 205, 152, 196, false)
  b += candle(205, 175, 245, 186, 238, false)
  b += candle(260, 210, 312, 222, 262, false)
  b += candle(320, 236, 330, 248, 268, true)   // small body, huge lower wick
  b += `<text class="p" x="348" y="300">huge wick, small body</text>`
  b += `<text class="s" x="348" y="320">price tried to close down here</text>`
  b += `<text class="s" x="348" y="337">and got rejected hard</text>`
  b += candle(375, 175, 265, 190, 250, true)
  b += candle(430, 130, 215, 142, 200, true)
  b += candle(485, 100, 178, 112, 165, true)
  svg('rejection-wick', 'Rejection Wick', 'A long wick is information. Something refused to let price stay there.', b, 380)
  made.push('rejection-wick')
}

/* ── PDI ────────────────────────────────────────────────────────────────────
   "PDI means pre-distribution inversion... we can catch this entire
    distribution before it actually happens... in a manipulation leg this move
    is going to be pretty aggressive... it's going to create a fair value gap."
    (knowledge/20) */
{
  let b = ''
  b += candle(90, 100, 165, 112, 155, true)
  b += candle(140, 108, 180, 120, 170, false)
  b += candle(190, 130, 300, 145, 292, false)   // aggressive leg down
  b += candle(240, 250, 340, 262, 330, false)
  b += zone(215, 180, 420, 52, DOWN, '.13')
  // Short: the full sentence ran into the candles that cross the zone at x=340+.
  b += `<text class="r" x="215" y="172">MANIPULATION FVG</text>`
  b += candle(290, 232, 320, 244, 300, true)
  b += candle(340, 175, 288, 190, 232, true)    // trades back up into the gap
  b += candle(390, 150, 235, 162, 186, true)    // closes through — inversed
  b += `<text class="b" x="415" y="205">INVERSION</text>`
  b += candle(440, 118, 195, 130, 172, true)
  b += candle(490, 95, 168, 106, 148, true)
  b += candle(540, 80, 148, 92, 128, true)
  b += hline(60, 660, 80, PURPLE)
  // Right-aligned so it clears the subtitle, which runs along the same band.
  b += `<text class="p" x="660" y="72" text-anchor="end">DISTRIBUTION — CAUGHT BEFORE IT HAPPENS</text>`
  svg('pdi', 'PDI — Pre-Distribution Inversion', 'The manipulation leg leaves a gap. Inverse it and you are in early.', b, 380)
  made.push('pdi')
}

console.log(`Wrote ${made.length} diagrams -> ${OUT}`)
for (const m of made) console.log(`  ${m}.svg`)
