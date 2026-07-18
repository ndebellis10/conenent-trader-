import { useNavigate } from 'react-router-dom'
import { FlaskConical, Upload, Clock } from 'lucide-react'

/* Backtesting — "coming soon" placeholder. The full replay/sessions/reports
   suite is not built yet, but users can already import backtest trades from a
   CSV (routed to the Log Trade importer, which tags them "Backtest"). */
export default function Backtest() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Coming soon hero */}
      <div style={{ textAlign: 'center', padding: '40px 24px', background: 'linear-gradient(160deg,#242424,#1E1E1E)', border: '1px solid #3A3A3A', borderRadius: 16, marginBottom: 20 }}>
        <div style={{ fontSize: '2.4rem', marginBottom: 10, filter: 'drop-shadow(0 0 14px rgba(59,130,246,0.4))' }}>⚗️</div>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: '#F5F5F5', margin: '0 0 8px' }}>Backtesting — Coming Soon</h1>
        <p style={{ color: '#888', fontSize: '0.9rem', maxWidth: 470, margin: '0 auto', lineHeight: 1.6 }}>
          Replay sessions, paper trading, and backtest reports are being built. In the meantime, you can already import your backtest trades from a CSV below.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          {['Replay Sessions', 'Paper Trading', 'Backtest Reports'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#666', fontSize: '0.78rem', background: '#1A1A1A', border: '1px solid #2E2E2E', borderRadius: 20, padding: '6px 14px' }}>
              <Clock size={13} /> {f}
            </div>
          ))}
        </div>
      </div>

      {/* CSV upload CTA */}
      <div style={{ background: '#242424', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 14, padding: '26px 24px', textAlign: 'center' }}>
        <FlaskConical size={26} color="#3B82F6" />
        <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: '#F5F5F5', margin: '10px 0 6px' }}>Upload Backtest CSV</h2>
        <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 18, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>
          Import trades from your backtesting. They'll be tagged{' '}
          <strong style={{ color: '#3B82F6' }}>Backtest</strong> so you can tell them apart from live trades.
        </p>
        <button
          onClick={() => navigate('/app/log', { state: { backtest: true } })}
          className="btn-gold"
          style={{ padding: '12px 26px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Upload size={16} /> Import Backtest CSV
        </button>
      </div>
    </div>
  )
}
