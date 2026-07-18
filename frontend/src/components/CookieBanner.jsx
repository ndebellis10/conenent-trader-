/**
 * Cookie consent banner.
 * Covenant Trader uses ONLY strictly necessary cookies (auth session).
 * No tracking, analytics, or advertising cookies are ever set.
 */
import { useState } from 'react'
import { Link }     from 'react-router-dom'
import { ShieldCheck, X } from 'lucide-react'

export default function CookieBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('ft-cookie-consent') === '1'
  )

  if (dismissed) return null

  const accept = () => {
    localStorage.setItem('ft-cookie-consent', '1')
    setDismissed(true)
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#1C1C1C',
      borderTop: '1px solid #2E2E2E',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
    }}>
      <ShieldCheck size={16} color="#3B82F6" style={{ flexShrink: 0 }} />

      <p style={{
        color: '#888', fontSize: '0.82rem', flex: 1,
        margin: 0, lineHeight: 1.5, minWidth: 200,
      }}>
        We use <strong style={{ color: '#C0C0C0' }}>strictly necessary cookies only</strong> — for authentication and session security.
        No tracking, advertising, or analytics. {' '}
        <Link to="/privacy" style={{ color: '#3B82F6', textDecoration: 'none' }}>
          Privacy Policy
        </Link>
      </p>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={accept}
          style={{
            padding: '8px 20px', borderRadius: 8, border: 'none',
            background: '#3B82F6', color: '#FFFFFF',
            fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Accept
        </button>
        <button
          onClick={accept}
          style={{
            padding: '8px 10px', borderRadius: 8,
            background: 'transparent', border: '1px solid #2E2E2E',
            color: '#555', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
