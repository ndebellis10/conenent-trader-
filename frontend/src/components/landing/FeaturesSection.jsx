import { motion } from 'framer-motion'
import { BookOpen, BarChart2, Cross, Brain, Library, Heart } from 'lucide-react'

const features = [
  {
    icon: BarChart2,
    title: 'Performance Analytics',
    desc: 'Deep analytics showing win rate, profit factor, equity curve, and performance by strategy, time, and symbol.',
    color: '#4CAF7D',
    glow: 'rgba(76,175,125,0.15)',
  },
  {
    icon: BookOpen,
    title: 'Smart Trade Logging',
    desc: 'Log every trade in seconds with full entry, exit, psychology, and faith notes all in one seamless form.',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.15)',
  },
  {
    icon: Brain,
    title: 'Psychology Tracker',
    desc: 'Track emotions before and after every trade and see exactly how your mindset affects your P&L over time.',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.15)',
  },
  {
    icon: Cross,
    title: 'Scripture-Guided Insights',
    desc: 'Daily Bible verses relevant to trading discipline, patience, and wisdom to keep you grounded in every condition.',
    color: '#3B82F6',
    glow: 'rgba(59,130,246,0.15)',
  },
  {
    icon: Library,
    title: 'Trade Playbook',
    desc: 'Build and save your best setups so you always trade your plan — never your emotions or the chat.',
    color: '#38BDF8',
    glow: 'rgba(56,189,248,0.15)',
  },
  {
    icon: Heart,
    title: 'Faith Journal',
    desc: 'A private devotional space to pray, reflect, and align your trading decisions with your spiritual walk.',
    color: '#F472B6',
    glow: 'rgba(244,114,182,0.15)',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" style={{ background: '#111', padding: '120px 0', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '800px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="max-w-7xl mx-auto px-6" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: 'center', marginBottom: 72 }}
        >
          <div style={{
            display: 'inline-block', background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 999, padding: '5px 16px',
            color: '#3B82F6', fontSize: '11px', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20,
          }}>
            Everything You Need
          </div>
          <h2 style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 800,
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: '#F5F5F5', marginBottom: 16,
            letterSpacing: '-0.02em',
          }}>
            Trade Smarter.<br />
            <span style={{ color: '#3B82F6' }}>Live Stronger.</span>
          </h2>
          <p style={{ color: '#666', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.7 }}>
            Every tool you need to master your trading performance and deepen your faith — in one place.
          </p>
        </motion.div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              style={{
                background: 'linear-gradient(160deg, #1C1C1C 0%, #181818 100%)',
                borderRadius: 16,
                border: '1px solid #2A2A2A',
                padding: '28px',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                width: '300px',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = f.color + '40'
                e.currentTarget.style.boxShadow = `0 20px 60px ${f.glow}`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#2A2A2A'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {/* Corner glow */}
              <div style={{
                position: 'absolute', top: -40, right: -40,
                width: 120, height: 120, borderRadius: '50%',
                background: `radial-gradient(circle, ${f.glow} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              {/* Icon */}
              <div style={{
                width: 52, height: 52,
                background: `${f.color}15`,
                border: `1px solid ${f.color}30`,
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <f.icon size={24} color={f.color} />
              </div>

              {/* Number */}
              <div style={{
                position: 'absolute', top: 24, right: 24,
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px', color: '#333', fontWeight: 700,
              }}>
                0{i + 1}
              </div>

              <h3 style={{
                fontFamily: 'Poppins, sans-serif', fontWeight: 700,
                color: '#F5F5F5', fontSize: '1.05rem', marginBottom: 10,
              }}>
                {f.title}
              </h3>
              <p style={{ color: '#666', lineHeight: 1.65, fontSize: '0.88rem' }}>
                {f.desc}
              </p>

              {/* Bottom accent line */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)`,
              }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
