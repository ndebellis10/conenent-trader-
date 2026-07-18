/**
 * /api/trades  — consolidated trades router
 * Vercel rewrites /api/trades/* → /api/trades  (id from URL path)
 *
 * GET    /api/trades          → list
 * POST   /api/trades          → create
 * GET    /api/trades/:id      → get one
 * PATCH  /api/trades/:id      → update
 * DELETE /api/trades/:id      → soft-delete
 */
import { supabaseAdmin }                         from './_lib/supabase-admin.js'
import { requireAuth, unauthorized }             from './_lib/auth-middleware.js'
import { applySecurity, handleOptions,
         requireJSON, limitBody, getClientIP,
         validateCsrf, isIPBlocked,
         ipBlockedResponse }                    from './_lib/security.js'
import { checkRateLimit, tooManyRequests }       from './_lib/rate-limit.js'
import { validateBody, tradeSchema, isValidUUID } from './_lib/validate.js'

/** Extract trade ID from URL path (e.g. /api/trades/uuid-here → uuid) */
function getTradeId(req) {
  const match = req.url.match(/\/api\/trades\/([0-9a-f-]{36})/i)
  return match?.[1] || null
}

/** Server-side PnL calculation. Returns null if prices are missing — caller uses client values. */
function calcPnl({ direction, entry_price, exit_price, position_size, commission = 0 }) {
  const e = Number(entry_price), x = Number(exit_price), s = Number(position_size)
  if (!e || !x || !s) return null
  const c = Number(commission)
  const PPP = 2
  const pts = direction === 'Long' ? (x - e) : (e - x)
  const gross = pts * s * PPP
  const net   = gross - c
  const risk  = s * PPP * e
  const pct   = risk > 0 ? (net / risk) * 100 : 0
  return {
    gross_pnl: parseFloat(gross.toFixed(2)),
    net_pnl:   parseFloat(net.toFixed(2)),
    pct_pnl:   parseFloat(pct.toFixed(4)),
    result:    net > 0.005 ? 'Win' : net < -0.005 ? 'Loss' : 'Breakeven',
  }
}

export default async function handler(req, res) {
  applySecurity(req, res)
  if (handleOptions(req, res)) return

  if (await isIPBlocked(getClientIP(req))) return ipBlockedResponse(res)

  const user = await requireAuth(req, res)
  if (!user) return unauthorized(res)

  if (!validateCsrf(req, res)) return

  const rl = await checkRateLimit(user.id, 'trades', { limit: 100, windowMinutes: 1 })
  if (!rl.allowed) return tooManyRequests(res, rl.retry_after)

  const id = getTradeId(req)
  const ip = getClientIP(req)

  /* ── Operations on a single trade ── */
  if (id) {
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid trade ID' })

    // Fetch with ownership assertion (service role bypasses RLS so we enforce manually)
    const { data: trade, error: fErr } = await supabaseAdmin
      .from('trades')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)   // ← ALWAYS scope to this user
      .is('deleted_at', null)
      .single()

    if (fErr || !trade) return res.status(404).json({ error: 'Trade not found' })

    if (req.method === 'GET') return res.status(200).json({ trade })

    if (req.method === 'PATCH') {
      if (!requireJSON(req, res)) return
      if (!limitBody(req, res, 64_000)) return
      const { data: v, error: ve } = validateBody(tradeSchema.partial(), req.body)
      if (ve) return res.status(400).json(ve)
      const merged = { ...trade, ...v }
      const pnl    = calcPnl(merged)
      const { data: updated, error } = await supabaseAdmin.from('trades')
        .update({ ...v, ...pnl }).eq('id', id).eq('user_id', user.id)
        .select().single()
      if (error) return res.status(500).json({ error: 'Failed to update trade' })
      return res.status(200).json({ trade: updated })
    }

    if (req.method === 'DELETE') {
      const { error } = await supabaseAdmin.from('trades')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id).eq('user_id', user.id)
      if (error) return res.status(500).json({ error: 'Failed to delete trade' })
      await supabaseAdmin.from('audit_logs').insert({
        user_id: user.id, action: 'TRADE_DELETE', resource: 'trade',
        resource_id: id, ip_address: ip,
      }).catch(() => {})
      return res.status(200).json({ message: 'Trade deleted' })
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  /* ── Collection operations ── */
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin.from('trades')
      .select('*').eq('user_id', user.id).is('deleted_at', null)
      .order('date', { ascending: false }).order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: 'Failed to fetch trades' })
    return res.status(200).json({ trades: data })
  }

  if (req.method === 'POST') {
    if (!requireJSON(req, res)) return
    if (!limitBody(req, res, 64_000)) return
    const { data: v, error: ve } = validateBody(tradeSchema, req.body)
    if (ve) return res.status(400).json(ve)
    const serverPnl = calcPnl(v)
    const pnl = serverPnl ?? {
      gross_pnl: v.gross_pnl ?? null,
      net_pnl:   v.net_pnl   ?? null,
      pct_pnl:   v.pct_pnl   ?? null,
      result:    v.result     ?? null,
    }
    const { data, error } = await supabaseAdmin.from('trades')
      .insert({ ...v, ...pnl, user_id: user.id }).select().single()
    if (error) return res.status(500).json({ error: 'Failed to save trade' })
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id, action: 'TRADE_CREATE', resource: 'trade',
      resource_id: data.id, ip_address: ip,
    }).catch(() => {})
    return res.status(201).json({ trade: data })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
