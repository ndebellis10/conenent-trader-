/**
 * AuthContext — global auth state.
 *
 * Primary:  Supabase Auth via /api/auth/* (HttpOnly cookies, CSRF tokens)
 * Fallback: simple local session stored in memory when backend isn't configured.
 *           This lets the app work while Supabase is being set up.
 */
import { createContext, useContext, useState,
         useEffect, useCallback, useRef }    from 'react'
import { Navigate, useLocation }             from 'react-router-dom'
import { useAuthStore }                      from '../store/authStore'
import { useTradeStore }                     from '../store/tradeStore'
import { useGoalStore }                      from '../store/goalStore'
import { ADMIN_EMAIL, isAdminEmail } from '../lib/adminConfig'
import { useAdminStore } from '../store/adminStore'
import { authApi, ApiError,
         setCsrfToken, clearCsrfToken,
         refreshCsrfToken }                  from '../lib/api'
import { loadUserStores, clearUserStores,
         setActiveEmail, tradeKey, goalKey } from '../lib/userStorage'
import { setSyncMode, fetchServerData,
         setCurrentUser }                    from '../lib/syncManager'
import { syncLeaderboard }                  from '../lib/leaderboardApi'
import { storeLocalCredential, validateLocalCredential,
         hasLocalCredential, hasLocalTradeData }  from '../lib/localAuth'

/**
 * Explicitly flush the current store contents to localStorage under the
 * user's email key before we clear the stores on logout.
 * This is a belt-and-suspenders save on top of the auto-subscriber.
 */
function flushToLocalStorage(email) {
  try {
    const ts = useTradeStore.getState()
    localStorage.setItem(tradeKey(email), JSON.stringify({
      trades: ts.trades, journalEntries: ts.journalEntries,
      playbook: ts.playbook, settings: ts.settings,
    }))
  } catch {}
  try {
    const gs = useGoalStore.getState()
    localStorage.setItem(goalKey(email), JSON.stringify({
      goals: gs.goals, completions: gs.completions,
    }))
  } catch {}
}

/**
 * Load data for a user, enable auto-save under their email key,
 * and (in secure mode) populate stores from the server.
 */
async function activateUser(email, mode, displayName) {
  setSyncMode(mode)
  setActiveEmail(email)
  setCurrentUser(email, displayName)

  if (mode === 'secure') {
    loadUserStores(email)
    const serverData = await fetchServerData()
    if (serverData) {
      if (serverData.trades !== null) {
        // Merge server trades with local trades — never wipe local-only trades
        const localTrades = useTradeStore.getState().trades
        const serverIds = new Set(serverData.trades.map(t => t.id))
        const localOnly = localTrades.filter(t => !serverIds.has(t.id))
        useTradeStore.setState({ trades: [...serverData.trades, ...localOnly] })
      }
      if (serverData.goals !== null && serverData.completions !== null)
        useGoalStore.setState({ goals: serverData.goals, completions: serverData.completions })
    }
  } else {
    loadUserStores(email)
  }

  // Persist the real email into settings so admin can find this account cross-device
  try {
    const st = useTradeStore.getState()
    if (!st.settings?.email) {
      useTradeStore.setState(s => ({ settings: { ...s.settings, email } }))
    }
  } catch {}

  // Sync leaderboard on every login so dashboard → leaderboard stays in sync
  try {
    const { trades, settings } = useTradeStore.getState()
    const name = settings?.name || displayName || email?.split('@')[0]
    syncLeaderboard(name, email, trades).catch(() => {})
  } catch {}
}

/** Flush + wipe in-memory stores and disable auto-save. Data stays in localStorage. */
function deactivateUser(email) {
  if (email) flushToLocalStorage(email)
  setSyncMode('local')
  setActiveEmail(null)
  setCurrentUser(null, null)
  clearUserStores()
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined) // undefined = checking
  const [loading, setLoading] = useState(true)
  const [mode,    setMode]    = useState('secure')  // 'secure' | 'local'
  const [isAdmin, setIsAdmin] = useState(false)
  const bootedRef             = useRef(false)

  // Also read the old localStorage auth store as a fallback signal
  const oldAuth = useAuthStore(s => s.currentUser)

  const bootstrap = useCallback(async () => {
    try {
      const data = await authApi.me()
      setUser(data)
      setMode('secure')
      await refreshCsrfToken()
      await activateUser(data.email, 'secure', data.display_name)
    } catch (e) {
      // If backend is not configured (503) or truly unauthenticated (401),
      // fall back to reading the old authStore.
      const code = e instanceof ApiError ? e.data?.code : null
      if (code === 'SUPABASE_NOT_CONFIGURED') {
        setMode('local')
        // Never auto-restore admin from stored credentials.
        // Admin access requires an explicit login every time — no exceptions.
        // If the stored email is the admin email, treat the session as logged-out
        // so they must enter the password again.
        if (oldAuth?.email && isAdminEmail(oldAuth.email)) {
          setUser(null)
          useAuthStore.getState().clearUser()
          useAdminStore.getState().setSessionKey(null)
        } else {
          const localUser = oldAuth ? { ...oldAuth, id: 'local', local: true } : null
          setUser(localUser)
          if (oldAuth?.email) await activateUser(oldAuth.email, 'local', oldAuth.name)
        }
        setIsAdmin(false)
      } else {
        setUser(null)
        if (oldAuth?.email) await activateUser(oldAuth.email, 'local', oldAuth.name)
      }
      clearCsrfToken()
    } finally {
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!bootedRef.current) { bootedRef.current = true; bootstrap() }
  }, [bootstrap])

  /* ── Login ── */
  const login = useCallback(async (email, password, captchaToken) => {
    // ── Admin check — verified SERVER-SIDE so password never lives in the JS bundle ──
    if (isAdminEmail(email)) {
      try {
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include',
        })
        const data = await res.json()
        if (data.admin) {
          // Store the session key in memory (Zustand) — never in localStorage/bundle
          if (data.sessionKey) useAdminStore.getState().setSessionKey(data.sessionKey)
          const adminUser = { id: 'admin', email, display_name: 'Admin', local: true, admin: true }
          setUser(adminUser)
          setMode('local')
          setIsAdmin(true)
          useAuthStore.getState().setUser({ email, name: 'Admin' })
          return { ok: true }
        }
      } catch { /* fall through */ }
      return { ok: false, error: 'Invalid admin credentials.' }
    }

    try {
      const { user: u, csrf } = await authApi.login(email, password, captchaToken)
      if (csrf) setCsrfToken(csrf)
      setUser(u)
      setMode('secure')
      setIsAdmin(false)
      await activateUser(u.email, 'secure', u.display_name)
      return { ok: true }
    } catch (e) {
      const code = e instanceof ApiError ? e.data?.code : null

      // Backend not configured — validate against locally stored credential hash
      if (code === 'SUPABASE_NOT_CONFIGURED' || e.status === 503) {
        const result = await validateLocalCredential(email, password)

        if (result === 'wrong-password') {
          return { ok: false, error: 'Invalid email or password.' }
        }

        if (result === 'no-account') {
          // Migration path: account existed before credential storage was added.
          // If they have trade data on this device, accept this login and lock in
          // the password they used so future logins are properly validated.
          if (hasLocalTradeData(email)) {
            await storeLocalCredential(email, password)
          } else {
            return { ok: false, error: 'No account found with this email. Please register first.' }
          }
        }

        const displayName = email.split('@')[0]
        const fakeUser = { id: 'local-' + Date.now(), email, display_name: displayName, local: true }
        useAuthStore.getState().setUser({ email, name: displayName })
        setUser(fakeUser)
        setMode('local')
        setIsAdmin(false) // regular user login must never inherit a previous admin state
        await activateUser(email, 'local', displayName)
        return { ok: true }
      }

      return { ok: false, error: e instanceof ApiError ? e.message : 'Login failed. Please try again.' }
    }
  }, [])

  /* ── Register ── */
  const register = useCallback(async (email, password, displayName, captchaToken) => {
    // The admin email can never be used to register a regular account
    if (isAdminEmail(email)) {
      return { ok: false, error: 'This email address is not available for registration.' }
    }

    try {
      const { user: u, csrf } = await authApi.register(email, password, displayName, captchaToken)
      if (csrf) setCsrfToken(csrf)
      setUser(u)
      setMode('secure')
      await activateUser(u.email, 'secure', u.display_name || displayName)
      return { ok: true }
    } catch (e) {
      const code = e instanceof ApiError ? e.data?.code : null

      if (code === 'SUPABASE_NOT_CONFIGURED' || e.status === 503) {
        // Block duplicate registrations
        if (hasLocalCredential(email) || hasLocalTradeData(email)) {
          return { ok: false, error: 'An account with this email already exists. Please log in instead.' }
        }

        // Store hashed password so future logins are validated
        await storeLocalCredential(email, password)

        const fakeUser = { id: 'local-' + Date.now(), email, display_name: displayName, local: true }
        useAuthStore.getState().setUser({ email, name: displayName })
        setUser(fakeUser)
        setMode('local')
        await activateUser(email, 'local', displayName)
        return { ok: true }
      }

      return { ok: false, error: e instanceof ApiError ? e.message : 'Registration failed. Please try again.' }
    }
  }, [])

  /* ── Logout ── */
  const logout = useCallback(async () => {
    if (mode === 'secure') {
      await authApi.logout().catch(() => {})
    }
    clearCsrfToken()
    const currentEmail = user?.email ?? null
    useAuthStore.getState().clearUser()
    useAdminStore.getState().setSessionKey(null) // clear persisted session key on logout
    deactivateUser(currentEmail)
    setUser(null)
    setMode('secure')
    setIsAdmin(false)
  }, [mode, user])

  return (
    <AuthContext.Provider value={{
      user, loading, mode, isAdmin, login, logout, register, refreshUser: bootstrap,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/* ── Route guard ── */
export function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const oldAuth           = useAuthStore(s => s.currentUser)
  const location          = useLocation()

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#1A1A1A',
      }}>
        <div style={{ textAlign: 'center' }}>
          <img
            src="/landing-logo.webp"
            alt="Covenant Trader"
            width={72}
            height={72}
            style={{ borderRadius: 16, marginBottom: 14, boxShadow: '0 8px 30px rgba(59,130,246,0.35)', display: 'inline-block' }}
          />
          <div style={{ color: '#444', fontSize: '0.82rem' }}>Loading…</div>
        </div>
      </div>
    )
  }

  // Accept new Supabase auth OR old localStorage auth
  const isAuthed = !!user || !!oldAuth
  if (!isAuthed) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

/* ── Admin-only route guard ── */
export function RequireAdmin({ children }) {
  const { isAdmin, loading } = useAuth()
  if (loading) return null
  if (!isAdmin) return <Navigate to="/app" replace />
  return children
}
