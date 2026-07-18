/**
 * Local-mode credential storage.
 * Used only when Supabase is not configured.
 * Passwords are hashed with PBKDF2-SHA-256 (100 000 iterations) via Web Crypto.
 * Hashes are stored in localStorage — never the plaintext password.
 */

function credKey(email) {
  return 'ft-creds__' + email.toLowerCase().replace(/[^a-z0-9._-]/g, '_')
}

function tradeStorageKey(email) {
  return 'ft-trades__' + email.toLowerCase().replace(/[^a-z0-9._-]/g, '_')
}

async function pbkdf2Hash(password, salt) {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  return Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Hash and persist credentials for a new local-mode account. */
export async function storeLocalCredential(email, password) {
  const hash = await pbkdf2Hash(password, email.toLowerCase())
  localStorage.setItem(credKey(email), JSON.stringify({ hash }))
}

/**
 * Check a login attempt against stored credentials.
 * Returns: 'ok' | 'wrong-password' | 'no-account'
 */
export async function validateLocalCredential(email, password) {
  const raw = localStorage.getItem(credKey(email))
  if (!raw) return 'no-account'
  try {
    const { hash } = JSON.parse(raw)
    const attempt = await pbkdf2Hash(password, email.toLowerCase())
    return attempt === hash ? 'ok' : 'wrong-password'
  } catch {
    return 'no-account'
  }
}

/** True if a credential hash exists for this email. */
export function hasLocalCredential(email) {
  return !!localStorage.getItem(credKey(email))
}

/**
 * True if this email has an existing localStorage entry on this device.
 * Used for migration: accounts created before credential storage was added.
 * The key's existence alone is enough — the user logged in here before.
 */
export function hasLocalTradeData(email) {
  return localStorage.getItem(tradeStorageKey(email)) !== null
}
 
