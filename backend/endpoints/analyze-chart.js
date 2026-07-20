/**
 * POST /api/analyze-chart
 *
 * Accepts a trading chart screenshot from a signed-in trader.
 * Uses Claude Vision (claude-sonnet-4-6) to extract entry, stop loss,
 * and take profit price levels from the chart image.
 *
 * Body: { image: string (base64) }
 * Returns: { prices: { entry, stopLoss, takeProfit1, takeProfit2, entryY, stopY, tp1Y, tp2Y } }
 */
import Anthropic from '@anthropic-ai/sdk'
import { applySecurity, handleOptions, requireMethod, limitBody } from './_lib/security.js'
import { requireAuth, unauthorized } from './_lib/auth-middleware.js'
import { checkRateLimit, tooManyRequests } from './_lib/rate-limit.js'

export default async function handler(req, res) {
  applySecurity(req, res)
  if (handleOptions(req, res)) return
  if (!requireMethod(req, res, 'POST')) return
  if (!limitBody(req, res, 10_000_000)) return

  // Vision calls bill the Anthropic account — signed-in users only
  const user = await requireAuth(req, res)
  if (!user) return unauthorized(res)

  const rl = await checkRateLimit(user.id, 'analyze-chart', { limit: 30, windowMinutes: 60 })
  if (!rl.allowed) return tooManyRequests(res, rl.retry_after)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'AI price detection not configured. Add ANTHROPIC_API_KEY to Vercel environment variables.' })
  }

  try {
    const { image } = req.body

    if (!image) {
      return res.status(400).json({ error: 'Image is required.' })
    }

    const base64 = image.replace(/^data:image\/\w+;base64,/, '')

    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: `This is a trading chart screenshot with price levels marked. Extract the following values if visible: entry price, stop loss price, take profit price(s). Return ONLY a JSON object with keys: entry, stopLoss, takeProfit1, takeProfit2 (null if not visible). Only return numbers, no text.

Also return the Y-axis position (0-100% from top) for each level if detectable: entryY, stopY, tp1Y, tp2Y.

Example output: {"entry": 21050.00, "stopLoss": 20980.00, "takeProfit1": 21150.00, "takeProfit2": 21250.00, "entryY": 55, "stopY": 82, "tp1Y": 30, "tp2Y": 10}

Use null for any value you cannot read with confidence. Return ONLY raw JSON, no markdown, no explanation.`,
          },
        ],
      }],
    })

    const text = response.content[0]?.text || ''
    const match = text.match(/\{[\s\S]*?\}/)
    if (!match) {
      return res.status(422).json({ error: 'Could not detect price levels. Please enter manually.' })
    }

    const raw = JSON.parse(match[0])

    // Normalize both old field names (entry/tp/stop) and new names (entry/stopLoss/takeProfit1)
    const prices = {
      entry:       raw.entry      ?? null,
      stopLoss:    raw.stopLoss   ?? raw.stop ?? null,
      takeProfit1: raw.takeProfit1 ?? raw.tp  ?? null,
      takeProfit2: raw.takeProfit2 ?? null,
      entryY:      raw.entryY     ?? null,
      stopY:       raw.stopY      ?? null,
      tp1Y:        raw.tp1Y       ?? raw.tpY  ?? null,
      tp2Y:        raw.tp2Y       ?? null,
    }

    return res.status(200).json({ prices })

  } catch (e) {
    console.error('[analyze-chart]', e.message)
    return res.status(500).json({ error: 'AI analysis failed. Please try again.' })
  }
}
