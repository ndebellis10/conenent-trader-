-- ═══════════════════════════════════════════════════════════════
-- Migration 003 — Community chat + voice signaling
-- Replaces the former Firestore collections `community` and
-- `voice_signals`. Accessed only via the service-role key in
-- api/community.js and api/signal.js, so RLS denies everyone else.
-- Run AFTER 002_security.sql.
-- ═══════════════════════════════════════════════════════════════

-- ── Community chat ───────────────────────────────────────────
-- Persistent multi-channel chat messages.
CREATE TABLE IF NOT EXISTS public.community_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel       TEXT        NOT NULL DEFAULT 'general',
  text          TEXT        NOT NULL,
  username      TEXT        NOT NULL,
  user_id       TEXT        DEFAULT '',
  created_at_ms BIGINT      NOT NULL,             -- epoch ms; drives `since` delta polling
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "community_messages_service" ON public.community_messages;
CREATE POLICY "community_messages_service" ON public.community_messages
  FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_community_channel_time
  ON public.community_messages(channel, created_at_ms DESC);

-- ── Voice signaling ──────────────────────────────────────────
-- Ephemeral WebRTC signaling (join/leave/heartbeat/offer/answer).
-- Rows live ~30s; the endpoint best-effort purges expired rows on read.
CREATE TABLE IF NOT EXISTS public.voice_signals (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id       TEXT        NOT NULL,
  from_user_id  TEXT        NOT NULL,
  from_username TEXT        DEFAULT '',
  to_user_id    TEXT        DEFAULT '',           -- '' = broadcast
  type          TEXT        NOT NULL,             -- join|leave|heartbeat|offer|answer
  data          TEXT        DEFAULT '',           -- SDP / candidate payload (can be large)
  created_at_ms BIGINT      NOT NULL
);
ALTER TABLE public.voice_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voice_signals_service" ON public.voice_signals;
CREATE POLICY "voice_signals_service" ON public.voice_signals
  FOR ALL USING (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_voice_room_time
  ON public.voice_signals(room_id, created_at_ms DESC);

-- ── Optional periodic cleanup (via pg_cron or a scheduled function) ──
-- DELETE FROM public.voice_signals WHERE created_at_ms < (extract(epoch from now())*1000 - 60000);
