import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const plans = [
  {
    name: 'Free', price: '$0', period: '/month', badge: null, highlight: false,
    features: ['Up to 50 trades/month', 'Basic analytics', 'Trade log', 'Faith journal'],
    cta: 'Get Started Free', ctaStyle: 'outline',
  },
  {
    name: 'Pro', price: '$19', period: '/month', badge: 'Most Popular', highlight: true,
    features: ['Unlimited trades', 'Full analytics suite', 'Trade playbook', 'Psychology tracker', 'Priority support', 'All faith features'],
    cta: 'Start Free Trial', ctaStyle: 'solid',
  },
  {
    name: 'Annual', price: '$149', period: '/year', badge: 'Best Value', highlight: true,
    features: ['Everything in Pro', 'Save $79/year', 'Priority onboarding', '1:1 strategy session'],
    cta: 'Start Free Trial', ctaStyle: 'solid',
  },
]

export default function PricingSection() {
  const navigate = useNavigate()
  return (
    <section id="pricing" style={{ background: '#242424', padding: '100px 0' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', color: '#F5F5F5', marginBottom: '8px' }}>Simple, Honest Pricing.</h2>
        </motion.div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', maxWidth: '900px', margin: '0 auto' }}>
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{
                background: '#1A1A1A', borderRadius: '16px',
                border: plan.highlight ? '2px solid #3B82F6' : '1px solid #3A3A3A',
                padding: '32px', position: 'relative',
                boxShadow: plan.highlight ? '0 0 30px rgba(59,130,246,0.15)' : 'none',
              }}
            >
              {plan.badge && (
                <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#3B82F6', color: '#FFFFFF', borderRadius: '999px', padding: '4px 14px', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {plan.badge}
                </div>
              )}
              <div style={{ marginBottom: '8px', color: '#A0A0A0', fontSize: '0.9rem', fontWeight: 600 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '2.5rem', color: '#3B82F6' }}>{plan.price}</span>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>{plan.period}</span>
              </div>
              <div style={{ borderTop: '1px solid #3A3A3A', margin: '20px 0' }}/>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F5F5F5', fontSize: '0.9rem' }}>
                    <Check size={16} color="#4CAF7D" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/signup')}
                className={plan.ctaStyle === 'solid' ? 'btn-gold' : 'btn-gold-outline'}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '0.95rem', cursor: 'pointer' }}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '0.85rem', marginTop: '24px' }}>
          All plans include a 14-day free trial. No credit card required.
        </p>
      </div>
    </section>
  )
}
