/**
 * Authentication middleware.
 * Reads __Host-ft_access / __Host-ft_refresh cookies (plain names in dev).
 * Auto-rotates the session when the access token is expired.
 * NEVER returns tokens to the client.
 */
import { supabaseAdmin }                                         from './supabase-admin.js'
import { parseCookies, ACCESS_COOKIE, REFRESH_COOKIE,
         setAuthCookiesWithCsrf, clearAuthCookies }             from './cookies.js'
import { makeCsrfToken }                                        from './security.js'

/**
 * Verify session from cookies.  Sets req.user if valid.
 * Returns the Supabase user object, or null if unauthenticated.
 */
export async function requireAuth(req, res) {
  const cookies      = parseCookies(req.headers.cookie)
  const accessToken  = cookies[ACCESS_COOKIE]
  const refreshToken = cookies[REFRESH_COOKIE]

  if (!accessToken && !refreshToken) return null

  // 1. Validate access token (fast path)
  if (accessToken) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken)
    if (!error && user) {
      req.user        = user
      req.accessToken = accessToken
      return user
    }
  }

  // 2. Access token expired — try to rotate via refresh token
  if (refreshToken) {
    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token: refreshToken })
    if (!error && data.session && data.user) {
      const newCsrf = makeCsrfToken()
      setAuthCookiesWithCsrf(res, data.session, newCsrf)
      req.user        = data.user
      req.accessToken = data.session.access_token
      return data.user
    }
  }

  // 3. Both tokens invalid — purge stale cookies
  clearAuthCookies(res)
  return null
}

/** Return 401 and clear auth cookies. */
export function unauthorized(res, msg = 'Authentication required') {
  clearAuthCookies(res)
  return res.status(401).json({ error: msg })
}
