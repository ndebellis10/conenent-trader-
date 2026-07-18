/**
 * /api/user  — user data management router
 *
 * GET  /api/user/export?format=json|csv  → download all user data
 * POST /api/user/delete                  → permanently delete account
 * PATCH /api/user/profile                → update profile settings
 */
import { supabaseAdmin }                            from './_lib/supabase-admin.js'
import { requireAuth, unauthorized }                from './_lib/auth-middleware.js'
import { clearAuthCookies }                         from './_lib/cookies.js'
import { applySecurity, handleOptions,
         requireJSON, limitBody, getClientIP,
         validateCsrf, isIPBlocked,
         ipBlockedResponse }                       from './_lib/security.js'
import { checkRateLimit, tooManyRequests }          from './_lib/rate-limit.js'
import { validateBody, profileSchema }             from './_lib/validate.js'

function getSubRoute(req) {
  const match = req.url.match(/\/api\/user\/?([\w-]*)/)
  return (match?.[1] || '').toLowerCase()
}

export default async function handler(req, res) {
  applySecurity(req, res)
  if (handleOptions(req, res)) return

  const ip = getClientIP(req)
  if (await isIPBlocked(ip)) return ipBlockedResponse(res)

  const user = await requireAuth(req, res)
  if (!user) return unauthorized(res)

  if (!validateCsrf(req, res)) return

  const route = getSubRoute(req)

  /* ══ GET /api/user/export ═══════════════════════════════════════ */
  if (route === 'export') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return res.status(405).json({ error: 'Method not allowed' })
    }
    // 3 exports per hour max
    const rl = await checkRateLimit(user.id, 'user:export', { limit: 3, windowMinutes: 60 })
    if (!rl.allowed) return tooManyRequests(res, rl.retry_after)

    const [trades, goals, completions, journal, playbook, profile] = await Promise.all([
      supabaseAdmin.from('trades').select('*').eq('user_id', user.id).is('deleted_at', null).order('date', { ascending: false }),
      supabaseAdmin.from('goals').select('*').eq('user_id', user.id).is('deleted_at', null).order('sort_order'),
      supabaseAdmin.from('goal_completions').select('*').eq('user_id', user.id),
      supabaseAdmin.from('journal_entries').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabaseAdmin.from('playbook_strategies').select('*').eq('user_id', user.id).is('deleted_at', null),
      supabaseAdmin.from('profiles').select('display_name,starting_balance,currency,risk_per_trade,created_at').eq('id', user.id).single(),
    ])

    const format = (req.query?.format || 'json').toLowerCase()

    if (format === 'csv') {
      const cols = ['date','symbol','direction','timeframe','entry_price','exit_price',
                    'position_size','commission','gross_pnl','net_pnl','result',
                    'pre_trade','post_trade','faith_rating','trade_notes']
      const rows = (trades.data || []).map(t => cols.map(c => JSON.stringify(t[c] ?? '')).join(','))
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="covenant-trader-trades.csv"')
      return res.status(200).send([cols.join(','), ...rows].join('\n'))
    }

    res.setHeader('Content-Disposition', 'attachment; filename="covenant-trader-export.json"')
    return res.status(200).json({
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email },
      profile:     profile.data,
      trades:      trades.data          || [],
      goals:       goals.data           || [],
      goal_completions: completions.data || [],
      journal_entries: journal.data     || [],
      playbook:    playbook.data        || [],
    })
  }

  /* ══ PATCH /api/user/profile ════════════════════════════════════ */
  if (route === 'profile') {
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'PATCH')
      return res.status(405).json({ error: 'Method not allowed' })
    }
    if (!requireJSON(req, res)) return
    if (!limitBody(req, res)) return

    const { data: v, error: ve } = validateBody(profileSchema, req.body)
    if (ve) return res.status(400).json(ve)

    const { data, error } = await supabaseAdmin.from('profiles')
      .update(v).eq('id', user.id).select().single()
    if (error) return res.status(500).json({ error: 'Failed to update profile' })
    return res.status(200).json({ profile: data })
  }

  /* ══ POST /api/user/delete ══════════════════════════════════════ */
  if (route === 'delete') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method not allowed' })
    }
    if (!requireJSON(req, res)) return
    if (!limitBody(req, res)) return

    const { confirmation } = req.body || {}
    if (confirmation !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({ error: 'Type "DELETE MY ACCOUNT" exactly to confirm.' })
    }

    const now = new Date().toISOString()
    await Promise.all([
      supabaseAdmin.from('trades')              .update({ deleted_at: now }).eq('user_id', user.id),
      supabaseAdmin.from('goals')               .update({ deleted_at: now }).eq('user_id', user.id),
      supabaseAdmin.from('journal_entries')     .update({ deleted_at: now }).eq('user_id', user.id),
      supabaseAdmin.from('playbook_strategies') .update({ deleted_at: now }).eq('user_id', user.id),
      supabaseAdmin.from('profiles')            .update({ deleted_at: now }).eq('id', user.id),
      supabaseAdmin.from('goal_completions')    .delete().eq('user_id', user.id),
    ])
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id, action: 'ACCOUNT_DELETE',
      ip_address: ip, metadata: { email: user.email },
    }).catch(() => {})

    await supabaseAdmin.auth.admin.deleteUser(user.id)
    clearAuthCookies(res)
    return res.status(200).json({ message: 'Account permanently deleted.' })
  }

  return res.status(404).json({ error: 'Unknown user route' })
}
