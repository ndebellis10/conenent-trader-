import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import Logo from '../components/Logo'

export default function WelcomePage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const name = state?.name || 'Trader'

  return (
    <div style={{ minHeight: '100vh', background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <Logo size={120} showText layout="column" />
        </div>
        <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#F5F5F5', marginBottom: '8px' }}>
          Welcome to Covenant Trader,<br />
          <span style={{ color: '#3B82F6' }}>{name}.</span>
        </h1>
        <p style={{ color: '#A0A0A0', fontSize: '1.1rem', marginBottom: '32px' }}>Your journey starts now.</p>
        <blockquote style={{ fontFamily: 'Poppins, sans-serif', fontStyle: 'italic', color: '#3B82F6', fontSize: '1.2rem', marginBottom: '40px', lineHeight: 1.6 }}>
          "I can do all things through Christ who strengthens me."
          <br /><span style={{ fontSize: '0.9em', opacity: 0.8 }}>— Philippians 4:13</span>
        </blockquote>
        <button onClick={() => navigate('/app')} className="btn-gold" style={{ padding: '14px 40px', borderRadius: '12px', fontSize: '1rem', border: 'none', cursor: 'pointer' }}>
          Go to Dashboard →
        </button>
      </motion.div>
    </div>
  )
}
