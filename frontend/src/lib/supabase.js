/**
 * Client-side Supabase instance.
 *
 * Auth is managed ENTIRELY server-side via HttpOnly cookies.
 * This client is intentionally configured to NEVER touch localStorage
 * or sessionStorage — zero token exposure in the browser.
 *
 * Use it only for Realtime subscriptions if needed.
 * For all auth and data calls, use src/lib/api.js instead.
 */
import { createClient } from '@supabase/supabase-js'

const url     = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Null storage adapter — prevents any token storage in the browser
const noStorage = {
  getItem:    () => null,
  setItem:    () => {},
  removeItem: () => {},
}

/** True only when real credentials are present — gates leaderboard sync */
export const supabaseConfigured = !!(url && anonKey)

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession:    false,        // never persist
      autoRefreshToken:  false,        // server handles refresh
      detectSessionInUrl: false,       // block ?access_token=... URL exploits
      storage:           noStorage,
    },
  }
)
