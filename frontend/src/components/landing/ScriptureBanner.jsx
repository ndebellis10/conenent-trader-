import { motion } from 'framer-motion'

export default function ScriptureBanner() {
  return (
    <section style={{ background: '#080808', padding: '100px 0', position: 'relative', overflow: 'hidden' }}>

      {/* Gold gradient border top & bottom */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)',
      }} />
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)',
      }} />

      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: '800px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(59,130,246,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="max-w-4xl mx-auto px-6 text-center" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Decorative lines */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40, justifyContent: 'center' }}>
            <div style={{ flex: 1, maxWidth: 120, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4))' }} />
            <motion.span
              animate={{ textShadow: ['0 0 10px rgba(59,130,246,0.3)', '0 0 30px rgba(59,130,246,0.7)', '0 0 10px rgba(59,130,246,0.3)'] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{ fontSize: '2.5rem', color: '#3B82F6' }}
            >✝</motion.span>
            <div style={{ flex: 1, maxWidth: 120, height: '1px', background: 'linear-gradient(90deg, rgba(59,130,246,0.4), transparent)' }} />
          </div>

          <blockquote style={{
            fontFamily: 'Poppins, sans-serif', fontStyle: 'italic',
            fontSize: 'clamp(1.3rem, 3vw, 2rem)',
            color: '#F5F5F5', lineHeight: 1.65, marginBottom: 24,
            fontWeight: 300,
          }}>
            "The plans of the diligent lead to profit<br />
            as surely as haste leads to poverty."
          </blockquote>

          <cite style={{
            fontFamily: 'JetBrains Mono, monospace',
            color: '#3B82F6', fontSize: '0.9rem',
            fontStyle: 'normal', fontWeight: 600, letterSpacing: '0.08em',
          }}>
            — PROVERBS 21:5
          </cite>

          <div style={{
            marginTop: 48, display: 'flex', justifyContent: 'center',
            alignItems: 'center', gap: 40, flexWrap: 'wrap',
          }}>
            {[
              { label: 'Trades Logged', value: '50,000+' },
              { label: 'Active Traders', value: '2,000+' },
              { label: 'Win Rate Avg', value: '61.4%' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '2rem', fontWeight: 800, color: '#3B82F6',
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
                <div style={{ color: '#444', fontSize: '0.8rem', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
