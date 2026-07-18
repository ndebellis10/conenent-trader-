import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Star } from 'lucide-react'

export default function CTASection() {
  const navigate = useNavigate()

  return (
    <section style={{ background: '#0E0E0E', padding: '140px 0', position: 'relative', overflow: 'hidden' }}>

      {/* Dramatic background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* Big central glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px', height: '700px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 65%)',
        }} />
        {/* Spinning ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600, height: 600, borderRadius: '50%',
            border: '1px solid rgba(59,130,246,0.06)',
            marginTop: -300, marginLeft: -300,
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 400, height: 400, borderRadius: '50%',
            border: '1px solid rgba(59,130,246,0.08)',
            marginTop: -200, marginLeft: -200,
          }}
        />
        {/* Grid */}
        <svg width="100%" height="100%" style={{ opacity: 0.03 }}>
          <defs>
            <pattern id="cta-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#3B82F6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-grid)"/>
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Cross */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              fontSize: '3rem', marginBottom: 24,
              filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.5))',
            }}
          >
            ✝
          </motion.div>

          <h2 style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 800,
            fontSize: 'clamp(2.2rem, 5vw, 4rem)',
            color: '#F5F5F5', marginBottom: 20,
            letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>
            Your Next Trade<br />
            <span style={{
              background: 'linear-gradient(90deg, #3B82F6, #F0D080, #3B82F6)',
              backgroundSize: '200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Could Change Everything.
            </span>
          </h2>

          <p style={{ color: '#555', fontSize: '1.1rem', marginBottom: 48, maxWidth: '500px', margin: '0 auto 48px', lineHeight: 1.7 }}>
            Join thousands of traders who have combined elite performance analytics with daily faith practice.
          </p>

          {/* Stars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 32 }}>
            {[...Array(5)].map((_, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.08 }}>
                <Star size={18} fill="#3B82F6" color="#3B82F6" />
              </motion.div>
            ))}
          </div>
          <p style={{ color: '#444', fontSize: '0.85rem', marginBottom: 48, fontStyle: 'italic' }}>
            "This app changed how I trade and how I pray." — Marcus T.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <motion.button
              onClick={() => navigate('/signup')}
              className="btn-gold"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '18px 48px', borderRadius: 14,
                fontSize: '1.1rem', fontWeight: 700,
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 0 50px rgba(59,130,246,0.25), 0 20px 40px rgba(0,0,0,0.4)',
              }}
            >
              Start For Free <ArrowRight size={20} />
            </motion.button>
            <p style={{ color: '#444', fontSize: '0.82rem' }}>
              No credit card required · Takes 30 seconds
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
