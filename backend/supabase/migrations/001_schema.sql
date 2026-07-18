-- ═══════════════════════════════════════════════════════════════
-- Covenant Trader — Supabase Schema with Full RLS
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- PROFILES  (extends auth.users 1-to-1)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id               UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name     TEXT,
  starting_balance DECIMAL(20,2)  DEFAULT 10000.00,
  currency         TEXT           DEFAULT 'USD',
  risk_per_trade   DECIMAL(5,2)   DEFAULT 1.00,
  preferences      JSONB          DEFAULT '{}',
  created_at       TIMESTAMPTZ    DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ    DEFAULT NOW() NOT NULL,
  deleted_at       TIMESTAMPTZ
);

-- Auto-create profile on new Supabase auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- TRADES
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trades (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date             DATE        NOT NULL,
  symbol           TEXT        NOT NULL,
  direction        TEXT        NOT NULL CHECK (direction IN ('Long', 'Short')),
  asset_class      TEXT        DEFAULT 'Futures',
  timeframe        TEXT,
  entry_price      DECIMAL(20,8),
  exit_price       DECIMAL(20,8),
  stop_loss        DECIMAL(20,8),
  take_profit      DECIMAL(20,8),
  position_size    DECIMAL(20,8),
  commission       DECIMAL(20,2)  DEFAULT 0,
  -- Server-calculated PnL (client values are ignored / overwritten)
  gross_pnl        DECIMAL(20,2),
  net_pnl          DECIMAL(20,2),
  pct_pnl          DECIMAL(10,4),
  result           TEXT           CHECK (result IN ('Win', 'Loss', 'Breakeven')),
  -- Psychology
  followed_plan    TEXT           CHECK (followed_plan    IN ('Yes', 'Partially', 'No')),
  moved_stop       TEXT           CHECK (moved_stop       IN ('Yes', 'No')),
  sized_correctly  TEXT           CHECK (sized_correctly  IN ('Yes', 'No')),
  pre_trade        TEXT,
  post_trade       TEXT,
  entry_quality    INT            CHECK (entry_quality  BETWEEN 1 AND 10),
  exit_quality     INT            CHECK (exit_quality   BETWEEN 1 AND 10),
  faith_rating     INT            CHECK (faith_rating   BETWEEN 0 AND 5),
  -- Notes (sanitised server-side)
  strategy_name    TEXT,
  trade_notes      TEXT,
  scripture        TEXT,
  prayer           TEXT,
  gratitude        TEXT,
  mindset_notes    TEXT,
  tags             TEXT[],
  -- Timestamps
  created_at       TIMESTAMPTZ    DEFAULT NOW() NOT NULL,
  updated_at       TIMESTAMPTZ    DEFAULT NOW() NOT NULL,
  deleted_at       TIMESTAMPTZ    -- soft-delete
);

-- ────────────────────────────────────────────────────────────
-- GOALS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text        TEXT NOT NULL,
  sort_order  INT  DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.goal_completions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id    UUID REFERENCES public.goals(id)   ON DELETE CASCADE NOT NULL,
  user_id    UUID REFERENCES auth.users(id)      ON DELETE CASCADE NOT NULL,
  date       DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (goal_id, date)
);

-- ────────────────────────────────────────────────────────────
-- FAITH JOURNAL
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date       DATE DEFAULT CURRENT_DATE,
  content    TEXT,
  mood       TEXT,
  scripture  TEXT,
  prayer     TEXT,
  gratitude  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────
-- PLAYBOOK
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.playbook_strategies (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  rules       TEXT,
  tags        TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at  TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────
-- LOGIN ATTEMPTS  (lockout tracking — no user access)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  success    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- RATE LIMITS  (atomic, per-IP or per-user per endpoint)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id           TEXT PRIMARY KEY,   -- '{ip_or_uid}:{endpoint}'
  requests     INT          DEFAULT 1,
  window_start TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- AUDIT LOGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  resource    TEXT,
  resource_id UUID,
  ip_address  TEXT,
  user_agent  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ════════════════════════════════════════════════════════════
-- updated_at TRIGGER (applied to every mutable table)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','trades','goals','journal_entries','playbook_strategies']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON public.%I', tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', tbl);
  END LOOP;
END;
$$;

-- ════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY — enabled on EVERY table, no exceptions
-- ════════════════════════════════════════════════════════════

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- trades
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trades_all_own" ON public.trades;
CREATE POLICY "trades_all_own" ON public.trades FOR ALL USING (auth.uid() = user_id);

-- goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goals_all_own" ON public.goals;
CREATE POLICY "goals_all_own" ON public.goals FOR ALL USING (auth.uid() = user_id);

-- goal_completions
ALTER TABLE public.goal_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "completions_all_own" ON public.goal_completions;
CREATE POLICY "completions_all_own" ON public.goal_completions FOR ALL USING (auth.uid() = user_id);

-- journal_entries
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "journal_all_own" ON public.journal_entries;
CREATE POLICY "journal_all_own" ON public.journal_entries FOR ALL USING (auth.uid() = user_id);

-- playbook_strategies
ALTER TABLE public.playbook_strategies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "playbook_all_own" ON public.playbook_strategies;
CREATE POLICY "playbook_all_own" ON public.playbook_strategies FOR ALL USING (auth.uid() = user_id);

-- audit_logs: users can only read their own; only service_role can write
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_select_own"   ON public.audit_logs;
DROP POLICY IF EXISTS "audit_service_role" ON public.audit_logs;
CREATE POLICY "audit_select_own"   ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audit_service_role" ON public.audit_logs FOR ALL    USING (auth.role() = 'service_role');

-- login_attempts: service_role only
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_attempts_service" ON public.login_attempts;
CREATE POLICY "login_attempts_service" ON public.login_attempts FOR ALL USING (auth.role() = 'service_role');

-- rate_limits: service_role only
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limits_service" ON public.rate_limits;
CREATE POLICY "rate_limits_service" ON public.rate_limits FOR ALL USING (auth.role() = 'service_role');

-- ════════════════════════════════════════════════════════════
-- ATOMIC RATE-LIMIT FUNCTION  (called from serverless API)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_key            TEXT,
  p_limit          INT,
  p_window_minutes INT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_now     TIMESTAMPTZ := NOW();
  v_cutoff  TIMESTAMPTZ := v_now - (p_window_minutes || ' minutes')::INTERVAL;
  v_reqs    INT;
BEGIN
  INSERT INTO rate_limits (id, requests, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (id) DO UPDATE SET
    requests     = CASE WHEN rate_limits.window_start < v_cutoff THEN 1
                        ELSE rate_limits.requests + 1 END,
    window_start = CASE WHEN rate_limits.window_start < v_cutoff THEN v_now
                        ELSE rate_limits.window_start END,
    updated_at   = v_now
  RETURNING requests INTO v_reqs;

  RETURN jsonb_build_object(
    'allowed',     v_reqs <= p_limit,
    'requests',    v_reqs,
    'limit',       p_limit,
    'retry_after', CASE WHEN v_reqs > p_limit THEN p_window_minutes * 60 ELSE 0 END
  );
END;
$$;

-- ════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_trades_user_date   ON public.trades(user_id, date DESC)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_goals_user         ON public.goals(user_id)               WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_completions_user   ON public.goal_completions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_journal_user       ON public.journal_entries(user_id)     WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_playbook_user      ON public.playbook_strategies(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_login_attempts_em  ON public.login_attempts(email,      created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip  ON public.login_attempts(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user         ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_id     ON public.rate_limits(id, updated_at DESC);

-- ════════════════════════════════════════════════════════════
-- Supabase Auth settings (configure in Dashboard):
--   Authentication → Settings:
--     JWT expiry  → 900   (15 minutes)
--     Refresh token rotation  → ON
--     Reuse interval          → 0
--   Password policy → minimum 12 chars, require mixed case + numbers + symbols
-- ════════════════════════════════════════════════════════════
