/**
 * TradeChartViewer
 * ----------------
 * Full-screen lightbox modal showing a trade's chart screenshot
 * with all annotation markers overlaid.
 *
 * Props:
 *   trade   – the full trade object
 *   onClose – () => void
 */
import { useEffect } from 'react'
import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'

export default function TradeChartViewer({ trade, onClose }) {
  const [zoom, setZoom] = useState(1)

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!trade?.chartImage) return null

  const markers  = trade.chartMarkers || []
  const isWin    = trade.result === 'Win'
  const isLoss   = trade.result === 'Loss'
  const pnl      = parseFloat(trade.netPnl || 0)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(6px)',
      }}
    >
      {/* Modal panel */}
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1A1A1A', borderRadius: 16,
        border: '1px solid #3A3A3A',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        maxWidth: '95vw', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', width: '100%',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #2E2E2E',
          background: '#242424', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div>
              <span style={{ color: '#F5F5F5', fontWeight: 700, fontSize: '1rem', fontFamily: 'Poppins, sans-serif' }}>
                {trade.symbol}
              </span>
              <span style={{
                marginLeft: 8, fontSize: '0.75rem', fontWeight: 600,
                color: trade.direction === 'Long' ? '#4CAF7D' : '#E05252',
                background: trade.direction === 'Long' ? 'rgba(76,175,125,0.15)' : 'rgba(224,82,82,0.15)',
                padding: '2px 8px', borderRadius: 4,
              }}>{trade.direction}</span>
            </div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '1.1rem',
              color: isWin ? '#4CAF7D' : isLoss ? '#E05252' : '#A0A0A0',
            }}>
              {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { label: 'Entry', value: `$${parseFloat(trade.entryPrice||0).toFixed(2)}`, color: '#4CAF7D' },
                { label: 'Exit',  value: `$${parseFloat(trade.exitPrice||0).toFixed(2)}`,  color: '#3B82F6' },
                trade.takeProfit && { label: 'TP', value: `$${parseFloat(trade.takeProfit).toFixed(2)}`, color: '#38BDF8' },
                trade.stopLoss   && { label: 'SL', value: `$${parseFloat(trade.stopLoss).toFixed(2)}`,   color: '#E05252' },
              ].filter(Boolean).map(item => (
                <div key={item.label} style={{
                  background: '#2E2E2E', border: `1px solid ${item.color}30`,
                  borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem',
                }}>
                  <span style={{ color: '#666' }}>{item.label} </span>
                  <span style={{ color: item.color, fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Zoom controls */}
            <button type="button" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              style={{ background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: 6, padding: '6px 10px', color: '#A0A0A0', cursor: 'pointer', display: 'flex' }}>
              <ZoomOut size={16} />
            </button>
            <span style={{ color: '#666', fontSize: '0.8rem', minWidth: 40, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              style={{ background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: 6, padding: '6px 10px', color: '#A0A0A0', cursor: 'pointer', display: 'flex' }}>
              <ZoomIn size={16} />
            </button>
            <button type="button" onClick={onClose}
              style={{ background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: 6, padding: '6px 10px', color: '#A0A0A0', cursor: 'pointer', display: 'flex', marginLeft: 4 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image area */}
        <div style={{ flex: 1, overflow: 'auto', position: 'relative', background: '#111' }}>
          <div style={{
            position: 'relative', display: 'inline-block',
            transform: `scale(${zoom})`, transformOrigin: 'top left',
            minWidth: zoom > 1 ? `${100 / zoom}%` : '100%',
          }}>
            <img
              src={trade.chartImage}
              alt="Trade chart"
              style={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%' }}
            />

            {/* Annotation markers */}
            {markers.map((m, i) => (
              <div key={i} style={{
                position: 'absolute', left: 0, right: 0,
                top: `${m.yPct}%`,
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: '100%', height: 2,
                  background: `linear-gradient(90deg, ${m.color}, ${m.color}66)`,
                  boxShadow: `0 0 10px ${m.color}80`,
                }} />
                {/* Left label */}
                <div style={{
                  position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                  background: m.color, color: '#000', fontSize: '11px', fontWeight: 700,
                  padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap',
                  boxShadow: `0 0 12px ${m.color}60`,
                }}>
                  {m.label}
                </div>
                {/* Right price tick */}
                <div style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: `${m.color}22`, border: `1px solid ${m.color}60`,
                  color: m.color, fontSize: '10px', fontWeight: 700,
                  padding: '2px 8px', borderRadius: 4, fontFamily: 'JetBrains Mono, monospace',
                }}>
                  ●
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        {trade.tradeNotes && (
          <div style={{
            padding: '10px 20px', borderTop: '1px solid #2E2E2E',
            background: '#242424', color: '#888', fontSize: '0.82rem',
            flexShrink: 0, lineHeight: 1.5,
          }}>
            <span style={{ color: '#555', marginRight: 8 }}>Notes:</span>{trade.tradeNotes}
          </div>
        )}
      </div>
    </div>
  )
}
