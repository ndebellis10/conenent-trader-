/**
 * chartDetect.js  —  Color-agnostic TradingView projection tool detector v5
 * ─────────────────────────────────────────────────────────────────────────
 * Works with ANY color scheme.
 *
 * TP fix: after finding the zone, scan upward with a very low threshold
 * (1.2%) to extend past the faded top edge of the profit zone — the TP
 * line is always right at the outer boundary, which can be very faint.
 */

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h * 360, s * 100, l * 100]
}

function colorBucket(r, g, b, a) {
  if (a < 20) return -1
  const [h, s, l] = rgbToHsl(r, g, b)
  if (l < 10) return -1
  if (l < 28 && s < 12) return -1
  if (l > 70 && s < 38) return 12   // white / near-white
  if (s < 8) return -1
  return Math.floor(h / 30) % 12
}

export async function detectProjectionTool(base64Image, cal) {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      try {
        const W = img.naturalWidth
        const H = img.naturalHeight
        if (!W || !H) { reject(new Error('Invalid image')); return }

        const canvas = document.createElement('canvas')
        canvas.width = W; canvas.height = H
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, W, H).data

        const xStart = Math.floor(W * 0.04)
        const xEnd   = Math.floor(W * 0.86)
        const xSpan  = xEnd - xStart

        const NUM_BUCKETS = 13
        const THRESHOLD   = 0.04   // main detection threshold
        const GAP_TOL     = 4      // gap tolerance rows
        const MIN_HEIGHT  = 18     // minimum zone height (filters thin lines)

        const rowDom  = new Int16Array(H).fill(-1)
        const rowFrac = new Float32Array(H)

        for (let y = 0; y < H; y++) {
          const counts = new Float32Array(NUM_BUCKETS)
          for (let x = xStart; x < xEnd; x++) {
            const i = (y * W + x) * 4
            const b = colorBucket(data[i], data[i+1], data[i+2], data[i+3])
            if (b >= 0) counts[b]++
          }
          let maxC = 0, maxB = -1
          for (let b = 0; b < NUM_BUCKETS; b++) {
            if (counts[b] > maxC) { maxC = counts[b]; maxB = b }
          }
          const frac = maxC / xSpan
          if (frac >= THRESHOLD && maxB >= 0) {
            rowDom[y]  = maxB
            rowFrac[y] = frac
          }
        }

        // Cluster with gap tolerance
        const zones = []
        let i = 0
        while (i < H) {
          if (rowDom[i] < 0) { i++; continue }
          const bucket = rowDom[i]
          let j = i, gap = 0, strength = 0
          while (j < H) {
            if (rowDom[j] === bucket) {
              strength += rowFrac[j]; gap = 0; j++
            } else if (rowDom[j] < 0 && gap < GAP_TOL) {
              gap++; j++
            } else break
          }
          let endY = j - 1
          while (endY > i && rowDom[endY] !== bucket) endY--
          const height = endY - i + 1
          if (height >= MIN_HEIGHT) {
            zones.push({ bucket, startY: i, endY, height, strength })
          }
          i = j
        }

        if (zones.length < 2) {
          reject(new Error('Could not detect two projection tool zones.'))
          return
        }

        const [z1, z2] = [...zones]
          .sort((a, b) => b.strength - a.strength)
          .slice(0, 2)
          .sort((a, b) => a.startY - b.startY)

        const pct = v => Math.round((v / H) * 10000) / 100

        // ── TP: scan upward from z1.startY with a much lower threshold ──
        // The TP line is at the very top edge of the profit zone.
        // That top edge is often faint — scan up with 1.2% threshold
        // (3× lower than main) to catch those faded rows.
        const LOW_THRESH = 0.012
        let tpTopRow = z1.startY
        for (let y = z1.startY - 1; y >= Math.max(0, z1.startY - 60); y--) {
          if (rowFrac[y] >= LOW_THRESH) {
            tpTopRow = y
          } else {
            break
          }
        }

        // ── Stop: scan downward from z2.endY similarly ─────────────────
        let stopBottomRow = z2.endY
        for (let y = z2.endY + 1; y <= Math.min(H - 1, z2.endY + 40); y++) {
          if (rowFrac[y] >= LOW_THRESH) {
            stopBottomRow = y
          } else {
            break
          }
        }

        const tpY    = pct(tpTopRow)
        const stopY  = pct(stopBottomRow)
        const entryY = pct((z1.endY + z2.startY) / 2)

        function toPrice(y) {
          if (y == null || !cal?.ready) return null
          const { y1, p1, y2, p2 } = cal
          if (y1 === y2) return null
          return Math.round((p1 + (y - y1) * (p2 - p1) / (y2 - y1)) * 100) / 100
        }

        const entryPrice = toPrice(entryY)
        const tpPrice    = toPrice(tpY)
        const stopPrice  = toPrice(stopY)

        let rr = null
        if (entryPrice && tpPrice && stopPrice) {
          const reward = Math.abs(tpPrice - entryPrice)
          const risk   = Math.abs(entryPrice - stopPrice)
          if (risk > 0) rr = (reward / risk).toFixed(2)
        }

        resolve({ entryY, tpY, stopY, entryPrice, tpPrice, stopPrice, rr })
      } catch (e) { reject(e) }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = base64Image
  })
}
