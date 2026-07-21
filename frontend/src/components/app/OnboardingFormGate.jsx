import { useState, useEffect } from 'react'
import { Widget } from '@typeform/embed-react'
import { useTradeStore } from '../../store/tradeStore'

// Safety escape appears after this long, so a broken embed can never trap
// anyone permanently. Once you've confirmed the form loads and submits, this
// can be removed to make the gate strict.
const ESCAPE_AFTER_MS = 25000

/* Mandatory intake form shown to new accounts before they can use the app.
   It's the real Typeform, embedded — answers go to Typeform as normal — but it
   lives inside the app and gates entry. onSubmit is what marks it done, so the
   only way past is to actually finish the form. */
const TYPEFORM_ID = 'Bireg4pc'

export const onboardingFormKey = email =>
  `ct-intake-done__${String(email || 'guest').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`

/** Completed on this account? Checks the synced setting first, then the cache. */
export function isOnboardingFormComplete(settings, email) {
  if (settings?.onboardingFormComplete) return true
  try { return localStorage.getItem(onboardingFormKey(email)) === '1' } catch { return false }
}

export default function OnboardingFormGate({ email, onComplete }) {
  const updateSettings = useTradeStore(s => s.updateSettings)
  const [done, setDone] = useState(false)
  const [showEscape, setShowEscape] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowEscape(true), ESCAPE_AFTER_MS)
    return () => clearTimeout(t)
  }, [])

  const complete = () => {
    if (done) return
    setDone(true)
    // Persist both ways: on the account (follows them across devices) and in
    // the local cache (so a refresh right after submit doesn't re-gate them).
    try { localStorage.setItem(onboardingFormKey(email), '1') } catch { /* private mode */ }
    updateSettings({ onboardingFormComplete: true })
    // Small beat so Typeform's own "thank you" screen is seen before we move on
    setTimeout(() => onComplete?.(), 1400)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#101010', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #262626', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ color: '#F2F2F2', fontWeight: 700, fontSize: '0.95rem' }}>Before you start</span>
        <span style={{ color: '#8A8A8A', fontSize: '0.8rem' }}>Fill this out to set up your account.</span>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <Widget
          id={TYPEFORM_ID}
          style={{ width: '100%', height: '100%' }}
          onSubmit={complete}
          inlineOnMobile
        />
      </div>

      {/* Only appears if the form is slow/broken — never a way to skip a form
          that's working, just insurance against a permanent lock-out. */}
      {showEscape && !done && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid #262626', textAlign: 'center', flexShrink: 0 }}>
          <button
            onClick={() => onComplete?.()}
            style={{ background: 'none', border: 'none', color: '#6A6A6A', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Form not loading? Continue to the app
          </button>
        </div>
      )}
    </div>
  )
}
