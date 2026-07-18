import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

/* Minimal community welcome — logo, one-line tagline, Log In / Sign Up.
   The full marketing landing (Hero/Features/etc.) still lives in
   components/landing/ but is intentionally no longer mounted here. */
export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: '#0A0E1A', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>

      {/* Ambient blue glow */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 700, filter: 'blur(90px)', background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.22), transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: 700, height: 600, filter: 'blur(100px)', background: 'radial-gradient(ellipse, rgba(37,99,235,0.16), transparent 65%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(0,0,0,0.85) 100%)' }} />
      </div>

      {/* Centered welcome */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px', position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}
        >
          <img
            src="/landing-logo.webp"
            alt="Covenant Trader"
            width={120}
            height={120}
            style={{ borderRadius: 24, boxShadow: '0 12px 40px rgba(59,130,246,0.35)', display: 'block' }}
          />
          <span style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#3B82F6',
            fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', letterSpacing: '0.03em',
            textShadow: '0 1px 3px rgba(0,0,0,0.4)',
          }}>
            Covenant Trader
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
          style={{ color: '#9BB0CC', fontSize: 'clamp(1rem, 2.5vw, 1.3rem)', marginTop: 20, maxWidth: 520, lineHeight: 1.6 }}
        >
          Your trading journal — built on discipline and faith.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 40 }}
        >
          <button
            onClick={() => navigate('/login')}
            className="btn-gold"
            style={{ padding: '14px 34px', borderRadius: 12, fontSize: '1rem', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 30px rgba(59,130,246,0.3)' }}
          >
            Log In <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate('/signup')}
            style={{ padding: '14px 34px', borderRadius: 12, fontSize: '1rem', fontWeight: 600, background: 'transparent', border: '1px solid #2A3A55', color: '#B8C6DC', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3B82F6'; e.currentTarget.style.color = '#3B82F6' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A3A55'; e.currentTarget.style.color = '#B8C6DC' }}
          >
            Sign Up
          </button>
        </motion.div>
      </main>

      {/* Slim footer */}
      <footer style={{ position: 'relative', zIndex: 1, padding: '20px 24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ color: '#4A5A70', fontSize: '0.8rem' }}>© {new Date().getFullYear()} Covenant Trader</span>
        <span style={{ color: '#3B4A60', fontSize: '0.8rem', margin: '0 8px' }}>·</span>
        <span style={{ color: '#3B82F6', fontSize: '0.8rem' }}>✝</span>
        <span style={{ color: '#4A5A70', fontSize: '0.8rem', marginLeft: 6 }}>Built with discipline</span>
      </footer>
    </div>
  )
}
