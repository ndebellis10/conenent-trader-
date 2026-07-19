/**
 * Admin configuration — client-side only.
 * The email is not a secret (it just triggers the admin login flow).
 * The password lives SERVER-SIDE ONLY in api/admin.js — never in this bundle.
 * After successful admin auth, the session key is stored in useAdminStore (memory only).
 */

export const ADMIN_EMAIL = 'nickisthebesttrader@covenanttrader.app'

export function isAdminEmail(email) {
  return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
}

/** Scan localStorage for all per-user trade keys and return the emails */
export function getLocalUsers() {
  const users = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('ft-trades__')) {
      try {
        const data = JSON.parse(localStorage.getItem(key))
        const keySuffix = key.replace('ft-trades__', '')

        // Best source: email stored directly in settings (set on login)
        // Fallback: check ft-creds__ key with same suffix (same format, contains email)
        // Last resort: reconstruct by replacing first underscore with @ (common email pattern)
        let realEmail = data?.settings?.email || ''
        if (!realEmail || !realEmail.includes('@')) {
          // Try matching ft-creds__ key for same suffix
          const credRaw = localStorage.getItem('ft-creds__' + keySuffix)
          if (credRaw) {
            // Credential key exists — we can confirm this suffix is a real account
            // Reconstruct email: replace first '_' with '@' (works for most emails)
            realEmail = keySuffix.replace('_', '@')
          } else {
            realEmail = keySuffix.replace('_', '@')
          }
        }

        if (data?.trades?.length > 0 || data?.settings?.email) {
          users.push({
            storageKey:   key,
            displayEmail: keySuffix,
            email:        realEmail,
            name:         data?.settings?.name || null,
            tradeCount:   data?.trades?.length || 0,
            trades:       data?.trades        || [],
            settings:     data?.settings      || {},
          })
        }
      } catch { /* skip corrupted keys */ }
    }
  }
  return users.sort((a, b) => b.tradeCount - a.tradeCount)
}
