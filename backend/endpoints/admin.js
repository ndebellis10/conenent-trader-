/**
 * /api/admin — admin-only endpoints
 *
 * GET /api/admin/users — list all registered users + their profiles
 *
 * Protected by the hardcoded admin password (sent as X-Admin-Key header).
 */
import { supabaseAdmin, supabaseConfigured } from './_lib/supabase-admin.js'
import { ADMIN_EMAIL, adminConfigured, verifyCredentials, issueSessionToken, requireAdmin } from './_lib/adminAuth.js'
import { applySecurity, handleOptions }      from './_lib/security.js'

// Credentials live SERVER-SIDE ONLY. No hardcoded fallback: with ADMIN_PASSWORD
// unset every admin route fails closed rather than accepting a known default.
// The browser receives a short-lived HMAC token, never the password itself.

function route(req) {
  const m = req.url.match(/\/api\/admin\/?([\w-]*)/)
  return (m?.[1] || '').toLowerCase()
}

export default async function handler(req, res) {
  applySecurity(req, res)
  if (handleOptions(req, res)) return

  /* ── POST /api/admin/auth — verify admin credentials, return session key ── */
  if (route(req) === 'auth' && req.method === 'POST') {
    if (!adminConfigured()) {
      return res.status(503).json({ admin: false, error: 'Admin access is not configured on this deployment.' })
    }
    const { email, password } = req.body || {}
    if (verifyCredentials(email, password)) {
      // A signed, expiring token — the password never reaches the browser
      return res.status(200).json({ admin: true, sessionKey: issueSessionToken() })
    }
    return res.status(401).json({ admin: false })
  }

  // All other admin routes require a valid session token
  if (requireAdmin(req, res)) return

  const sub = route(req)

  /* ── GET /api/admin/course-progress ──────────────────────────────
     Every trader's completed lesson ids, so admins can see who has
     watched what without impersonating each account. */
  if (sub === 'course-progress' && req.method === 'GET') {
    if (!supabaseConfigured) return res.status(200).json({ progress: [] })
    try {
      const { data, error } = await supabaseAdmin
        .from('course_progress')
        .select('email, completed, updated_at')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ progress: data || [] })
    } catch (e) {
      return res.status(200).json({ progress: [], error: String(e.message || e) })
    }
  }

  /* ── GET /api/admin/users ── */
  if (sub === 'users' && req.method === 'GET') {
    if (!supabaseConfigured) {
      // No Supabase — read all users from the shared GitHub leaderboard JSON
      const token = process.env.GITHUB_TOKEN
      if (!token) return res.status(200).json({ users: [], source: 'no-token' })
      try {
        const url = 'https://raw.githubusercontent.com/ndebellis10/conenent-trader-/main/backend/data/leaderboard.json'
        const r = await fetch(url, { headers: { Authorization: `token ${token}`, 'User-Agent': 'covenant-trader' } })
        if (!r.ok) return res.status(200).json({ users: [], source: 'leaderboard-missing' })
        const data = await r.json()
        const HIDDEN_LB   = [ADMIN_EMAIL.toLowerCase()]
        const bannedLower = (data.banned || []).map(e => e.toLowerCase())
        const traders = (data.traders || [])
          .filter(t =>
            t.email &&
            !HIDDEN_LB.includes(t.email.toLowerCase()) &&
            !bannedLower.includes(t.email.toLowerCase())
          )
          .map(t => ({
            id:         null,
            email:      t.email,
            name:       t.display_name || t.email?.split('@')[0] || '—',
            tradeCount: t.total_trades  ?? 0,
            faithScore: t.faith_score   ?? null,
            winRate:    t.win_rate      ?? null,
            totalPnl:   t.total_pnl     ?? null,
            createdAt:  t.updated_at    ?? null,
            lastSignIn: t.updated_at    ?? null,
          }))
          .sort((a, b) => (b.tradeCount || 0) - (a.tradeCount || 0))
        return res.status(200).json({ users: traders, source: 'leaderboard' })
      } catch (e) {
        console.error('[admin/users] leaderboard fallback failed', e)
        return res.status(200).json({ users: [], source: 'error' })
      }
    }

    try {
      // 1. List all auth users
      const { data: { users }, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000,
      })
      if (usersErr) throw usersErr

      // 2. Fetch all profiles
      const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('id, display_name, starting_balance, currency, created_at')

      const profileMap = {}
      profiles?.forEach(p => { profileMap[p.id] = p })

      // 3. Fetch leaderboard stats + display names set in Settings
      const { data: leaderboard } = await supabaseAdmin
        .from('leaderboard')
        .select('email, display_name, total_trades, faith_score, win_rate, total_pnl')

      const lbMap = {}
      leaderboard?.forEach(l => { lbMap[l.email] = l })

      // 4. Merge and return
      const result = users
        .filter(u => u.email !== ADMIN_EMAIL)
        .map(u => ({
          id:           u.id,
          email:        u.email,
          name:         lbMap[u.email]?.display_name
                     || profileMap[u.id]?.display_name
                     || u.user_metadata?.display_name
                     || u.email?.split('@')[0]
                     || '—',
          createdAt:    u.created_at,
          lastSignIn:   u.last_sign_in_at,
          tradeCount:   lbMap[u.email]?.total_trades  ?? 0,
          faithScore:   lbMap[u.email]?.faith_score   ?? null,
          winRate:      lbMap[u.email]?.win_rate      ?? null,
          totalPnl:     lbMap[u.email]?.total_pnl     ?? null,
        }))
        .sort((a, b) => b.tradeCount - a.tradeCount)

      return res.status(200).json({ users: result, source: 'supabase' })
    } catch (err) {
      console.error('[admin/users]', err)
      return res.status(500).json({ error: 'Failed to load users', users: [], source: 'error' })
    }
  }

  /* ── GET /api/admin/user-data?userId=xxx&email=yyy ── */
  if (sub === 'user-data' && req.method === 'GET') {
    const params  = new URL(req.url, 'http://x').searchParams
    let   userId  = params.get('userId')
    const email   = params.get('email')

    if (!userId && !email) return res.status(400).json({ error: 'userId or email required' })

    if (!supabaseConfigured) {
      // No Supabase — pull what we can from the GitHub leaderboard JSON for this user
      const token = process.env.GITHUB_TOKEN
      if (token && email) {
        try {
          const url = 'https://raw.githubusercontent.com/ndebellis10/conenent-trader-/main/backend/data/leaderboard.json'
          const r = await fetch(url, { headers: { Authorization: `token ${token}`, 'User-Agent': 'covenant-trader' } })
          if (r.ok) {
            const data = await r.json()
            const trader = (data.traders || []).find(t => t.email?.toLowerCase() === email.toLowerCase())
            if (trader) {
              return res.status(200).json({
                trades: [], goals: [], completions: {},
                profile: { display_name: trader.display_name, starting_balance: 10000, currency: 'USD', risk_per_trade: 1 },
                leaderboardStats: trader,
                noSupabase: true,
              })
            }
          }
        } catch { /* fall through */ }
      }
      return res.status(200).json({ trades: [], goals: [], completions: {}, profile: {}, noSupabase: true })
    }

    try {
      // If no userId (or it's 'null'/'undefined'), resolve from email
      if (!userId || userId === 'null' || userId === 'undefined') {
        if (email) {
          const { data: authData } = await supabaseAdmin.auth.admin.getUserByEmail(email)
          userId = authData?.user?.id || null
        }
        if (!userId) return res.status(200).json({ trades: [], goals: [], completions: {}, profile: {}, noUserId: true })
      }

      // Fetch ALL trades — no date filter, no limit (so historical data is included)
      const { data: trades, error: tErr } = await supabaseAdmin
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (tErr) throw tErr

      // Fetch goals
      const { data: goals } = await supabaseAdmin
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Fetch goal completions (graceful if table doesn't exist)
      let completions = {}
      try {
        const { data: completionRows } = await supabaseAdmin
          .from('goal_completions')
          .select('goal_id, date')
          .eq('user_id', userId)
        completionRows?.forEach(row => {
          if (!completions[row.date]) completions[row.date] = []
          completions[row.date].push(row.goal_id)
        })
      } catch { /* table may not exist */ }

      // Fetch profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('display_name, starting_balance, currency, risk_per_trade')
        .eq('id', userId)
        .single()

      return res.status(200).json({
        trades:  trades  ?? [],
        goals:   goals   ?? [],
        completions,
        profile: profile ?? {},
        userId,
      })
    } catch (err) {
      console.error('[admin/user-data]', err)
      return res.status(500).json({ error: 'Failed to load user data', trades: [], goals: [], completions: {}, profile: {} })
    }
  }

  /* ── POST /api/admin/leaderboard-reset?email=xxx — zero out stats, keep profile ── */
  if (sub === 'leaderboard-reset' && req.method === 'POST') {
    const params = new URL(req.url, 'http://x').searchParams
    const email  = params.get('email')
    if (!email) return res.status(400).json({ error: 'email required' })

    if (!supabaseConfigured) return res.status(200).json({ ok: true, note: 'no supabase' })

    try {
      const { error } = await supabaseAdmin
        .from('leaderboard')
        .update({
          total_trades: 0,
          wins:         0,
          win_rate:     0,
          total_pnl:    0,
          avg_rr:       null,
          avg_entry:    0,
          avg_exit:     0,
          avg_faith:    0,
          discipline:   0,
          faith_score:  0,
          updated_at:   new Date().toISOString(),
        })
        .eq('email', email)
      if (error) throw error
      return res.status(200).json({ ok: true })
    } catch (err) {
      console.error('[admin/leaderboard-reset]', err)
      return res.status(500).json({ error: 'Failed to reset user stats' })
    }
  }

  return res.status(404).json({ error: 'Not found' })
}
