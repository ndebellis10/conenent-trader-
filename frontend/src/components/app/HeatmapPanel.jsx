import { useState } from 'react'
import { Flame, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

const BLUE = '#3B82F6'

/* Live NQ heatmap on the dashboard.
   The iframe only mounts once opened — an autoplaying stream on every
   dashboard load would burn bandwidth and steal focus from the numbers. */
const STREAM_ID  = '5tenAhShLlA'
const STREAM_URL = `https://www.youtube.com/watch?v=${STREAM_ID}`
const openKey    = 'ct-heatmap-open'

export default function HeatmapPanel() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(openKey) === '1' } catch { return false }
  })

  const toggle = () => {
    setOpen(o => {
      const next = !o
      try { localStorage.setItem(openKey, next ? '1' : '0') } catch { /* private mode */ }
      return next
    })
  }

  return (
    <div style={{ background: '#242424', borderRadius: 12, border: '1px solid #3A3A3A', overflow: 'hidden' }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <Flame size={16} color={BLUE} style={{ flexShrink: 0 }} />
        <span style={{ color: '#F5F5F5', fontSize: '0.92rem', fontWeight: 600 }}>Live Heatmap</span>
        <span style={{
          background: 'rgba(224,82,82,0.14)', color: '#E05252', borderRadius: 10,
          padding: '2px 8px', fontSize: '0.65rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Live
        </span>
        <span style={{ color: '#8A8A8A', fontSize: '0.75rem', marginLeft: 'auto', flexShrink: 0 }}>
          {open ? 'Hide' : 'Watch'}
        </span>
        {open
          ? <ChevronUp size={15} color="#8A8A8A" style={{ flexShrink: 0 }} />
          : <ChevronDown size={15} color="#8A8A8A" style={{ flexShrink: 0 }} />}
      </button>

      {open && (
        <div style={{ padding: '0 18px 16px' }}>
          {/* 16:9 without a fixed height, so it scales down to a phone */}
          <div style={{
            position: 'relative', width: '100%', paddingTop: '56.25%',
            background: '#000', borderRadius: 10, overflow: 'hidden',
          }}>
            <iframe
              src={`https://www.youtube.com/embed/${STREAM_ID}`}
              title="Live NQ heatmap"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span style={{ color: '#8A8A8A', fontSize: '0.73rem' }}>
              Resting liquidity on NQ — where the orders actually sit.
            </span>
            <a
              href={STREAM_URL} target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, color: BLUE, fontSize: '0.73rem', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
            >
              YouTube <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
