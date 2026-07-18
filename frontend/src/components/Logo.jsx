export default function Logo({ size = 32, showText = false, layout = 'row' }) {
  const isRow = layout === 'row'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isRow ? 'row' : 'column',
      alignItems: 'center',
      gap: isRow ? '10px' : '6px',
    }}>
      <img
        src="/logo.png"
        alt="Covenant Trader"
        width={size}
        height={size}
        style={{ objectFit: 'contain', display: 'block', flexShrink: 0 }}
      />
      {showText && (
        <span style={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 700,
          color: '#3B82F6',
          fontSize: isRow ? `${Math.round(size * 0.38)}px` : `${Math.round(size * 0.22)}px`,
          letterSpacing: '0.04em',
          whiteSpace: 'nowrap',
          lineHeight: 1.1,
          textShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }}>
          Covenant Trader
        </span>
      )}
    </div>
  )
}
