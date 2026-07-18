-- ═══════════════════════════════════════════════════════════════
-- Migration 002 — Extra security tables
-- Run AFTER 001_schema.sql
-- ═══════════════════════════════════════════════════════════════

-- ── Blocked IPs ──────────────────────────────────────────────
-- Auto-populated when a key exceeds 3× the rate-limit ceiling.
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  ip_address   TEXT        PRIMARY KEY,
  reason       TEXT        NOT NULL,
  block_until  TIMESTAMPTZ,                   -- NULL = permanent
  auto_blocked BOOLEAN     DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocked_ips_service" ON public.blocked_ips;
CREATE POLICY "blocked_ips_service" ON public.blocked_ips
  FOR ALL USING (auth.role() = 'service_role');

-- ── CSRF tokens ───────────────────────────────────────────────
-- Stateless HMAC tokens mean no DB storage needed — this table
-- is kept only for revocation if needed in future.

-- ── Clean-up cron (run via pg_cron or Supabase scheduled function) ──
-- Purge login attempts older than 30 days
-- DELETE FROM public.login_attempts WHERE created_at < NOW() - INTERVAL '30 days';
-- Purge rate_limits older than 2 hours
-- DELETE FROM public.rate_limits WHERE updated_at < NOW() - INTERVAL '2 hours';
-- Unblock auto-blocked IPs past their block_until time
-- DELETE FROM public.blocked_ips WHERE auto_blocked = TRUE AND block_until < NOW();

-- Index for blocked IP lookups
CREATE INDEX IF NOT EXISTS idx_blocked_ips ON public.blocked_ips(ip_address, block_until);
