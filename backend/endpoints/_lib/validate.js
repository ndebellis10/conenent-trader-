/**
 * Server-side input validation and sanitisation.
 * All user input goes through here — NEVER trust the client.
 */
import { z } from 'zod'

/* ── Generic validator ────────────────────────────────────────── */
export function validateBody(schema, body) {
  const result = schema.safeParse(body)
  if (result.success) return { data: result.data, error: null }
  return {
    data: null,
    error: {
      message: 'Validation failed',
      issues: result.error.errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message,
      })),
    },
  }
}

/* ── String sanitiser (strips HTML / JS injection vectors) ────── */
export function sanitize(str, maxLen = 5000) {
  if (typeof str !== 'string') return str
  return str
    .replace(/<[^>]*>/g, '')           // strip all HTML tags
    .replace(/javascript\s*:/gi, '')   // block js: protocol
    .replace(/on\w+\s*=/gi, '')        // remove inline event handlers
    .replace(/data\s*:/gi, '')         // block data: URIs
    .trim()
    .slice(0, maxLen)
}

/* ── Shared field transformers ────────────────────────────────── */
const safeStr  = (max) => z.string().max(max).transform(s => sanitize(s, max))
const optStr   = (max) => safeStr(max).optional()

/* ── Auth schemas ─────────────────────────────────────────────── */
export const loginSchema = z.object({
  email:        z.string().email('Invalid email').toLowerCase().trim().max(254),
  password:     z.string().min(1).max(128),
  captchaToken: z.string().nullish(),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase().trim().max(254),
  password: z.string()
    .min(8,   'Password must be at least 8 characters')
    .max(128, 'Password too long'),
  displayName:  z.string().min(2, 'Name too short').max(50).trim(),
  captchaToken: z.string().nullish(),
})

export const passwordResetSchema = z.object({
  email:        z.string().email().toLowerCase().trim().max(254),
  captchaToken: z.string().optional(),
})

/* ── Trade schema ─────────────────────────────────────────────── */
export const tradeSchema = z.object({
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (YYYY-MM-DD)'),
  symbol:           z.string().min(1).max(20).transform(s => s.toUpperCase().trim()),
  direction:        z.enum(['Long', 'Short']),
  asset_class:      z.string().max(50).optional().default('Futures'),
  timeframe:        z.enum(['Scalp', 'Day Trade', 'Swing', 'Position']).optional(),
  // Prices are optional — CSV imports and manual Win/Loss trades may omit them
  entry_price:      z.coerce.number().positive().max(999_999_999).optional().nullable(),
  exit_price:       z.coerce.number().positive().max(999_999_999).optional().nullable(),
  stop_loss:        z.coerce.number().positive().max(999_999_999).optional().nullable(),
  take_profit:      z.coerce.number().positive().max(999_999_999).optional().nullable(),
  position_size:    z.coerce.number().positive().max(100_000).optional().nullable(),
  commission:       z.coerce.number().min(0).max(100_000).optional().default(0),
  // Client-provided PnL — used when prices are missing (CSV imports, manual results)
  net_pnl:          z.coerce.number().optional().nullable(),
  gross_pnl:        z.coerce.number().optional().nullable(),
  pct_pnl:          z.coerce.number().optional().nullable(),
  result:           z.enum(['Win', 'Loss', 'Breakeven']).optional().nullable(),
  followed_plan:    z.enum(['Yes', 'Partially', 'No']).optional(),
  moved_stop:       z.enum(['Yes', 'No']).optional(),
  sized_correctly:  z.enum(['Yes', 'No']).optional(),
  pre_trade:        z.string().max(50).optional(),
  post_trade:       z.string().max(50).optional(),
  entry_quality:    z.coerce.number().int().min(1).max(10).optional(),
  exit_quality:     z.coerce.number().int().min(1).max(10).optional(),
  faith_rating:     z.coerce.number().int().min(0).max(5).optional(),
  strategy_name:    optStr(100),
  trade_notes:      optStr(5000),
  scripture:        optStr(1000),
  prayer:           optStr(5000),
  gratitude:        optStr(2000),
  mindset_notes:    optStr(5000),
})

/* ── Goal schema ──────────────────────────────────────────────── */
export const goalSchema = z.object({
  text:       safeStr(500),
  sort_order: z.coerce.number().int().optional(),
})

/* ── Profile schema ───────────────────────────────────────────── */
export const profileSchema = z.object({
  display_name:     z.string().min(2).max(50).trim().optional(),
  starting_balance: z.coerce.number().positive().max(100_000_000).optional(),
  currency:         z.enum(['USD','EUR','GBP','JPY','CAD','AUD']).optional(),
  risk_per_trade:   z.coerce.number().min(0.01).max(100).optional(),
})

/* ── UUID validator ───────────────────────────────────────────── */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function isValidUUID(id) {
  return typeof id === 'string' && UUID_RE.test(id)
}
