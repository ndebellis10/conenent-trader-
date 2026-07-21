import { Flame, ExternalLink } from 'lucide-react'

const BLUE = '#3B82F6'
const STREAM_ID  = '5tenAhShLlA'
const STREAM_URL = `https://www.youtube.com/watch?v=${STREAM_ID}`

/* Dedicated Heatmap tab. The player mounts on the page rather than a collapsed
   panel, so it plays as soon as you open the tab. */
export default function Heatmap() {
  return (
    // Fill the visible content area so the player can be as large as possible
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 128px)', minHeight: 420 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 4, flexShrink: 0 }}>
        <Flame size={19} color={BLUE} />
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.3rem', margin: 0 }}>Live Heatmap</h1>
        <span style={{
          background: 'rgba(224,82,82,0.14)', color: '#E05252', borderRadius: 10,
          padding: '3px 9px', fontSize: '0.64rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          Live
        </span>
        <span style={{ color: '#777', fontSize: '0.8rem', marginLeft: 4 }}>Resting liquidity on NQ.</span>
        <a
          href={STREAM_URL} target="_blank" rel="noopener noreferrer"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, color: BLUE, fontSize: '0.76rem', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
        >
          YouTube <ExternalLink size={13} />
        </a>
      </div>

      {/* Big player — fills the remaining height. Autoplays muted (browsers
          block autoplay with sound); use the player's unmute to hear it. */}
      <div style={{ flex: 1, minHeight: 0, background: '#000', borderRadius: 14, overflow: 'hidden', border: '1px solid #2A2A2A', boxShadow: '0 20px 50px rgba(0,0,0,0.45)' }}>
        <iframe
          src={`https://www.youtube.com/embed/${STREAM_ID}?autoplay=1&mute=1&rel=0`}
          title="Live NQ heatmap"
          allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        />
      </div>
    </div>
  )
}
