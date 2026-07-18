import { useState, useRef, useEffect, useCallback } from 'react'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth,
  isWithinInterval, isSameDay, startOfYear, endOfDay, startOfDay,
  subDays, startOfQuarter, endOfQuarter,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const PRESETS = [
  { label: 'Today',            getRange: () => { const d = new Date(); return { start: startOfDay(d), end: endOfDay(d) } } },
  { label: 'This week',        getRange: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }) },
  { label: 'This month',       getRange: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: 'Last 30 days',     getRange: () => ({ start: startOfDay(subDays(new Date(), 29)), end: endOfDay(new Date()) }) },
  { label: 'Last month',       getRange: () => { const p = subMonths(new Date(), 1); return { start: startOfMonth(p), end: endOfMonth(p) } } },
  { label: 'This quarter',     getRange: () => ({ start: startOfQuarter(new Date()), end: endOfQuarter(new Date()) }) },
  { label: 'YTD (year to date)', getRange: () => ({ start: startOfYear(new Date()), end: endOfDay(new Date()) }) },
  { label: 'All time',         getRange: () => null },
]

function CalMonth({ viewDate, range, hovered, onDayClick, onDayHover }) {
  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const { start, end } = range
  const rangeEnd = end || hovered

  function dayState(day) {
    const inMonth = isSameMonth(day, viewDate)
    const isStart = start && isSameDay(day, start)
    const isEnd = end && isSameDay(day, end)
    const isHovered = !end && hovered && isSameDay(day, hovered)
    const inRange = start && rangeEnd && isWithinInterval(day, {
      start: start < rangeEnd ? start : rangeEnd,
      end: start < rangeEnd ? rangeEnd : start,
    })
    return { inMonth, isStart, isEnd, isHovered, inRange }
  }

  return (
    <div style={{ flex: 1 }}>
      {/* Month title */}
      <div style={{ textAlign: 'center', color: '#F5F5F5', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px', fontFamily: 'Poppins, sans-serif' }}>
        {format(viewDate, 'MMMM yyyy')}
      </div>
      {/* DOW header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign: 'center', color: '#555', fontSize: '0.68rem', fontWeight: 700, padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
        ))}
      </div>
      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {days.map(day => {
          const { inMonth, isStart, isEnd, isHovered, inRange } = dayState(day)
          const isEdge = isStart || isEnd || isHovered
          const bg = isEdge
            ? '#3B82F6'
            : inRange ? 'rgba(59,130,246,0.18)' : 'transparent'
          const color = isEdge ? '#1A1A1A' : inMonth ? (inRange ? '#F5F5F5' : '#C0C0C0') : '#333'

          return (
            <div
              key={format(day, 'yyyy-MM-dd')}
              onClick={() => onDayClick(day)}
              onMouseEnter={() => onDayHover(day)}
              style={{
                textAlign: 'center',
                padding: '6px 2px',
                borderRadius: isEdge ? '8px' : inRange ? '0' : '8px',
                background: bg,
                color,
                fontSize: '0.8rem',
                fontWeight: isEdge ? 800 : 400,
                cursor: 'pointer',
                transition: 'background 0.1s',
                opacity: inMonth ? 1 : 0,
                pointerEvents: inMonth ? 'auto' : 'none',
                fontFamily: isEdge ? 'JetBrains Mono, monospace' : 'inherit',
              }}
            >
              {format(day, 'd')}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [leftMonth, setLeftMonth] = useState(subMonths(new Date(), 1))
  const [selecting, setSelecting] = useState(null) // null | Date (first click)
  const [hovered, setHovered] = useState(null)
  const [activePreset, setActivePreset] = useState('All time')
  const ref = useRef(null)

  const rightMonth = addMonths(leftMonth, 1)

  useEffect(() => {
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const handleDayClick = useCallback((day) => {
    if (!selecting) {
      setSelecting(day)
      setActivePreset(null)
    } else {
      const start = selecting < day ? selecting : day
      const end = selecting < day ? day : selecting
      onChange({ start: startOfDay(start), end: endOfDay(end) })
      setSelecting(null)
      setHovered(null)
      setActivePreset(null)
      setOpen(false)
    }
  }, [selecting, onChange])

  const handlePreset = useCallback((preset) => {
    const range = preset.getRange()
    onChange(range)
    setSelecting(null)
    setHovered(null)
    setActivePreset(preset.label)
    setOpen(false)
  }, [onChange])

  // Button label
  let btnLabel = 'All time'
  if (activePreset && activePreset !== 'All time') {
    btnLabel = activePreset
  } else if (value) {
    btnLabel = `${format(value.start, 'MMM d, yyyy')} → ${format(value.end, 'MMM d, yyyy')}`
  }

  const range = value
    ? { start: value.start, end: value.end }
    : { start: null, end: null }

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 100 }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: open ? 'rgba(59,130,246,0.15)' : '#1E1E1E',
          border: `1px solid ${open ? '#3B82F6' : '#3A3A3A'}`,
          borderRadius: '10px',
          padding: '8px 14px',
          color: value ? '#3B82F6' : '#888',
          fontSize: '0.8rem', fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        <Calendar size={14} color={value ? '#3B82F6' : '#666'} />
        {btnLabel}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: '#1A1A1A',
          border: '1px solid #3A3A3A',
          borderRadius: '14px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          overflow: 'hidden',
          minWidth: '620px',
        }}>
          {/* Left: dual calendar */}
          <div style={{ padding: '20px 22px', flex: 1 }}>
            {/* Date display bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', padding: '10px 14px', background: '#242424', borderRadius: '8px', border: '1px solid #2A2A2A' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: selecting || range.start ? '#3B82F6' : '#444', fontWeight: 700 }}>
                {selecting ? format(selecting, 'MMM dd, yyyy') : range.start ? format(range.start, 'MMM dd, yyyy') : 'Start date'}
              </span>
              <span style={{ color: '#3A3A3A', fontSize: '1rem' }}>→</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: range.end ? '#3B82F6' : '#444', fontWeight: 700 }}>
                {range.end ? format(range.end, 'MMM dd, yyyy') : 'End date'}
              </span>
            </div>

            {/* Month nav + calendars */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <button onClick={() => setLeftMonth(m => subMonths(m, 1))}
                style={{ background: '#2A2A2A', border: '1px solid #3A3A3A', color: '#888', width: 30, height: 30, borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ChevronLeft size={15} />
              </button>

              <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
                <CalMonth
                  viewDate={leftMonth}
                  range={selecting ? { start: selecting, end: null } : range}
                  hovered={hovered}
                  onDayClick={handleDayClick}
                  onDayHover={setHovered}
                />
                <div style={{ width: '1px', background: '#2A2A2A', flexShrink: 0 }} />
                <CalMonth
                  viewDate={rightMonth}
                  range={selecting ? { start: selecting, end: null } : range}
                  hovered={hovered}
                  onDayClick={handleDayClick}
                  onDayHover={setHovered}
                />
              </div>

              <button onClick={() => setLeftMonth(m => addMonths(m, 1))}
                style={{ background: '#2A2A2A', border: '1px solid #3A3A3A', color: '#888', width: 30, height: 30, borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ChevronRight size={15} />
              </button>
            </div>

            {selecting && (
              <div style={{ marginTop: '10px', color: '#3B82F6', fontSize: '0.72rem', textAlign: 'center', opacity: 0.8 }}>
                Click a second date to complete the range
              </div>
            )}
          </div>

          {/* Right: presets */}
          <div style={{ borderLeft: '1px solid #2A2A2A', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px', background: '#171717' }}>
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                onClick={() => handlePreset(preset)}
                style={{
                  background: activePreset === preset.label ? 'rgba(59,130,246,0.15)' : 'transparent',
                  border: `1px solid ${activePreset === preset.label ? 'rgba(59,130,246,0.35)' : 'transparent'}`,
                  borderRadius: '8px',
                  color: activePreset === preset.label ? '#3B82F6' : '#A0A0A0',
                  padding: '9px 14px',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: activePreset === preset.label ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => { if (activePreset !== preset.label) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (activePreset !== preset.label) e.currentTarget.style.background = 'transparent' }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
