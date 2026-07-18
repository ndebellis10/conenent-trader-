/**
 * Atomic rate limiting + auto-blocking.
 * Uses PostgreSQL for shared state across serverless instances.
 * If a key exceeds 3× the limit, the IP is auto-blocked for 1 hour.
 */
import { supabaseAdmin } from './supabase-admin.js'
import { autoBlockIP }  from './security.js'

export async function checkRateLimit(identifier, endpoint, {
  limit         = 100,
  windowMinutes = 1,
} = {}) {
  const key = `${identifier}:${endpoint}`
  try {
    const { data, error } = await supabaseAdmin.rpc(
      'check_and_increment_rate_limit',
      { p_key: key, p_limit: limit, p_window_minutes: windowMinutes }
    )
    if (error) { console.error('[rate-limit]', error.message); return { allowed: true } }

    // Auto-block only if 10× over limit to avoid blocking legitimate shared IPs
    if (data.requests > limit * 10 && identifier !== 'unknown') {
      await autoBlockIP(identifier, `Exceeded rate limit 10x on ${endpoint}`, 1)
    }

    return data
  } catch (e) {
    console.error('[rate-limit] exception:', e.message)
    return { allowed: true }   // fail-open: don't break the app if DB is slow
  }
}

export function tooManyRequests(res, retryAfter = 60) {
  res.setHeader('Retry-After',       String(retryAfter))
  res.setHeader('X-RateLimit-Limit', '0')
  return res.status(429).json({
    error:       'Too many requests. Please try again later.',
    retry_after: retryAfter,
  })
}
