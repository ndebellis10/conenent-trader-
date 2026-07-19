/**
 * Admin authentication.
 *
 * The admin password is NEVER sent to the browser and has no hardcoded
 * fallback — if ADMIN_PASSWORD is unset every admin route fails closed.
 *
 * On successful login we mint a stateless HMAC session token:
 *     <expiry-ms>.<hex hmac of expiry, keyed by ADMIN_PASSWORD>
 * Verification recomputes the HMAC, so nothing needs to be stored between
 * serverless invocations, and a leaked token expires on its own.
 */
import crypto from 'node:crypto'

const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'nickisthebesttrader@covenanttrader.app'

/** The configured password, or '' when unset. Never return a default. */
export function adminSecret() {
  return process.env.ADMIN_PASSWORD || ''
}

export function adminConfigured() {
  return adminSecret().length > 0
}

/** Constant-time string compare that tolerates differing lengths. */
function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function sign(expiry, secret) {
  return crypto.createHmac('sha256', secret).update(String(expiry)).digest('hex')
}

/** Verify an email + password login. */
export function verifyCredentials(email, password) {
  const secret = adminSecret()
  if (!secret) return false
  const emailOk = String(email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()
  return emailOk && safeEqual(password || '', secret)
}

/** Mint a session token. Never contains the password. */
export function issueSessionToken() {
  const secret = adminSecret()
  if (!secret) return null
  const expiry = Date.now() + SESSION_TTL_MS
  return `${expiry}.${sign(expiry, secret)}`
}

/** Validate the x-admin-key header. Fails closed when unconfigured. */
export function verifySessionToken(token) {
  const secret = adminSecret()
  if (!secret || !token) return false

  const [expiryRaw, mac] = String(token).split('.')
  if (!expiryRaw || !mac) return false

  const expiry = Number(expiryRaw)
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false

  return safeEqual(mac, sign(expiry, secret))
}

/** Guard for admin routes — returns true when the response has been sent. */
export function requireAdmin(req, res) {
  if (!adminConfigured()) {
    res.status(503).json({ error: 'Admin access is not configured on this deployment.' })
    return true
  }
  if (!verifySessionToken(req.headers['x-admin-key'])) {
    res.status(401).json({ error: 'Unauthorized' })
    return true
  }
  return false
}
