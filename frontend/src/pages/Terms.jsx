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

export default function Terms() {
  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A' }}>
      <div style={S.page}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#555', fontSize: '0.85rem', textDecoration: 'none', marginBottom: 32 }}>
          <ArrowLeft size={14} /> Back
        </Link>

        <h1 style={S.h1}>Terms of Service</h1>
        <span style={S.badge}>Effective: May 2025</span>

        <p style={S.p}>
          By creating an account and using Covenant Trader, you agree to these Terms of Service. Please read them carefully.
        </p>

        <hr style={S.divider} />

        <h2 style={S.h2}>1. Service Description</h2>
        <p style={S.p}>
          Covenant Trader is a personal trading journal application that helps traders log, review, and reflect on their trades through a faith-based lens. It is a journaling tool only — it does not provide financial advice, execute trades, or access your brokerage accounts.
        </p>

        <h2 style={S.h2}>2. Not Financial Advice</h2>
        <p style={S.p}>
          <strong style={{ color: '#DDD' }}>Covenant Trader does not provide financial, investment, or trading advice.</strong> All content, tools, and features are for journaling and self-reflection purposes only. Past trade performance does not guarantee future results. Always consult a qualified financial advisor before making investment decisions.
        </p>

        <h2 style={S.h2}>3. Account Responsibilities</h2>
        <ul style={S.ul}>
          <li style={S.li}>You must be 18 years or older to use this service.</li>
          <li style={S.li}>You are responsible for maintaining the security of your account credentials.</li>
          <li style={S.li}>You must not share your account with others or use it for commercial purposes.</li>
          <li style={S.li}>You must not attempt to reverse-engineer, hack, or abuse the platform.</li>
          <li style={S.li}>One account per person. Duplicate accounts may be removed.</li>
        </ul>

        <h2 style={S.h2}>4. Acceptable Use</h2>
        <p style={S.p}>You may not use Covenant Trader to:</p>
        <ul style={S.ul}>
          <li style={S.li}>Submit false, misleading, or fraudulent trade data.</li>
          <li style={S.li}>Harass, threaten, or harm other users in the community section.</li>
          <li style={S.li}>Post illegal, defamatory, or hateful content.</li>
          <li style={S.li}>Attempt to circumvent security measures or access another user's data.</li>
          <li style={S.li}>Use automated bots or scrapers against the service.</li>
        </ul>

        <h2 style={S.h2}>5. Your Content</h2>
        <p style={S.p}>
          You retain full ownership of all trade data, journal entries, and content you create. We do not claim any ownership over your content. You grant us a limited license to store and display it to you as part of providing the service.
        </p>

        <h2 style={S.h2}>6. Data &amp; Privacy</h2>
        <p style={S.p}>
          Your use of the service is also governed by our{' '}
          <Link to="/privacy" style={{ color: '#3B82F6' }}>Privacy Policy</Link>,
          which is incorporated by reference into these Terms.
        </p>

        <h2 style={S.h2}>7. Service Availability</h2>
        <p style={S.p}>
          We strive for high availability but do not guarantee uninterrupted service. We may modify, suspend, or discontinue the service at any time with reasonable notice. We will notify users of material changes via email.
        </p>

        <h2 style={S.h2}>8. Limitation of Liability</h2>
        <p style={S.p}>
          Covenant Trader is provided "as is" without warranties of any kind. We are not liable for any trading losses, data loss, or indirect damages arising from your use of the service. Our total liability is limited to the amount you paid for the service in the past 12 months.
        </p>

        <h2 style={S.h2}>9. Termination</h2>
        <p style={S.p}>
          You may delete your account at any time from Settings. We may terminate accounts that violate these Terms. Upon termination, your data is handled as described in our Privacy Policy.
        </p>

        <h2 style={S.h2}>10. Contact</h2>
        <p style={S.p}>
          Questions about these terms? Email{' '}
          <a href="mailto:legal@faithtrader.app" style={{ color: '#3B82F6' }}>legal@faithtrader.app</a>
        </p>

        <hr style={S.divider} />
        <p style={{ color: '#444', fontSize: '0.8rem' }}>
          These terms may be updated. Continued use of the service after changes constitutes acceptance.
        </p>
      </div>
    </div>
  )
}
