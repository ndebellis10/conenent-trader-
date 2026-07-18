import { Link }     from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const S = {
  page:    { maxWidth: 760, margin: '0 auto', padding: '48px 24px', color: '#C8C8C8', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 },
  h1:      { fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: '2rem', color: '#F5F5F5', marginBottom: 8 },
  h2:      { fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: '1.1rem', color: '#F5F5F5', marginTop: 40, marginBottom: 12 },
  p:       { color: '#A0A0A0', fontSize: '0.92rem', marginBottom: 16 },
  ul:      { paddingLeft: 20, color: '#A0A0A0', fontSize: '0.92rem' },
  li:      { marginBottom: 8 },
  badge:   { display: 'inline-block', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', color: '#3B82F6', borderRadius: 6, padding: '2px 10px', fontSize: '0.78rem', fontWeight: 600, marginBottom: 28 },
  divider: { borderColor: '#2A2A2A', margin: '24px 0' },
}

export default function Privacy() {
  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A' }}>
      <div style={S.page}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#555', fontSize: '0.85rem', textDecoration: 'none', marginBottom: 32 }}>
          <ArrowLeft size={14} /> Back
        </Link>

        <h1 style={S.h1}>Privacy Policy</h1>
        <span style={S.badge}>Last updated: May 2025</span>

        <p style={S.p}>
          Covenant Trader ("we", "us", "our") is committed to protecting your privacy. This policy explains what data we collect, why we collect it, how we protect it, and your rights over it.
        </p>

        <hr style={S.divider} />

        <h2 style={S.h2}>1. Data We Collect</h2>
        <ul style={S.ul}>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Account data:</strong> your email address and display name provided at registration.</li>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Trade journal data:</strong> trade entries (symbol, prices, notes, emotions, scripture) that you explicitly log.</li>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Goals &amp; journal:</strong> daily goals and faith journal entries you create.</li>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Security data:</strong> IP addresses, user-agent strings, and login timestamps — used solely for fraud detection and account security.</li>
        </ul>

        <h2 style={S.h2}>2. What We Do NOT Collect</h2>
        <ul style={S.ul}>
          <li style={S.li}>We do not collect or store your passwords (hashed server-side by Supabase Auth).</li>
          <li style={S.li}>We do not use tracking cookies, advertising pixels, or analytics SDKs.</li>
          <li style={S.li}>We do not sell your data to any third party, ever.</li>
          <li style={S.li}>We do not access your financial accounts or brokerage data directly.</li>
        </ul>

        <h2 style={S.h2}>3. Cookies</h2>
        <p style={S.p}>
          We use <strong style={{ color: '#DDD' }}>strictly necessary session cookies only</strong>:
        </p>
        <ul style={S.ul}>
          <li style={S.li}><code style={{ color: '#3B82F6' }}>ft_access</code> — short-lived JWT (15 min) for authentication. HttpOnly, Secure, SameSite=Strict.</li>
          <li style={S.li}><code style={{ color: '#3B82F6' }}>ft_refresh</code> — refresh token (7 days) for session renewal. HttpOnly, Secure, SameSite=Strict.</li>
          <li style={S.li}><code style={{ color: '#3B82F6' }}>ft_csrf</code> — CSRF protection token. SameSite=Strict.</li>
        </ul>
        <p style={S.p}>These cookies cannot be disabled without breaking authentication. No third-party cookies are set.</p>

        <h2 style={S.h2}>4. How We Protect Your Data</h2>
        <ul style={S.ul}>
          <li style={S.li}>All data is encrypted in transit (TLS 1.3) and at rest (AES-256 via Supabase).</li>
          <li style={S.li}>Row-Level Security (RLS) is enforced on every database table — you can only access your own data.</li>
          <li style={S.li}>Passwords are hashed using Argon2id and never stored in plain text.</li>
          <li style={S.li}>Auth tokens are stored in HttpOnly cookies only — never in localStorage or JavaScript-accessible storage.</li>
          <li style={S.li}>All login attempts are logged and accounts are locked after 5 failed attempts.</li>
        </ul>

        <h2 style={S.h2}>5. Data Retention</h2>
        <p style={S.p}>
          Your data is retained for as long as your account is active. Security logs (login attempts, audit logs) are retained for 90 days. When you delete your account, all your personal data is permanently removed within 30 days.
        </p>

        <h2 style={S.h2}>6. Your Rights</h2>
        <ul style={S.ul}>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Export:</strong> Download all your data (trades, goals, journal) at any time from Settings → Export Data.</li>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Delete:</strong> Permanently delete your account and all associated data from Settings → Delete Account.</li>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Correct:</strong> Update your profile information at any time from Settings.</li>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Portability:</strong> Export your data as JSON or CSV at any time.</li>
        </ul>

        <h2 style={S.h2}>7. Third-Party Services</h2>
        <ul style={S.ul}>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Supabase:</strong> Provides our database and authentication. Data is stored in their EU/US infrastructure. <a href="https://supabase.com/privacy" style={{ color: '#3B82F6' }} target="_blank" rel="noreferrer">Supabase Privacy Policy</a></li>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Vercel:</strong> Hosts our application. <a href="https://vercel.com/legal/privacy-policy" style={{ color: '#3B82F6' }} target="_blank" rel="noreferrer">Vercel Privacy Policy</a></li>
          <li style={S.li}><strong style={{ color: '#DDD' }}>Cloudflare Turnstile:</strong> CAPTCHA for bot protection on login/register. No personal data is shared.</li>
        </ul>

        <h2 style={S.h2}>8. Contact</h2>
        <p style={S.p}>
          For privacy questions or data requests, contact us at{' '}
          <a href="mailto:privacy@faithtrader.app" style={{ color: '#3B82F6' }}>privacy@faithtrader.app</a>
        </p>

        <hr style={S.divider} />
        <p style={{ color: '#444', fontSize: '0.8rem' }}>
          This policy may be updated periodically. Continued use of the app constitutes acceptance of the current policy.
        </p>
      </div>
    </div>
  )
}
