import { Flame, ExternalLink } from 'lucide-react'

const BLUE = '#3B82F6'
const STREAM_ID  = '5tenAhShLlA'
const STREAM_URL = `https://www.youtube.com/watch?v=${STREAM_ID}`

/* Dedicated Heatmap tab. The player mounts on the page rather than a collapsed
   panel, so it plays as soon as you open the tab. */
export default function Heatmap() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
        <Flame size={20} color={BLUE} />
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', margin: 0 }}>Live Heatmap</h1>
        <span style={{
          background: 'rgba(224,82,82,0.14)', color: '#E05252', borderRadius: 10,
          padding: '3px 9px', fontSize: '0.66rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Live
        </span>
      </div>
      <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 20px' }}>
        Resting liquidity on NQ — where the orders actually sit.
      </p>

      <div style={{ maxWidth: 1100 }}>
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: 14, overflow: 'hidden', border: '1px solid #2A2A2A', boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }}>
          <iframe
            src={`https://www.youtube.com/embed/${STREAM_ID}`}
            title="Live NQ heatmap"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 12 }}>
          <a
            href={STREAM_URL} target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: BLUE, fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
          >
            Open on YouTube <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  )
}
