/**
 * TradeProjectionView
 * ───────────────────
 * Mimics TradingView's Long/Short Position Tool visual:
 *  - Dark grey rectangle = full trade range (stop → TP)
 *  - White/gold entry line in the middle
 *  - Green TP zone above entry
 *  - Red/blue stop zone below entry
 *  - Price labels on the right (like TradingView's blue axis boxes)
 *  - Points, R:R and P&L info shown on the diagram
 */
export default function TradeProjectionView({ entry, tp, stop, contracts = 1, accounts = 1, result }) {
  const e  = parseFloat(entry)
  const t  = parseFloat(tp)
  const s  = parseFloat(stop)

  if (!e || !t || !s || isNaN(e) || isNaN(t) || isNaN(s)) return null

  const tpPoints   = Math.abs(t - e)
  const stopPoints = Math.abs(e - s)
  const isLong     = t > e
  const rr         = stopPoints > 0 ? (tpPoints / stopPoints).toFixed(2) : '—'

  // P&L (MNQ = $2 per point per contract × number of accounts)
  const multiplier = contracts * accounts
  const tpPnl   = (tpPoints   * 2 * multiplier).toFixed(0)
  const stopPnl = (stopPoints * 2 * multiplier).toFixed(0)

  // Layout: total height = tpPoints + stopPoints
  const total      = tpPoints + stopPoints
  const tpPct      = (tpPoints   / total) * 100   // % of box that is profit zone
  const stopPct    = (stopPoints / total) * 100   // % of box that is risk zone

  const priceLabel = (price, color, bg, align = 'right') => (
    <div style={{
      background: bg,
      color: color,
      fontFamily: 'JetBrains Mono, monospace',
      fontWeight: 700,
      fontSize: '0.78rem',
      padding: '2px 8px',
      borderRadius: 3,
      whiteSpace: 'nowrap',
      border: `1px solid ${color}60`,
    }}>
      {price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  )

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ color: '#666', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Trade Projection
      </div>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>

        {/* ── Main box ───────────────────────────────────── */}
        <div style={{ flex: 1, position: 'relative', borderRadius: '6px 0 0 6px', overflow: 'hidden', minHeight: 160 }}>

          {/* Profit zone (top) */}
          <div style={{
            height: `${tpPct}%`,
            background: 'rgba(76,175,125,0.12)',
            borderBottom: '2px solid rgba(76,175,125,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', left: 12,
              color: '#4CAF7D', fontSize: '0.78rem', fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              +{tpPoints.toFixed(1)} pts
            </div>
            <div style={{
              background: 'rgba(76,175,125,0.15)', border: '1px solid rgba(76,175,125,0.3)',
              borderRadius: 6, padding: '4px 12px', textAlign: 'center',
            }}>
              <div style={{ color: '#4CAF7D', fontSize: '0.7rem' }}>Take Profit</div>
              <div style={{ color: '#4CAF7D', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '0.9rem' }}>
                +${tpPnl}
              </div>
            </div>
          </div>

          {/* Entry line */}
          <div style={{
            height: 2,
            background: '#F5F5F5',
            boxShadow: '0 0 8px rgba(255,255,255,0.5)',
          }} />

          {/* Risk zone (bottom) */}
          <div style={{
            height: `${stopPct}%`,
            background: 'rgba(224,82,82,0.10)',
            borderTop: '2px solid rgba(224,82,82,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', left: 12,
              color: '#E05252', fontSize: '0.78rem', fontWeight: 700,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              -{stopPoints.toFixed(1)} pts
            </div>
            <div style={{
              background: 'rgba(224,82,82,0.12)', border: '1px solid rgba(224,82,82,0.3)',
              borderRadius: 6, padding: '4px 12px', textAlign: 'center',
            }}>
              <div style={{ color: '#E05252', fontSize: '0.7rem' }}>Stop Loss</div>
              <div style={{ color: '#E05252', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, fontSize: '0.9rem' }}>
                -${stopPnl}
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Y-axis price labels (like TradingView) ── */}
        <div style={{
          width: 100,
          background: '#111',
          borderRadius: '0 6px 6px 0',
          border: '1px solid #2A2A2A',
          borderLeft: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '0',
          overflow: 'hidden',
        }}>
          {/* TP price */}
          <div style={{
            height: `${tpPct}%`,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
            padding: '4px 6px 0 0',
          }}>
            {priceLabel(t, '#4CAF7D', 'rgba(76,175,125,0.2)')}
          </div>

          {/* Entry price — highlighted like TradingView */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            padding: '0 6px',
            transform: 'translateY(-50%)',
            zIndex: 2,
          }}>
            <div style={{
              background: '#F5F5F5',
              color: '#111',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 800,
              fontSize: '0.78rem',
              padding: '2px 8px',
              borderRadius: 3,
              whiteSpace: 'nowrap',
            }}>
              {e.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          {/* Stop price */}
          <div style={{
            height: `${stopPct}%`,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
            padding: '0 6px 4px 0',
          }}>
            {priceLabel(s, '#5B9BD5', 'rgba(91,155,213,0.2)')}
          </div>
        </div>
      </div>

      {/* ── Stats row below the box ─────────────────────── */}
      <div style={{
        display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap',
      }}>
        {[
          { label: 'R:R',         value: `1:${rr}`,                   color: '#3B82F6' },
          { label: 'TP Points',   value: `+${tpPoints.toFixed(1)}`,   color: '#4CAF7D' },
          { label: 'Stop Points', value: `-${stopPoints.toFixed(1)}`,  color: '#E05252' },
          { label: 'Contracts',   value: contracts,                     color: '#A0A0A0' },
          ...(accounts > 1 ? [{ label: 'Accounts', value: `×${accounts}`, color: '#3B82F6' }] : []),
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            flex: 1, minWidth: 70, background: '#1E1E1E',
            border: '1px solid #2A2A2A', borderRadius: 6,
            padding: '6px 10px', textAlign: 'center',
          }}>
            <div style={{ color: '#555', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
            <div style={{ color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.85rem' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
