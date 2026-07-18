/**
 * TradeChartAnnotator
 * ────────────────────
 * • AI / pixel scan auto-detects Entry, TP and Stop from chart image
 * • Every line has a draggable handle — drag to fine-tune position
 * • "Re-scan Chart" button re-runs detection
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { detectProjectionTool } from '../../lib/chartDetect'

function calcRR(ep, tp, sp) {
  if (!ep || !tp || !sp) return null
  const reward = Math.abs(tp - ep)
  const risk   = Math.abs(ep - sp)
  if (!risk) return null
  return (reward / risk).toFixed(2)
}

export default function TradeChartAnnotator({ image, onPricesDetected }) {
  const [detecting,  setDetecting]  = useState(false)
  const [detected,   setDetected]   = useState(null)
  const [scanError,  setScanError]  = useState(null)

  // Manual overrides (set when user drags a line)
  const [manualTP,    setManualTP]    = useState(null)
  const [manualEntry, setManualEntry] = useState(null)
  const [manualStop,  setManualStop]  = useState(null)

  const imgRef    = useRef(null)
  const wrapRef   = useRef(null)
  const dragging  = useRef(null)   // { line: 'tp'|'entry'|'stop', startY, startPct }

  useEffect(() => {
    if (image) {
      setManualTP(null); setManualEntry(null); setManualStop(null)
      runDetect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image])

  async function runDetect() {
    if (!image) return
    setDetecting(true)
    setScanError(null)
    setDetected(null)

    try {
      // Pixel scan for zone positions
      let visualY = { entryY: null, tpY: null, stopY: null }
      try {
        const px = await detectProjectionTool(image, {})
        visualY = { entryY: px.entryY, tpY: px.tpY, stopY: px.stopY }
      } catch { /* silent */ }

      // Claude Vision for actual prices
      let aiPrices = { entry: null, tp: null, stop: null, entryY: null, tpY: null, stopY: null }
      let apiConfigured = true
      try {
        const res = await fetch('/api/analyze-chart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image }),
        })
        if (res.status === 503) {
          apiConfigured = false
        } else if (res.ok) {
          const data = await res.json()
          aiPrices = { ...aiPrices, ...(data.prices ?? {}) }
        }
      } catch { /* silent */ }

      const result = {
        entry:  aiPrices.entry,
        tp:     aiPrices.tp,
        stop:   aiPrices.stop,
        entryY: aiPrices.entryY ?? visualY.entryY,
        tpY:    aiPrices.tpY    ?? visualY.tpY,
        stopY:  aiPrices.stopY  ?? visualY.stopY,
      }

      setDetected(result)

      const gotPrices = result.entry != null || result.tp != null || result.stop != null
      const gotZones  = result.entryY != null

      if (gotPrices) {
        onPricesDetected?.({
          entry: result.entry, exit: result.tp,
          tp: result.tp, stop: result.stop,
          rr: calcRR(result.entry, result.tp, result.stop),
        })
        const parts = [
          result.entry && `Entry $${result.entry}`,
          result.tp    && `TP $${result.tp}`,
          result.stop  && `Stop $${result.stop}`,
        ].filter(Boolean)
        toast.success(`✅ Auto-detected: ${parts.join(' · ')}`)
      } else if (!apiConfigured && !gotZones) {
        setScanError('No projection tool zones found. Make sure the TradingView Long/Short Position tool is visible on your chart.')
      }
    } catch {
      // silent
    } finally {
      setDetecting(false)
    }
  }

  // ── Drag logic ────────────────────────────────────────────────────
  const startDrag = useCallback((e, line) => {
    e.preventDefault()
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    dragging.current = { line, rect }

    const move = (ev) => {
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY
      const pct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
      if (line === 'tp')    setManualTP(pct)
      if (line === 'entry') setManualEntry(pct)
      if (line === 'stop')  setManualStop(pct)
    }

    const up = () => {
      dragging.current = null
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup',   up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend',  up)
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup',   up)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend',  up)
  }, [])

  // Resolved Y positions (manual override wins)
  const { entryY: dEntry, tpY: dTp, stopY: dStop, entry, tp, stop } = detected ?? {}
  const tpY    = manualTP    ?? dTp
  const entryY = manualEntry ?? dEntry
  const stopY  = manualStop  ?? dStop
  const rr     = calcRR(entry, tp, stop)

  // Zone geometry
  const greenTop    = tpY    != null && entryY != null ? Math.min(tpY,    entryY) : null
  const greenHeight = tpY    != null && entryY != null ? Math.abs(tpY - entryY)   : null
  const redTop      = stopY  != null && entryY != null ? Math.min(stopY,  entryY) : null
  const redHeight   = stopY  != null && entryY != null ? Math.abs(stopY - entryY) : null

  const lineStyle = (color, glow) => ({
    width: '100%', height: 2,
    background: color,
    boxShadow: `0 0 8px ${glow}`,
  })

  const labelStyle = (bg, textColor = '#000') => ({
    position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
    background: bg, color: textColor, fontSize: '11px', fontWeight: 800,
    padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap',
    userSelect: 'none',
  })

  const handleStyle = (color) => ({
    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
    width: 18, height: 18, borderRadius: '50%',
    background: color, border: '2px solid #fff',
    cursor: 'ns-resize', boxShadow: `0 0 6px ${color}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    userSelect: 'none', touchAction: 'none',
  })

  return (
    <div>
      {/* Scanning banner */}
      {detecting && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 8, padding: '10px 16px' }}>
          <Loader2 size={16} color="#3B82F6" className="animate-spin"/>
          <span style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600 }}>
            Reading Entry, Take Profit &amp; Stop Loss from chart…
          </span>
        </div>
      )}

      {scanError && !detecting && (
        <div style={{ marginBottom: 10, background: 'rgba(160,160,160,0.06)',
          border: '1px solid rgba(160,160,160,0.15)', borderRadius: 8,
          padding: '10px 16px', color: '#666', fontSize: '0.8rem' }}>
          ℹ️ {scanError}
        </div>
      )}

      {/* Re-scan button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button type="button" onClick={runDetect} disabled={detecting}
          style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: 7, padding: '6px 13px', color: '#3B82F6',
            cursor: detecting ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600 }}>
          {detecting ? <Loader2 size={13} className="animate-spin"/> : <Sparkles size={13}/>}
          {detecting ? 'Scanning…' : 'Re-scan Chart'}
        </button>
      </div>

      {/* Drag hint */}
      {(tpY != null || entryY != null || stopY != null) && !detecting && (
        <div style={{ marginBottom: 8, color: '#555', fontSize: '0.75rem', textAlign: 'center' }}>
          ⬆⬇ Drag any line to fine-tune its position
        </div>
      )}

      {/* Chart + overlay */}
      <div ref={wrapRef} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden',
        border: '1px solid #3A3A3A', userSelect: 'none' }}>
        <img ref={imgRef} src={image} alt="Trade chart" draggable={false}
          style={{ width: '100%', display: 'block', maxHeight: '520px',
                   objectFit: 'contain', background: '#111' }} />

        {/* GREEN profit zone */}
        {greenTop != null && (
          <div style={{ position: 'absolute', left: 0, right: 0,
            top: `${greenTop}%`, height: `${greenHeight}%`,
            background: 'rgba(76,175,125,0.18)',
            borderTop: '2px solid rgba(76,175,125,0.8)',
            borderBottom: '2px solid rgba(76,175,125,0.8)',
            pointerEvents: 'none' }} />
        )}

        {/* RED risk zone */}
        {redTop != null && (
          <div style={{ position: 'absolute', left: 0, right: 0,
            top: `${redTop}%`, height: `${redHeight}%`,
            background: 'rgba(224,82,82,0.18)',
            borderTop: '2px solid rgba(224,82,82,0.7)',
            borderBottom: '2px solid rgba(224,82,82,0.7)',
            pointerEvents: 'none' }} />
        )}

        {/* TAKE PROFIT line */}
        {tpY != null && (
          <div style={{ position: 'absolute', left: 0, right: 0,
            top: `${tpY}%`, transform: 'translateY(-50%)' }}>
            <div style={lineStyle('#4CAF7D', 'rgba(76,175,125,0.7)')} />
            <div style={labelStyle('#4CAF7D', '#000')}>
              Take Profit{tp != null ? ` $${tp}` : ''}
            </div>
            <div style={handleStyle('#4CAF7D')}
              onMouseDown={e => startDrag(e, 'tp')}
              onTouchStart={e => startDrag(e, 'tp')}>
              <span style={{ color:'#000', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>↕</span>
            </div>
          </div>
        )}

        {/* ENTRY line */}
        {entryY != null && (
          <div style={{ position: 'absolute', left: 0, right: 0,
            top: `${entryY}%`, transform: 'translateY(-50%)' }}>
            <div style={lineStyle('#3B82F6', 'rgba(59,130,246,0.7)')} />
            <div style={labelStyle('#3B82F6', '#000')}>
              Entry{entry != null ? ` $${entry}` : ''}
            </div>
            <div style={handleStyle('#3B82F6')}
              onMouseDown={e => startDrag(e, 'entry')}
              onTouchStart={e => startDrag(e, 'entry')}>
              <span style={{ color:'#000', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>↕</span>
            </div>
          </div>
        )}

        {/* STOP LOSS line */}
        {stopY != null && (
          <div style={{ position: 'absolute', left: 0, right: 0,
            top: `${stopY}%`, transform: 'translateY(-50%)' }}>
            <div style={lineStyle('#E05252', 'rgba(224,82,82,0.7)')} />
            <div style={labelStyle('#E05252', '#fff')}>
              Stop Loss{stop != null ? ` $${stop}` : ''}
            </div>
            <div style={handleStyle('#E05252')}
              onMouseDown={e => startDrag(e, 'stop')}
              onTouchStart={e => startDrag(e, 'stop')}>
              <span style={{ color:'#fff', fontSize: 10, fontWeight: 800, lineHeight: 1 }}>↕</span>
            </div>
          </div>
        )}

        {/* R:R badge */}
        {rr && (
          <div style={{ position: 'absolute', top: 10, right: 10,
            background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(59,130,246,0.4)',
            borderRadius: 8, padding: '6px 12px', pointerEvents: 'none' }}>
            <div style={{ color: '#666', fontSize: '9px', textTransform: 'uppercase',
              letterSpacing: '0.08em' }}>Risk/Reward</div>
            <div style={{ color: '#3B82F6', fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 700, fontSize: '1rem' }}>1:{rr}</div>
          </div>
        )}
      </div>

      {/* Price summary chips */}
      {(tpY != null || entryY != null || stopY != null) && !detecting && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Take Profit', price: tp,    color: '#4CAF7D' },
            { label: 'Entry',       price: entry, color: '#3B82F6' },
            { label: 'Stop Loss',   price: stop,  color: '#E05252' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6,
              background: '#2E2E2E', border: `1px solid ${item.color}40`,
              borderRadius: 6, padding: '4px 12px', fontSize: '0.78rem' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: item.color }}/>
              <span style={{ color: '#888' }}>{item.label}</span>
              <span style={{ color: item.color, fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700 }}>
                {item.price != null ? `$${item.price}` : '—'}
              </span>
              {item.price != null && <span style={{ color: '#4CAF7D', fontSize: '0.7rem' }}>✓ auto</span>}
            </div>
          ))}
          {rr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 6, padding: '4px 12px', fontSize: '0.78rem' }}>
              <span style={{ color: '#666' }}>R:R</span>
              <span style={{ color: '#3B82F6', fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700 }}>1:{rr}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
