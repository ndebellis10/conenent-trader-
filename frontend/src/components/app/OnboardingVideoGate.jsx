import { useState, useEffect, useRef } from 'react'
import { Check, Play, Lock } from 'lucide-react'
import { useTradeStore } from '../../store/tradeStore'
import { COURSE_MODULES } from '../../lib/courseOutline'
import { markStartHereWatched } from '../../lib/courseProgress'

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

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#101010', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #262626', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ color: '#F2F2F2', fontWeight: 700, fontSize: '0.95rem' }}>Start Here</span>
        <span style={{ color: '#8A8A8A', fontSize: '0.8rem' }}>Watch these to get set up. Video {idx + 1} of {lessons.length}.</span>
        {/* Step dots */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {lessons.map((l, i) => (
            <span key={l.id} style={{
              width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.66rem', fontWeight: 700,
              background: i < idx ? '#3B82F6' : i === idx ? 'rgba(59,130,246,0.18)' : '#242424',
              color: i < idx ? '#fff' : i === idx ? '#3B82F6' : '#5E5E5E',
              border: `1px solid ${i <= idx ? 'rgba(59,130,246,0.5)' : '#333'}`,
            }}>
              {i < idx ? <Check size={12} /> : i + 1}
            </span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 16 }}>
        <div style={{ width: '100%', maxWidth: 960 }}>
          <div style={{ color: '#F5F5F5', fontSize: '1.05rem', fontWeight: 700, marginBottom: 10 }}>{current?.title}</div>
          <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: 12, overflow: 'hidden', border: '1px solid #2A2A2A' }}>
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
        </div>

        <button
          onClick={next}
          disabled={!canAdvance}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '11px 26px', borderRadius: 10, border: 'none',
            fontSize: '0.9rem', fontWeight: 700,
            cursor: canAdvance ? 'pointer' : 'not-allowed',
            background: canAdvance ? '#3B82F6' : '#242424',
            color: canAdvance ? '#fff' : '#5E5E5E',
            transition: 'all .15s',
          }}
        >
          {!canAdvance && <Lock size={15} />}
          {isLast ? 'Enter the App' : 'Next video'}
        </button>
        {!canAdvance && (
          <span style={{ color: '#5E5E5E', fontSize: '0.75rem' }}>
            {watchedPct > 0 ? `Keep watching to continue — ${watchedPct}%` : 'Keep watching to continue.'}
          </span>
        )}
      </div>
    </div>
  )
}
