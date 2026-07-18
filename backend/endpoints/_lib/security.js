/**
 * Security middleware — CORS, 20+ security headers, CSRF,
 * method/content-type/body guards, IP blocking, request tracing.
 *
 * !! Keep all imports at the TOP — no imports inside functions !!
 */
import { randomBytes, randomUUID, createHmac, timingSafeEqual } from 'node:crypto'
import { supabaseAdmin }        from './supabase-admin.js'
import { parseCookies, CSRF_COOKIE } from './cookies.js'

/* ── CORS ──────────────────────────────────────────────────── */
const PROD_ORIGIN     = process.env.APP_URL || 'https://faith-trader.vercel.app'
const ALLOWED_ORIGINS = new Set([
  PROD_ORIGIN,
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001']
    : []),
])

/* ── CSRF ──────────────────────────────────────────────────── */
const CSRF_SECRET = process.env.CSRF_SECRET || 'dev-csrf-secret-change-in-prod'
const CSRF_HEADER = 'x-csrf-token'

/** Generate an HMAC-signed CSRF token (stateless). */
export function makeCsrfToken() {
  const nonce = randomBytes(32).toString('hex')
  const mac   = createHmac('sha256', CSRF_SECRET).update(nonce).digest('hex')
  return `${nonce}.${mac}`
}

/** Verify an HMAC-signed CSRF token (timing-safe). */
export function verifyCsrfToken(token) {
  if (!token || !token.includes('.')) return false
  const dot     = token.lastIndexOf('.')
  const nonce   = token.slice(0, dot)
  const mac     = token.slice(dot + 1)
  if (!nonce || !mac) return false
  const expected = createHmac('sha256', CSRF_SECRET).update(nonce).digest('hex')
  try {
    return timingSafeEqual(
      Buffer.from(mac,      'hex'),
      Buffer.from(expected, 'hex'),
    )
  } catch { return false }
}

/* ── Security headers + CORS ───────────────────────────────── */
export function applySecurity(req, res) {
  const origin      = req.headers.origin || ''
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : PROD_ORIGIN

  res.setHeader('Access-Control-Allow-Origin',      allowOrigin)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods',     'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers',     `Content-Type, ${CSRF_HEADER}`)
  res.setHeader('Access-Control-Max-Age',           '86400')

  res.setHeader('Strict-Transport-Security',  'max-age=63072000; includeSubDomains; preload')
  res.setHeader('X-Frame-Options',            'DENY')
  res.setHeader('X-Content-Type-Options',     'nosniff')
  res.setHeader('X-XSS-Protection',           '1; mode=block')
  res.setHeader('Referrer-Policy',            'no-referrer')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '))

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma',  'no-cache')
  res.setHeader('Expires', '0')

  const reqId = req.headers['x-request-id'] || randomUUID()
  res.setHeader('X-Request-ID', reqId)
  req.requestId = reqId

  res.removeHeader('X-Powered-By')
  res.removeHeader('Server')
}

/* ── Preflight ─────────────────────────────────────────────── */
export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') { res.status(204).end(); return true }
  return false
}

/* ── Method guard ──────────────────────────────────────────── */
export function requireMethod(req, res, ...methods) {
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '))
    res.status(405).json({ error: 'Method not allowed' })
    return false
  }
  return true
}

/* ── Content-Type guard ────────────────────────────────────── */
export function requireJSON(req, res) {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!(req.headers['content-type'] || '').includes('application/json')) {
      res.status(415).json({ error: 'Content-Type must be application/json' })
      return false
    }
  }
  return true
}

/* ── Body-size guard ───────────────────────────────────────── */
export function limitBody(req, res, maxBytes = 32_768) {
  const len = parseInt(req.headers['content-length'] || '0', 10)
  if (len > maxBytes) {
    res.status(413).json({ error: 'Request body too large' })
    return false
  }
  return true
}

/* ── CSRF validation (double-submit cookie) ────────────────── */
export function validateCsrf(req, res) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return true

  const headerToken = req.headers[CSRF_HEADER] || req.headers['x-csrf-token']
  const cookies     = parseCookies(req.headers.cookie)
  const cookieToken = cookies[CSRF_COOKIE]

  if (!headerToken || !cookieToken) {
    res.status(403).json({ error: 'CSRF token missing' })
    return false
  }
  if (headerToken !== cookieToken || !verifyCsrfToken(headerToken)) {
    res.status(403).json({ error: 'CSRF token invalid' })
    return false
  }
  return true
}

/* ── IP blocking ───────────────────────────────────────────── */
export async function isIPBlocked(ip) {
  if (!ip || ip === 'unknown') return false
  try {
    const { data } = await supabaseAdmin
      .from('blocked_ips')
      .select('block_until')
      .eq('ip_address', ip)
      .maybeSingle()
    if (!data)             return false
    if (!data.block_until) return true
    return new Date(data.block_until) > new Date()
  } catch { return false }  // fail-open if DB unavailable
}

export function ipBlockedResponse(res) {
  return res.status(403).json({ error: 'Access denied' })
}

export async function autoBlockIP(ip, reason, hours = 1) {
  if (!ip || ip === 'unknown') return
  await supabaseAdmin.from('blocked_ips').upsert({
    ip_address:   ip,
    reason,
    block_until:  new Date(Date.now() + hours * 3_600_000).toISOString(),
    auto_blocked: true,
  }, { onConflict: 'ip_address' }).catch(() => {})
}

/* ── IP extraction ─────────────────────────────────────────── */
export function getClientIP(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip']        ||
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress       ||
    'unknown'
  )
}
