/**
 * /api/goals  — consolidated goals router
 *
 * GET    /api/goals           → list goals + completions
 * POST   /api/goals           → create goal
 * PATCH  /api/goals/:id       → update goal
 * DELETE /api/goals/:id       → soft-delete goal
 * POST   /api/goals/:id/complete → toggle completion for a date
 */
import { supabaseAdmin }                           from './_lib/supabase-admin.js'
import { requireAuth, unauthorized }               from './_lib/auth-middleware.js'
import { applySecurity, handleOptions,
         requireJSON, limitBody, getClientIP,
         validateCsrf, isIPBlocked,
         ipBlockedResponse }                     from './_lib/security.js'
import { checkRateLimit, tooManyRequests }         from './_lib/rate-limit.js'
import { validateBody, goalSchema, isValidUUID }   from './_lib/validate.js'
import { z }                                       from 'zod'

function parseUrl(req) {
  // /api/goals                → { id: null, action: null }
  // /api/goals/uuid           → { id: 'uuid', action: null }
  // /api/goals/uuid/complete  → { id: 'uuid', action: 'complete' }
  const match = req.url.match(/\/api\/goals\/?([0-9a-f-]{36})?(?:\/([\w-]+))?/)
  return { id: match?.[1] || null, action: match?.[2] || null }
}

const completeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (YYYY-MM-DD)'),
})

export default async function handler(req, res) {
  applySecurity(req, res)
  if (handleOptions(req, res)) return

  if (await isIPBlocked(getClientIP(req))) return ipBlockedResponse(res)

  const user = await requireAuth(req, res)
  if (!user) return unauthorized(res)

  if (!validateCsrf(req, res)) return

  const rl = await checkRateLimit(user.id, 'goals', { limit: 100, windowMinutes: 1 })
  if (!rl.allowed) return tooManyRequests(res, rl.retry_after)

  const { id, action } = parseUrl(req)

  /* ── Toggle completion ── */
  if (id && action === 'complete') {
    if (!requireJSON(req, res)) return
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid goal ID' })

    // Verify ownership
    const { data: g } = await supabaseAdmin.from('goals')
      .select('id').eq('id', id).eq('user_id', user.id).is('deleted_at', null).single()
    if (!g) return res.status(404).json({ error: 'Goal not found' })

    const { data: v, error: ve } = validateBody(completeSchema, req.body)
    if (ve) return res.status(400).json(ve)

    const { error: ins } = await supabaseAdmin.from('goal_completions')
      .insert({ goal_id: id, user_id: user.id, date: v.date })
    if (ins?.code === '23505') {
      await supabaseAdmin.from('goal_completions')
        .delete().eq('goal_id', id).eq('user_id', user.id).eq('date', v.date)
      return res.status(200).json({ completed: false })
    }
    if (ins) return res.status(500).json({ error: 'Failed to toggle completion' })
    return res.status(200).json({ completed: true })
  }

  /* ── Single goal operations ── */
  if (id) {
    if (!isValidUUID(id)) return res.status(400).json({ error: 'Invalid goal ID' })
    const { data: goal } = await supabaseAdmin.from('goals')
      .select('id').eq('id', id).eq('user_id', user.id).is('deleted_at', null).single()
    if (!goal) return res.status(404).json({ error: 'Goal not found' })

    if (req.method === 'PATCH') {
      if (!requireJSON(req, res)) return
      if (!limitBody(req, res)) return
      const { data: v, error: ve } = validateBody(goalSchema.partial(), req.body)
      if (ve) return res.status(400).json(ve)
      const { data: updated, error } = await supabaseAdmin.from('goals')
        .update(v).eq('id', id).eq('user_id', user.id).select().single()
      if (error) return res.status(500).json({ error: 'Failed to update goal' })
      return res.status(200).json({ goal: updated })
    }

    if (req.method === 'DELETE') {
      await supabaseAdmin.from('goals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id).eq('user_id', user.id)
      return res.status(200).json({ message: 'Goal deleted' })
    }

    res.setHeader('Allow', 'PATCH, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  /* ── Collection ── */
  if (req.method === 'GET') {
    const [gr, cr] = await Promise.all([
      supabaseAdmin.from('goals').select('id, text, sort_order, created_at')
        .eq('user_id', user.id).is('deleted_at', null).order('sort_order'),
      supabaseAdmin.from('goal_completions').select('goal_id, date').eq('user_id', user.id),
    ])
    if (gr.error) return res.status(500).json({ error: 'Failed to fetch goals' })
    const completions = {}
    for (const c of cr.data || []) {
      completions[c.date] ??= []
      completions[c.date].push(c.goal_id)
    }
    return res.status(200).json({ goals: gr.data, completions })
  }

  if (req.method === 'POST') {
    if (!requireJSON(req, res)) return
    if (!limitBody(req, res)) return
    const { data: v, error: ve } = validateBody(goalSchema, req.body)
    if (ve) return res.status(400).json(ve)
    const { data, error } = await supabaseAdmin.from('goals')
      .insert({ ...v, user_id: user.id }).select().single()
    if (error) return res.status(500).json({ error: 'Failed to save goal' })
    return res.status(201).json({ goal: data })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
