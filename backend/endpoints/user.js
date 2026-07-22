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

  /* ══ /api/user/track — product analytics ingestion (EVENTS ONLY) ══
     Placed before the CSRF check: it's a logged-in, low-risk write (a single
     event name), and it's fire-and-forget from the client. Only whitelisted
     event names are stored, with tiny scalar props — never trade content. */
  if (getSubRoute(req) === 'track') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
    if (!limitBody(req, res, 4000)) return
    const ALLOWED = new Set([
      'signup_completed', 'login', 'onboarding_form_done', 'onboarding_videos_done',
      'first_trade_logged', 'trade_logged', 'alan_message_sent', 'lesson_completed', 'chart_analyzed',
    ])
    const event = String(req.body?.event || '')
    if (!ALLOWED.has(event)) return res.status(200).json({ ok: true })  // ignore unknown
    const rawProps = (req.body?.props && typeof req.body.props === 'object') ? req.body.props : {}
    const props = {}
    for (const [k, v] of Object.entries(rawProps)) {
      if (k.length <= 40 && ['string', 'number', 'boolean'].includes(typeof v)) {
        props[k] = typeof v === 'string' ? v.slice(0, 120) : v
      }
    }
    supabaseAdmin.from('analytics_events').insert({
      email: String(user.email || '').toLowerCase() || null, event, props,
    }).then(() => {}, () => {})
    return res.status(200).json({ ok: true })
  }

  if (!validateCsrf(req, res)) return

  const route = getSubRoute(req)

  /* ══ /api/user/course-progress ══════════════════════════════════
     Completed lesson ids, stored per account so watched lessons follow
     the user across devices instead of living only in localStorage. */
  if (route === 'course-progress') {
    const email = String(user.email || '').toLowerCase()
    if (!email) return res.status(400).json({ error: 'no email on session' })

    if (req.method === 'GET') {
      try {
        const { data, error } = await supabaseAdmin
          .from('course_progress').select('completed, notes, note_images').eq('email', email).maybeSingle()
        if (error) throw error
        return res.status(200).json({ completed: data?.completed || [], notes: data?.notes || {}, noteImages: data?.note_images || {} })
      } catch (e) {
        return res.status(200).json({ completed: [], notes: {}, noteImages: {}, error: String(e.message || e) })
      }
    }

    if (req.method === 'POST') {
      const list  = Array.isArray(req.body?.completed) ? req.body.completed : null
      const notes = req.body?.notes && typeof req.body.notes === 'object' ? req.body.notes : null
      const noteImages = req.body?.noteImages && typeof req.body.noteImages === 'object' ? req.body.noteImages : null
      if (!list && !notes && !noteImages) return res.status(400).json({ error: 'completed[], notes{}, or noteImages{} required' })

      const row = { email, updated_at: new Date().toISOString() }
      // Cap it — the course is finite, this is just a guard against junk
      if (list) row.completed = [...new Set(list.filter(x => typeof x === 'string' && x.length < 120))].slice(0, 500)
      if (notes) {
        const clean = {}
        for (const [k, v] of Object.entries(notes)) {
          if (typeof k === 'string' && k.length < 120 && typeof v === 'string') clean[k] = v.slice(0, 20000)
        }
        row.notes = clean
      }
      if (noteImages) {
        // Per lesson: up to 6 compressed data-URL images, each capped in size
        const clean = {}
        for (const [k, arr] of Object.entries(noteImages)) {
          if (typeof k !== 'string' || k.length >= 120 || !Array.isArray(arr)) continue
          const imgs = arr
            .filter(u => typeof u === 'string' && u.startsWith('data:image/') && u.length <= 700000)
            .slice(0, 6)
          if (imgs.length) clean[k] = imgs
        }
        row.note_images = clean
      }
      try {
        const { error } = await supabaseAdmin
          .from('course_progress')
          .upsert(row, { onConflict: 'email' })
        if (error) throw error
        return res.status(200).json({ ok: true })
      } catch (e) {
        return res.status(500).json({ ok: false, error: String(e.message || e) })
      }
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

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
