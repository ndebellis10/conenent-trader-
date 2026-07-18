import Logo from '../Logo'

const cols = [
  { title: 'Product', links: ['Features', 'Dashboard', 'Changelog'] },
  { title: 'Company', links: ['About', 'Blog', 'Contact', 'Privacy Policy'] },
  { title: 'Faith', links: ['Daily Verse', "Trader's Prayer", 'Faith Journal', 'Scripture Library'] },
]

export default function Footer() {

  return (
    <footer style={{ background: '#080808', borderTop: '1px solid #1A1A1A', padding: '80px 0 32px', position: 'relative', overflow: 'hidden' }}>

      {/* Subtle top glow */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)',
      }} />

      <div className="max-w-7xl mx-auto px-6">
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(3, 1fr)', gap: '48px', marginBottom: '64px' }}>

          {/* Brand */}
          <div>
            <div style={{ marginBottom: 16 }}>
              <Logo size={60} showText layout="column" />
            </div>
            <p style={{ color: '#444', fontSize: '0.85rem', marginBottom: 24, lineHeight: 1.7, maxWidth: 200 }}>
              The trading journal built for believers. Trade with purpose. Profit with faith.
            </p>

            {/* Social */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { label: '𝕏', title: 'Twitter' },
                { label: 'in', title: 'LinkedIn' },
                { label: '▶', title: 'YouTube' },
              ].map(s => (
                <a key={s.label} href="#" title={s.title} style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: '1px solid #222',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#444', fontSize: '12px', textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.color = '#3B82F6' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#222'; e.currentTarget.style.color = '#444' }}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {cols.map(col => (
            <div key={col.title}>
              <h4 style={{ color: '#666', fontWeight: 600, marginBottom: 20, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {col.title}
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {col.links.map(link => (
                  <li key={link}>
                    <a href="#" style={{ color: '#444', textDecoration: 'none', fontSize: '0.88rem', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.target.style.color = '#3B82F6'}
                      onMouseLeave={e => e.target.style.color = '#444'}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: '1px solid #161616', paddingTop: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <p style={{ color: '#333', fontSize: '0.8rem' }}>
            © 2025 Covenant Trader. All rights reserved.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#333', fontSize: '0.8rem' }}>Built with</span>
            <span style={{ color: '#3B82F6', fontSize: '0.8rem' }}>✝</span>
            <span style={{ color: '#333', fontSize: '0.8rem' }}>and discipline</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Terms', 'Privacy', 'Contact'].map(l => (
              <a key={l} href="#" style={{ color: '#333', fontSize: '0.8rem', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.target.style.color = '#3B82F6'}
                onMouseLeave={e => e.target.style.color = '#333'}
              >{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
