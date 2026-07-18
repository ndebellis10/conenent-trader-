/**
 * Cookie management — maximum security configuration.
 *
 * Production:  uses __Host- prefix (requires HTTPS, no Domain, Path=/ only)
 *              __Host- prevents subdomain cookie-injection attacks.
 * Development: standard names (localhost HTTP doesn't support __Host-)
 *
 * Tokens NEVER leave the server in a response body.
 * All cookies are HttpOnly, Secure (prod), SameSite=Strict.
 */

const IS_PROD = process.env.NODE_ENV === 'production'

// __Host- prefix enforces: Secure + no Domain + Path=/ — per RFC 6265bis
const P          = IS_PROD ? '__Host-' : ''
export const ACCESS_COOKIE  = `${P}ft_access`
export const REFRESH_COOKIE = `${P}ft_refresh`
export const CSRF_COOKIE    = `${P}ft_csrf`   // NON-HttpOnly — readable by JS for double-submit

/** Parse Cookie header → key/value map. */
export function parseCookies(cookieHeader = '') {
  if (!cookieHeader) return {}
  return cookieHeader.split(';').reduce((acc, pair) => {
    const eq = pair.indexOf('=')
    if (eq < 0) return acc
    const k = pair.slice(0, eq).trim()
    const v = pair.slice(eq + 1).trim()
    if (k) acc[k] = decodeURIComponent(v)
    return acc
  }, {})
}

/** Build a single Set-Cookie string. */
function buildCookie(name, value, opts = {}) {
  let s = `${name}=${encodeURIComponent(value)}`
  if (opts.httpOnly !== false) s += '; HttpOnly'
  if (IS_PROD)                 s += '; Secure'
  s += '; SameSite=Strict'
  s += '; Path=/'
  if (opts.maxAge != null)     s += `; Max-Age=${opts.maxAge}`
  // __Host- cookies must NOT have a Domain attribute
  if (!IS_PROD && opts.domain) s += `; Domain=${opts.domain}`
  return s
}

/** Set the two auth cookies (access + refresh) after a successful login. */
export function setAuthCookies(res, session) {
  res.setHeader('Set-Cookie', [
    buildCookie(ACCESS_COOKIE,  session.access_token,  { maxAge: 15 * 60            }),
    buildCookie(REFRESH_COOKIE, session.refresh_token, { maxAge: 7 * 24 * 60 * 60   }),
  ])
}

/**
 * Set auth cookies AND a CSRF cookie.
 * The CSRF cookie is NOT HttpOnly so JS can read it for the double-submit pattern.
 */
export function setAuthCookiesWithCsrf(res, session, csrfToken) {
  res.setHeader('Set-Cookie', [
    buildCookie(ACCESS_COOKIE,  session.access_token,  { maxAge: 15 * 60            }),
    buildCookie(REFRESH_COOKIE, session.refresh_token, { maxAge: 7 * 24 * 60 * 60   }),
    buildCookie(CSRF_COOKIE,    csrfToken,             { maxAge: 7 * 24 * 60 * 60,
                                                         httpOnly: false              }),
  ])
}

/** Expire all auth + CSRF cookies immediately. */
export function clearAuthCookies(res) {
  res.setHeader('Set-Cookie', [
    buildCookie(ACCESS_COOKIE,  '', { maxAge: 0 }),
    buildCookie(REFRESH_COOKIE, '', { maxAge: 0 }),
    buildCookie(CSRF_COOKIE,    '', { maxAge: 0, httpOnly: false }),
  ])
}
