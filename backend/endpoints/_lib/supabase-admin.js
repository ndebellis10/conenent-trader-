/**
 * Supabase admin client (service-role key).
 * NEVER expose this key to the browser.
 * Falls back to placeholder values so the module loads even when env vars
 * aren't set — actual API calls will return errors in that case.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL            || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!url || !key) {
  console.warn(
    '[supabase-admin] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. ' +
    'Add them to your Vercel environment variables.'
  )
}

export const supabaseAdmin = createClient(
  url || 'https://placeholder.supabase.co',   // prevents createClient throwing on empty string
  key || 'placeholder-key',
  {
    auth: {
      autoRefreshToken:   false,
      persistSession:     false,
      detectSessionInUrl: false,
    },
  }
)

/** True only when real credentials are present. */
export const supabaseConfigured = !!(url && key)
