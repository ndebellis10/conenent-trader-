import { motion } from 'framer-motion'

const testimonials = [
  { quote: "Covenant Trader changed how I approach the markets. Having scripture right there while I journal keeps me accountable and grounded. My win rate has gone up 18% since I started using it.", name: "Marcus T.", role: "Swing Trader" },
  { quote: "I tried TradeZella and other journals but nothing felt right until Covenant Trader. The faith section after every trade is something I didn't know I needed.", name: "Daniela R.", role: "Forex Trader" },
  { quote: "The analytics are just as good as any premium journal out there, but the Christian foundation makes it different. This is the one.", name: "James W.", role: "Futures Trader" },
]

export default function TestimonialsSection() {
  return (
    <section id="testimonials" style={{ background: '#1A1A1A', padding: '100px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#F5F5F5', marginBottom: '8px' }}>
            What Traders Are Saying.
          </h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', borderLeft: '4px solid #3B82F6', padding: '28px' }}
            >
              <div style={{ color: '#3B82F6', fontSize: '18px', marginBottom: '12px' }}>★★★★★</div>
              <p style={{ color: '#F5F5F5', fontStyle: 'italic', lineHeight: 1.7, marginBottom: '20px', fontSize: '0.95rem' }}>"{t.quote}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `hsl(${i*80+30},40%,40%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F5F5F5', fontWeight: 600, fontSize: '14px' }}>
                  {t.name[0]}
                </div>
                <div>
                  <div style={{ color: '#F5F5F5', fontWeight: 600, fontSize: '0.9rem' }}>{t.name}</div>
                  <div style={{ color: '#3B82F6', fontSize: '0.8rem' }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
