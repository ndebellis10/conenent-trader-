/**
 * Secure fetch wrapper for all /api/* calls.
 *
 * - Always sends credentials: 'include' (HttpOnly auth cookies)
 * - Attaches X-CSRF-Token header to all state-changing requests
 * - CSRF token stored in memory only — never localStorage / sessionStorage
 * - Throws ApiError on non-2xx responses
 */

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name   = 'ApiError'
    this.status = status
    this.data   = data
  }
}

/* ── In-memory CSRF token (never persisted to storage) ── */
let _csrf = null

export function setCsrfToken(t) { _csrf = t }
export function clearCsrfToken() { _csrf = null }
export function getCsrfToken()   { return _csrf }

/** Fetch a fresh CSRF token from the server and store in memory. */
export async function refreshCsrfToken() {
  try {
    const r = await fetch('/api/auth/csrf', { credentials: 'include' })
    if (r.ok) {
      const { token } = await r.json()
      _csrf = token
    }
  } catch { /* non-fatal */ }
}

/* ── Core request function ───────────────────────────────── */
async function request(method, path, body = null) {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  const headers  = { 'Content-Type': 'application/json' }

  if (mutating && _csrf) headers['X-CSRF-Token'] = _csrf

  const init = {
    method,
    credentials: 'include',
    headers,
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  }

  const res  = await fetch(`/api${path}`, init)
  const data = await res.json().catch(() => null)

  // If server rotated our CSRF token (e.g. after session refresh), update it
  const newCsrf = res.headers.get('X-New-CSRF-Token')
  if (newCsrf) _csrf = newCsrf

  if (!res.ok) throw new ApiError(data?.error || 'Request failed', res.status, data)
  return data
}

/* ── Auth ─────────────────────────────────────────────────── */
export const authApi = {
  me:         ()                                                  => request('GET',  '/auth/me'),
  login:      (email, password, captchaToken)                     => request('POST', '/auth/login',    { email, password, captchaToken }),
  register:   (email, password, displayName, captchaToken)        => request('POST', '/auth/register', { email, password, displayName, captchaToken }),
  logout:     ()                                                  => request('POST', '/auth/logout',   {}),
  resetPassword: (email)                                          => request('POST', '/auth/reset-password', { email }),
  mfaSetup:   ()                                                  => request('POST', '/auth/mfa-setup',  {}),
  mfaVerify:  (factor_id, code, challenge_id)                     => request('POST', '/auth/mfa-verify', { factor_id, code, challenge_id }),
  getCsrf:    ()                                                  => fetch('/api/auth/csrf', { credentials: 'include' }).then(r => r.json()),
}

/* ── Trades ───────────────────────────────────────────────── */
export const tradesApi = {
  list:   ()         => request('GET',    '/trades'),
  create: (trade)    => request('POST',   '/trades', trade),
  get:    (id)       => request('GET',    `/trades/${id}`),
  update: (id, data) => request('PATCH',  `/trades/${id}`, data),
  delete: (id)       => request('DELETE', `/trades/${id}`),
}

/* ── Goals ────────────────────────────────────────────────── */
export const goalsApi = {
  list:             ()           => request('GET',    '/goals'),
  create:           (text)       => request('POST',   '/goals', { text }),
  update:           (id, data)   => request('PATCH',  `/goals/${id}`, data),
  delete:           (id)         => request('DELETE', `/goals/${id}`),
  toggleCompletion: (id, date)   => request('POST',   `/goals/${id}/complete`, { date }),
}

/* ── User ─────────────────────────────────────────────────── */
export const userApi = {
  updateProfile: (data)          => request('PATCH', '/user/profile', data),
  exportData:    (format = 'json') => fetch(`/api/user/export?format=${format}`, { credentials: 'include' }),
  deleteAccount: (confirmation)  => request('POST',  '/user/delete', { confirmation }),
}

/* ── Course progress ──────────────────────────────────────── */
export const courseApi = {
  load:         ()          => request('GET',  '/user/course-progress')
                                 .then(d => ({ completed: d?.completed || [], notes: d?.notes || {} })),
  saveProgress: (completed) => request('POST', '/user/course-progress', { completed }),
  saveNotes:    (notes)     => request('POST', '/user/course-progress', { notes }),
}

/* ── Chart AI analysis ────────────────────────────────────── */
export const chartApi = {
  analyze: (image) => request('POST', '/analyze-chart', { image }),
}

/* ── Ask Alan ────────────────────────────────────────────── */
async function faithFetch(body) {
  const res  = await fetch('/api/faith-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Alan costs real money per call — the endpoint requires a signed-in user,
    // so the auth cookie has to travel with the request.
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || 'Ask Alan request failed')
  return data
}

export const faithAiApi = {
  chat: (message, history, trades, stats, goals, completions, settings, playbook, image, lessonContext, courseProgress) => {
    const today = new Date().toISOString().split('T')[0]
    const todayCompletions = completions ? { [today]: completions[today] || [] } : {}
    return faithFetch({
      type: 'chat', message,
      history: history.slice(-6),
      trades: trades.slice(0, 50),
      stats, goals, completions: todayCompletions, settings,
      playbook: (playbook || []).slice(0, 10),
      image: image || undefined,
      lessonContext: lessonContext || undefined,
      courseProgress: courseProgress || undefined,
    }).then(d => d.reply)
  },
  coachTrade:     (trade, recentTrades, userId)     => faithFetch({ type: 'coach',   trade, recentTrades, userId }),
  monthlySummary: (trades)                          => faithFetch({ type: 'summary', trades }),
}
