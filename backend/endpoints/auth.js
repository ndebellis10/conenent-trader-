/**
 * /api/auth — consolidated auth router (all sub-routes via Vercel rewrite)
 *
 * POST /api/auth/login       — rate-limited, CAPTCHA, lockout, timing-safe, HIBP*
 * POST /api/auth/register    — rate-limited, CAPTCHA, HIBP breach check
 * POST /api/auth/logout      — global session invalidation
 * GET  /api/auth/me          — current user + profile
 * POST /api/auth/mfa-setup   — enroll TOTP
 * POST /api/auth/mfa-verify  — verify TOTP code
 *
 * * HIBP = HaveIBeenPwned k-anonymity password breach check
 */
import { createHash }                                         from 'node:crypto'
import { supabaseAdmin, supabaseConfigured }                  from './_lib/supabase-admin.js'
import { setAuthCookiesWithCsrf, clearAuthCookies }           from './_lib/cookies.js'
import { requireAuth, unauthorized }                          from './_lib/auth-middleware.js'
import { applySecurity, handleOptions, requireMethod,
         requireJSON, limitBody, getClientIP,
         isIPBlocked, ipBlockedResponse,
         makeCsrfToken, validateCsrf }                       from './_lib/security.js'
import { checkRateLimit, tooManyRequests }                    from './_lib/rate-limit.js'
import { validateBody, loginSchema, registerSchema }          from './_lib/validate.js'
import { z }                                                  from 'zod'

/* ── Sub-route parser ─────────────────────────────────────── */
function route(req) {
  const m = req.url.match(/\/api\/auth\/?([\w-]*)/)
  return (m?.[1] || 'me').toLowerCase()
}

/* ── CAPTCHA ──────────────────────────────────────────────── */
async function verifyCaptcha(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true   // dev: skip if not configured
  if (!token)  return false
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ secret, response: token }),
    })
    return (await r.json()).success === true
  } catch { return false }
}

/* ── HaveIBeenPwned k-anonymity password check ────────────── */
async function isPasswordBreached(password) {
  try {
    const hash   = createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)
    const r = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true', 'User-Agent': 'FaithTrader-SecurityCheck/1.0' },
    })
    if (!r.ok) return false   // fail-open: don't block login if API is down
    const lines = (await r.text()).split('\n')
    return lines.some(l => l.split(':')[0].trim() === suffix)
  } catch { return false }
}

/* ── Login attempt tracking ───────────────────────────────── */
async function recordAttempt(email, ip, ua, success) {
  await supabaseAdmin.from('login_attempts')
    .insert({ email, ip_address: ip, user_agent: ua, success })
    .catch(() => {})
}

async function isAccountLocked(email, ip) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
  const { count } = await supabaseAdmin
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('success', false)
    .gte('created_at', since)
    .or(`email.eq.${email},ip_address.eq.${ip}`)
  return (count ?? 0) >= 5
}

/* ── Audit helper ─────────────────────────────────────────── */
async function audit(userId, action, ip, ua, meta = {}) {
  await supabaseAdmin.from('audit_logs')
    .insert({ user_id: userId, action, ip_address: ip, user_agent: ua, metadata: meta })
    .catch(() => {})
}

/* ══ HANDLER ══════════════════════════════════════════════════ */
export default async function handler(req, res) {
  try {
  applySecurity(req, res)
  if (handleOptions(req, res)) return

  // ── Supabase not configured — all routes return same code ──
  // This lets client bootstrap detect local mode and load user stores on refresh
  if (!supabaseConfigured) {
    return res.status(503).json({
      error: 'Authentication service not configured.',
      code:  'SUPABASE_NOT_CONFIGURED',
    })
  }

  const ip = getClientIP(req)
  const ua = req.headers['user-agent'] || ''

  // ── Global IP block check ──
  if (await isIPBlocked(ip)) return ipBlockedResponse(res)

  const sub = route(req)

  /* ════ GET /api/auth/csrf ════════════════════════════════════ */
  if (sub === 'csrf') {
    if (!requireMethod(req, res, 'GET')) return
    const IS_PROD = process.env.NODE_ENV === 'production'
    const token   = makeCsrfToken()
    const p = IS_PROD ? '__Host-' : ''
    let c = `${p}ft_csrf=${encodeURIComponent(token)}`
    if (IS_PROD) c += '; Secure'
    c += '; SameSite=Strict; Path=/; Max-Age=604800'
    res.setHeader('Set-Cookie', c)
    return res.status(200).json({ token })
  }

  /* ════ GET /api/auth/me ══════════════════════════════════════ */
  if (sub === 'me') {
    if (!requireMethod(req, res, 'GET')) return
    const user = await requireAuth(req, res)
    if (!user) return unauthorized(res)

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('display_name, starting_balance, currency, risk_per_trade, preferences, created_at')
      .eq('id', user.id).single()

    return res.status(200).json({
      id: user.id, email: user.email, ...profile,
      mfa_enabled: (user.factors?.length ?? 0) > 0,
    })
  }

  /* ════ POST /api/auth/login ══════════════════════════════════ */
  if (sub === 'login') {
    if (!requireMethod(req, res, 'POST')) return
    if (!requireJSON(req, res)) return
    if (!limitBody(req, res)) return

    // Timing-attack protection: minimum 600 ms regardless of outcome
    const t0 = Date.now()
    const respond = async (status, body) => {
      const elapsed = Date.now() - t0
      if (elapsed < 600) await new Promise(r => setTimeout(r, 600 - elapsed))
      return res.status(status).json(body)
    }

    const rl = await checkRateLimit(ip, 'auth:login', { limit: 100, windowMinutes: 15 })
    if (!rl.allowed) return tooManyRequests(res, rl.retry_after)

    const { data, error: ve } = validateBody(loginSchema, req.body)
    if (ve) return respond(400, ve)

    const { email, password, captchaToken } = data

    if (!(await verifyCaptcha(captchaToken)))
      return respond(400, { error: 'CAPTCHA verification failed' })

    if (await isAccountLocked(email, ip)) {
      await recordAttempt(email, ip, ua, false)
      return respond(429, { error: 'Account temporarily locked after multiple failed attempts. Try again in 15 minutes.' })
    }

    const { data: auth, error: authErr } = await supabaseAdmin.auth
      .signInWithPassword({ email, password })

    if (authErr || !auth?.session) {
      await recordAttempt(email, ip, ua, false)
      // Generic message — never reveal whether the email exists
      return respond(401, { error: 'Invalid email or password' })
    }

    await recordAttempt(email, ip, ua, true)
    await audit(auth.user.id, 'LOGIN', ip, ua, { email })

    const csrf = makeCsrfToken()
    setAuthCookiesWithCsrf(res, auth.session, csrf)

    const { data: profile } = await supabaseAdmin.from('profiles')
      .select('display_name, starting_balance, currency, risk_per_trade')
      .eq('id', auth.user.id).single()

    return respond(200, {
      user:  { id: auth.user.id, email: auth.user.email, ...profile },
      csrf,  // return token once for JS to store in memory
    })
  }

  /* ════ POST /api/auth/register ═══════════════════════════════ */
  if (sub === 'register') {
    if (!requireMethod(req, res, 'POST')) return
    if (!requireJSON(req, res)) return
    if (!limitBody(req, res)) return

    const rl = await checkRateLimit(ip, 'auth:register', { limit: 50, windowMinutes: 15 })
    if (!rl.allowed) return tooManyRequests(res, rl.retry_after)

    const { data, error: ve } = validateBody(registerSchema, req.body)
    if (ve) return res.status(400).json(ve)

    const { email, password, displayName, captchaToken } = data

    if (!(await verifyCaptcha(captchaToken)))
      return res.status(400).json({ error: 'CAPTCHA verification failed' })

    // HaveIBeenPwned breach check — reject known compromised passwords
    if (await isPasswordBreached(password)) {
      return res.status(422).json({
        error: 'This password was found in a data breach. Please choose a different password.',
        code:  'PASSWORD_BREACHED',
      })
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { display_name: displayName },
    })
    if (createErr) {
      const msg = createErr.message?.toLowerCase().includes('already')
        ? 'An account with this email already exists'
        : 'Registration failed. Please try again.'
      return res.status(409).json({ error: msg })
    }

    const { data: session } = await supabaseAdmin.auth.signInWithPassword({ email, password })
    if (!session?.session) {
      return res.status(201).json({ message: 'Account created. Please log in.' })
    }

    await audit(created.user.id, 'REGISTER', ip, ua, { email })

    const csrf = makeCsrfToken()
    setAuthCookiesWithCsrf(res, session.session, csrf)

    return res.status(201).json({
      user: { id: session.user.id, email: session.user.email, display_name: displayName },
      csrf,
    })
  }

  /* ════ POST /api/auth/logout ══════════════════════════════════ */
  if (sub === 'logout') {
    if (!requireMethod(req, res, 'POST')) return
    if (!validateCsrf(req, res)) return   // CSRF-protect logout

    const user = await requireAuth(req, res)
    if (user) {
      await supabaseAdmin.auth.admin.signOut(user.id, 'global').catch(() => {})
      await audit(user.id, 'LOGOUT', ip, ua)
    }
    clearAuthCookies(res)
    return res.status(200).json({ message: 'Logged out successfully' })
  }

  /* ════ POST /api/auth/mfa-setup ═══════════════════════════════ */
  if (sub === 'mfa-setup') {
    if (!requireMethod(req, res, 'POST')) return
    if (!validateCsrf(req, res)) return
    const user = await requireAuth(req, res)
    if (!user) return unauthorized(res)

    const { data, error } = await supabaseAdmin.auth.admin.mfa.enrollFactor({
      userId: user.id, factorType: 'totp', issuer: 'Covenant Trader',
    })
    if (error) return res.status(500).json({ error: 'Failed to set up MFA. Please try again.' })

    return res.status(200).json({
      factor_id: data.id,
      qr_code:   data.totp?.qr_code,
      secret:    data.totp?.secret,   // shown once — user must save this
    })
  }

  /* ════ POST /api/auth/mfa-verify ══════════════════════════════ */
  if (sub === 'mfa-verify') {
    if (!requireMethod(req, res, 'POST')) return
    if (!requireJSON(req, res)) return
    if (!validateCsrf(req, res)) return

    const rl = await checkRateLimit(ip, 'auth:mfa-verify', { limit: 10, windowMinutes: 5 })
    if (!rl.allowed) return tooManyRequests(res, rl.retry_after)

    const user = await requireAuth(req, res)
    if (!user) return unauthorized(res)

    const schema = z.object({
      factor_id:    z.string().min(1),
      code:         z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
      challenge_id: z.string().optional(),
    })
    const { data, error: ve } = validateBody(schema, req.body)
    if (ve) return res.status(400).json(ve)

    let challengeId = data.challenge_id
    if (!challengeId) {
      const { data: ch, error: chErr } = await supabaseAdmin.auth.admin.mfa.challengeFactor({
        userId: user.id, factorId: data.factor_id,
      })
      if (chErr) return res.status(500).json({ error: 'Failed to create MFA challenge' })
      challengeId = ch.id
    }

    const { error: vErr } = await supabaseAdmin.auth.admin.mfa.verifyFactor({
      userId: user.id, factorId: data.factor_id, challengeId, code: data.code,
    })
    if (vErr) return res.status(400).json({ error: 'Invalid or expired code. Please try again.' })

    await audit(user.id, 'MFA_VERIFIED', ip, ua)
    return res.status(200).json({ verified: true })
  }

  return res.status(404).json({ error: 'Unknown auth route' })

  } catch (err) {
    // Top-level safety net — never let a crash leak a stack trace
    console.error('[auth] unhandled error:', err.message)
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' })
  }
}
