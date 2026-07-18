import { motion } from 'framer-motion'
import { UserPlus, PenLine, TrendingUp } from 'lucide-react'

const steps = [
  {
    icon: UserPlus,
    num: '01',
    title: 'Create Your Free Account',
    sub: 'Sign up in seconds with your email. No credit card, no commitment — just start.',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.2)',
  },
  {
    icon: PenLine,
    num: '02',
    title: 'Log Your First Trade',
    sub: 'Enter trade details, your emotional state, scripture, and faith reflection in one place.',
    color: '#4CAF7D',
    glow: 'rgba(76,175,125,0.2)',
  },
  {
    icon: TrendingUp,
    num: '03',
    title: 'Watch Yourself Grow',
    sub: 'Analytics, psychology patterns, equity curves, and faith scores update in real time.',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.2)',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" style={{ background: '#0E0E0E', padding: '120px 0', position: 'relative', overflow: 'hidden' }}>

      {/* Background lines */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04 }}>
        <svg width="100%" height="100%">
          <defs>
            <pattern id="hiw-grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#3B82F6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hiw-grid)"/>
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: 80 }}
        >
          <div style={{
            display: 'inline-block', background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 999, padding: '5px 16px',
            color: '#3B82F6', fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20,
          }}>
            How It Works
          </div>
          <h2 style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 800,
            fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#F5F5F5',
            letterSpacing: '-0.02em', marginBottom: 12,
          }}>
            Up & Running in <span style={{ color: '#3B82F6' }}>3 Minutes.</span>
          </h2>
          <p style={{ color: '#555', fontSize: '1rem', maxWidth: '400px', margin: '0 auto' }}>
            No complicated setup. Just log, learn, and grow.
          </p>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2px', position: 'relative' }}>

          {/* Connecting line */}
          <div className="hidden md:block" style={{
            position: 'absolute', top: '80px', left: '20%', right: '20%', height: '2px',
            background: 'linear-gradient(90deg, rgba(59,130,246,0.3), rgba(76,175,125,0.3), rgba(59,130,246,0.3))',
            zIndex: 0,
          }} />

          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative', zIndex: 1, padding: '4px' }}
            >
              <div style={{
                background: 'linear-gradient(160deg, #1A1A1A, #141414)',
                border: '1px solid #242424',
                borderRadius: 20, padding: '40px 32px',
                textAlign: 'center',
                height: '100%',
              }}>
                {/* Glowing number */}
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '11px', fontWeight: 700,
                  color: step.color, letterSpacing: '0.15em',
                  marginBottom: 24, opacity: 0.8,
                }}>
                  STEP {step.num}
                </div>

                {/* Icon circle */}
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: `${step.color}12`,
                    border: `2px solid ${step.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 28px',
                    boxShadow: `0 0 30px ${step.glow}`,
                  }}
                >
                  <step.icon size={28} color={step.color} />
                </motion.div>

                <h3 style={{
                  fontFamily: 'Poppins, sans-serif', fontWeight: 700,
                  color: '#F5F5F5', fontSize: '1.1rem', marginBottom: 12,
                }}>
                  {step.title}
                </h3>
                <p style={{ color: '#555', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {step.sub}
                </p>

                {/* Bottom glow line */}
                <div style={{
                  height: 3, borderRadius: 99, marginTop: 28,
                  background: `linear-gradient(90deg, transparent, ${step.color}50, transparent)`,
                }} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
