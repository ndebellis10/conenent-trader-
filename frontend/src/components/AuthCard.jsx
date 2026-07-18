import Logo from './Logo'

export default function AuthCard({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
      {/* Background grid */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <svg width="100%" height="100%">
          <defs>
            <pattern id="authgrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(59,130,246,0.04)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#authgrid)"/>
        </svg>
      </div>
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: '460px',
        background: '#242424', borderRadius: '16px',
        border: '1px solid #3A3A3A', borderTop: '3px solid #3B82F6',
        boxShadow: '0 0 40px rgba(59,130,246,0.1)',
        padding: '40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Logo size={90} showText layout="column" />
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
