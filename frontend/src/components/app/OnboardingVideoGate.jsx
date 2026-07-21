import { useState, useEffect, useRef } from 'react'
import { Check, Play, Lock, ArrowRight } from 'lucide-react'
import { useTradeStore } from '../../store/tradeStore'
import { COURSE_MODULES } from '../../lib/courseOutline'
import { markStartHereWatched } from '../../lib/courseProgress'
import Logo from '../Logo'

const BLUE = '#3B82F6'

/* Mandatory onboarding videos, shown after the intake form and before the app.
   The four Start Here lessons play in order; the trader has to get through each
   one before "Enter the App" unlocks. Completion is stored on the account so a
   refresh can't skip it.

   "Watched" is detected via YouTube's postMessage protocol (video reached its
   end). A per-video fallback timer also unlocks Next, so a detection miss or a
   slow embed can never trap anyone. */

// Unlock "Next" once this fraction of the video has been watched
const WATCH_THRESHOLD = 0.9
// Safety only: if YouTube never reports progress (broken/blocked embed), unlock
// after this long so a detection failure can't trap anyone. Doesn't apply once
// real progress is coming in — then WATCH_THRESHOLD governs.
const NO_PROGRESS_FALLBACK_MS = 45000

export const onboardingVideosKey = email =>
  `ct-intake-videos__${String(email || 'guest').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`

export function isOnboardingVideosComplete(settings, email) {
  if (settings?.onboardingVideosComplete) return true
  try { return localStorage.getItem(onboardingVideosKey(email)) === '1' } catch { return false }
}

function ytId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{6,})/)
  return m ? m[1] : null
}

const START_HERE = (COURSE_MODULES.find(m => m.slug === 'start-here')?.lessons || [])

export default function OnboardingVideoGate({ email, onComplete }) {
  const updateSettings = useTradeStore(s => s.updateSettings)
  const [idx, setIdx] = useState(0)
  const [canAdvance, setCanAdvance] = useState(false)
  const [watchedPct, setWatchedPct] = useState(0)
  const frameRef = useRef(null)
  const gotProgress = useRef(false)

  const lessons = START_HERE
  const current = lessons[idx]
  const vid = ytId(current?.video)
  const isLast = idx >= lessons.length - 1

  // Reset for each video, then track watch progress via YouTube's postMessage
  useEffect(() => {
    setCanAdvance(false)
    setWatchedPct(0)
    gotProgress.current = false

    // Only unlocks if progress never arrives (broken embed) — not a shortcut
    const fallback = setTimeout(() => {
      if (!gotProgress.current) setCanAdvance(true)
    }, NO_PROGRESS_FALLBACK_MS)

    // YouTube streams currentTime/duration once we're "listening". Unlock Next
    // when enough of the video has played (or it ends outright).
    const onMsg = e => {
      try {
        if (!/(^|\.)youtube\.com$/.test(new URL(e.origin).host)) return
      } catch { return }
      let data = e.data
      try { data = typeof data === 'string' ? JSON.parse(data) : data } catch { return }
      const info = data?.info
      const state = info?.playerState ?? (data?.event === 'onStateChange' ? data.info : undefined)
      if (state === 0) { setWatchedPct(100); setCanAdvance(true); return }  // ended
      const cur = Number(info?.currentTime)
      const dur = Number(info?.duration)
      if (dur > 0 && Number.isFinite(cur)) {
        gotProgress.current = true
        const frac = Math.min(1, cur / dur)
        setWatchedPct(Math.round(frac * 100))
        if (frac >= WATCH_THRESHOLD) setCanAdvance(true)
      }
    }
    window.addEventListener('message', onMsg)

    // Handshake so YouTube starts posting state events to us
    const hs = setTimeout(() => {
      try {
        frameRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*')
      } catch { /* cross-origin timing — the fallback still covers us */ }
    }, 1200)

    return () => { clearTimeout(fallback); clearTimeout(hs); window.removeEventListener('message', onMsg) }
  }, [idx])

  const next = () => {
    if (!canAdvance) return
    if (isLast) {
      try { localStorage.setItem(onboardingVideosKey(email), '1') } catch { /* private mode */ }
      updateSettings({ onboardingVideosComplete: true })
      // These are the Start Here lessons — tick them in the course too, so the
      // trader isn't asked to watch the same four videos again.
      markStartHereWatched(email)
      onComplete?.()
    } else {
      setIdx(i => i + 1)
    }
  }

  const embed = vid
    ? `https://www.youtube.com/embed/${vid}?enablejsapi=1&rel=0`
    : null

  const overallPct = Math.round(((idx + (canAdvance ? 1 : watchedPct / 100)) / lessons.length) * 100)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, overflowY: 'auto',
      background: `radial-gradient(120% 90% at 50% -10%, rgba(59,130,246,0.14), transparent 55%), linear-gradient(180deg, #141414 0%, #0C0C0C 100%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      {/* ── Branded header ── */}
      <div style={{ width: '100%', maxWidth: 940, padding: '26px 24px 0', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <Logo size={30} showText={false} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#F5F5F5', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Poppins, sans-serif' }}>Welcome to Covenant Trader</div>
          <div style={{ color: '#7E7E7E', fontSize: '0.76rem', marginTop: 1 }}>A few short videos to get you set up.</div>
        </div>
        <div style={{ marginLeft: 'auto', color: BLUE, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', flexShrink: 0 }}>
          Step {idx + 1} of {lessons.length}
        </div>
      </div>

      {/* ── Overall progress bar + step chips ── */}
      <div style={{ width: '100%', maxWidth: 940, padding: '16px 24px 0', flexShrink: 0 }}>
        <div style={{ height: 5, borderRadius: 3, background: '#242424', overflow: 'hidden' }}>
          <div style={{ width: `${overallPct}%`, height: '100%', background: BLUE, borderRadius: 3, transition: 'width .4s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {lessons.map((l, i) => (
            <div key={l.id} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <span style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.62rem', fontWeight: 700,
                background: i < idx ? BLUE : i === idx ? 'rgba(59,130,246,0.18)' : '#1E1E1E',
                color: i < idx ? '#fff' : i === idx ? BLUE : '#5E5E5E',
                border: `1px solid ${i <= idx ? 'rgba(59,130,246,0.5)' : '#2E2E2E'}`,
              }}>
                {i < idx ? <Check size={11} /> : i + 1}
              </span>
              <span style={{ color: i === idx ? '#C8C8C8' : '#5E5E5E', fontSize: '0.72rem', fontWeight: i === idx ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {l.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Video stage ── */}
      <div style={{ flex: 1, minHeight: 0, width: '100%', maxWidth: 940, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '22px 24px 28px', gap: 18 }}>
        <div>
          <div style={{ color: BLUE, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Now playing</div>
          <h1 style={{ color: '#F5F5F5', fontSize: '1.35rem', fontWeight: 800, margin: 0, fontFamily: 'Poppins, sans-serif' }}>{current?.title}</h1>
        </div>

        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: 14, overflow: 'hidden', border: '1px solid #2A2A2A', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
          {embed ? (
            <iframe
              ref={frameRef}
              key={current.id}
              src={embed}
              title={current.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5E5E5E' }}>
              <Play size={28} />
            </div>
          )}
        </div>

        {/* Watch progress + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ height: 4, borderRadius: 2, background: '#242424', overflow: 'hidden' }}>
              <div style={{ width: `${canAdvance ? 100 : watchedPct}%`, height: '100%', background: canAdvance ? '#4CAF7D' : BLUE, borderRadius: 2, transition: 'width .3s ease' }} />
            </div>
            <div style={{ color: canAdvance ? '#4CAF7D' : '#7E7E7E', fontSize: '0.74rem', marginTop: 7 }}>
              {canAdvance
                ? (isLast ? "You're all set." : 'Video watched — you can continue.')
                : (watchedPct > 0 ? `Keep watching — ${watchedPct}%` : 'Press play to begin.')}
            </div>
          </div>

          <button
            onClick={next}
            disabled={!canAdvance}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, border: 'none',
              fontSize: '0.92rem', fontWeight: 700, flexShrink: 0,
              cursor: canAdvance ? 'pointer' : 'not-allowed',
              background: canAdvance ? BLUE : '#202020',
              color: canAdvance ? '#fff' : '#5E5E5E',
              boxShadow: canAdvance ? '0 8px 24px rgba(59,130,246,0.35)' : 'none',
              transition: 'all .15s',
            }}
          >
            {!canAdvance && <Lock size={15} />}
            {isLast ? 'Enter the App' : 'Next video'}
            {canAdvance && <ArrowRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
