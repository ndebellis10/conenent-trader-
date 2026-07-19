import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Loader2, ShieldCheck, Check, ArrowRight } from 'lucide-react'
import AuthCard from '../components/AuthCard'
import FloatingVerses from '../components/FloatingVerses'
import { useAuth } from '../contexts/AuthContext'
import { useTradeStore } from '../store/tradeStore'
import { userApi } from '../lib/api'
import { motion, AnimatePresence } from 'framer-motion'

const WELCOME_VERSES = [
  { text: 'I can do all things through Christ who strengthens me.', ref: 'Philippians 4:13' },
  { text: 'Commit to the LORD whatever you do, and he will establish your plans.', ref: 'Proverbs 16:3' },
  { text: 'The plans of the diligent lead to profit as surely as haste leads to poverty.', ref: 'Proverbs 21:5' },
  { text: 'Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you.', ref: 'Joshua 1:9' },
  { text: 'Trust in the LORD with all your heart and lean not on your own understanding.', ref: 'Proverbs 3:5' },
  { text: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.', ref: '2 Timothy 1:7' },
  { text: 'The LORD will fight for you; you need only to be still.', ref: 'Exodus 14:14' },
  { text: 'Delight yourself in the LORD, and he will give you the desires of your heart.', ref: 'Psalm 37:4' },
]

function WelcomeOverlay({ name, onDone }) {
  const verse = WELCOME_VERSES[Math.floor(Math.random() * WELCOME_VERSES.length)]
  const firstName = name?.split(' ')[0] || name || 'Trader'

  useEffect(() => {
    const t = setTimeout(onDone, 5000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0a0a12',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Animated background glow */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '800px', height: '600px',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.18) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />

      {/* Particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div key={i}
          animate={{ y: [0, -30, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
          style={{
            position: 'absolute',
            left: `${(i * 137.5) % 100}%`,
            top: `${(i * 97.3) % 100}%`,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            borderRadius: '50%',
            background: i % 3 === 0 ? '#3B82F6' : '#fff',
          }}
        />
      ))}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', width: '100%' }}>
        {/* Cross */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          style={{
            fontSize: '3.5rem', marginBottom: '24px',
            filter: 'drop-shadow(0 0 24px rgba(59,130,246,0.7))',
          }}
        >✝</motion.div>

        {/* Welcome text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          <p style={{ color: '#3B82F6', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Welcome to Covenant Trader
          </p>
          <h1 style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 800,
            fontSize: 'clamp(2.2rem, 6vw, 4rem)',
            color: '#F5F5F5', lineHeight: 1.1, marginBottom: '40px',
            letterSpacing: '-0.02em',
          }}>
            Welcome,{' '}
            <span style={{
              background: 'linear-gradient(90deg, #3B82F6, #F0D080, #3B82F6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {firstName}.
            </span>
          </h1>
        </motion.div>

        {/* Bible verse card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          style={{
            background: 'rgba(59,130,246,0.06)',
            border: '1px solid rgba(59,130,246,0.25)',
            borderTop: '3px solid #3B82F6',
            borderRadius: '16px', padding: '32px 36px',
            marginBottom: '36px',
            boxShadow: '0 0 60px rgba(59,130,246,0.08)',
          }}
        >
          <blockquote style={{
            fontFamily: 'Poppins, sans-serif', fontStyle: 'italic',
            fontSize: 'clamp(1rem, 2.5vw, 1.3rem)',
            color: '#F5F5F5', lineHeight: 1.7, margin: '0 0 16px',
          }}>
            "{verse.text}"
          </blockquote>
          <cite style={{
            color: '#3B82F6', fontWeight: 700, fontSize: '0.95rem',
            fontStyle: 'normal', fontFamily: 'Poppins, sans-serif',
          }}>
            — {verse.ref}
          </cite>
        </motion.div>

        {/* Enter app button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          onClick={onDone}
          className="btn-gold"
          style={{
            padding: '14px 40px', borderRadius: 12,
            fontSize: '1rem', fontWeight: 700,
            border: 'none', cursor: 'pointer',
            boxShadow: '0 0 30px rgba(59,130,246,0.3)',
          }}
        >
          Enter the App →
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          style={{ color: '#444', fontSize: '0.8rem', marginTop: '16px' }}
        >
          Entering automatically in 5 seconds...
        </motion.p>
      </div>
    </motion.div>
  )
}

/* ── Display Name Capture — full screen after welcome overlay ── */
function DisplayNameCapture({ initialName, email, onDone }) {
  const [name,    setName]    = useState(initialName || '')
  const [saving,  setSaving]  = useState(false)
  const updateSettings = useTradeStore(s => s.updateSettings)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim() || initialName
    if (!trimmed) return
    setSaving(true)

    // 1. Save to local trade store settings
    updateSettings({ name: trimmed, email })

    // 2. Push to Supabase profile + leaderboard so admin can see it
    try { await userApi.updateProfile({ display_name: trimmed }) } catch {}
    try {
      const { syncLeaderboard } = await import('../lib/leaderboardApi')
      await syncLeaderboard(trimmed, email, [])
    } catch {}

    setSaving(false)
    onDone()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0a0a12',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px', height: '500px',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', width: '100%' }}>
        {/* Cross */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 180 }}
          style={{ fontSize: '2.8rem', marginBottom: 20, filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.6))' }}
        >✝</motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <h1 style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 800,
            fontSize: 'clamp(1.8rem, 5vw, 2.8rem)',
            color: '#F5F5F5', lineHeight: 1.1, marginBottom: 12,
          }}>
            What should we<br />
            <span style={{
              background: 'linear-gradient(90deg, #3B82F6, #F0D080, #3B82F6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              call you?
            </span>
          </h1>
          <p style={{ color: '#555', fontSize: '0.95rem', marginBottom: 36, lineHeight: 1.6 }}>
            This is your display name — it shows on your dashboard,<br />
            leaderboard, and to other traders.
          </p>
        </motion.div>

        {/* Name input */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Nick, CovenantTrader, or your full name"
            autoFocus
            maxLength={40}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)',
              border: '2px solid rgba(59,130,246,0.4)',
              borderRadius: 14, padding: '18px 22px',
              color: '#F5F5F5', fontSize: '1.2rem',
              fontFamily: 'Poppins, sans-serif', fontWeight: 600,
              outline: 'none', textAlign: 'center',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = '#3B82F6'}
            onBlur={e => e.target.style.borderColor = 'rgba(59,130,246,0.4)'}
          />

          <motion.button
            type="submit"
            disabled={saving || !name.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-gold"
            style={{
              width: '100%', padding: '16px', borderRadius: 14,
              fontSize: '1.05rem', fontWeight: 700, border: 'none',
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer',
              opacity: !name.trim() ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 0 40px rgba(59,130,246,0.25)',
            }}
          >
            {saving
              ? <><Loader2 size={20} className="animate-spin" /> Saving…</>
              : <>Let's Go <ArrowRight size={20} /></>
            }
          </motion.button>

          <button
            type="button"
            onClick={onDone}
            style={{
              background: 'none', border: 'none', color: '#3A3A3A',
              fontSize: '0.8rem', cursor: 'pointer', padding: 4,
            }}
          >
            Skip for now
          </button>
        </motion.form>
      </div>
    </motion.div>
  )
}

const schema = z.object({
  firstName:       z.string().min(1, 'First name required').max(50),
  lastName:        z.string().min(1, 'Last name required').max(50),
  email:           z.string().email('Invalid email address'),
  password:        z.string()
    .min(8,  'At least 8 characters required'),
  confirmPassword: z.string(),
  terms:           z.boolean().refine(v => v, 'You must agree to the terms'),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path:    ['confirmPassword'],
})

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

const STRENGTH_RULES = [
  { re: /.{8}/,          label: '8+ characters'     },
]

export default function SignupPage() {
  const navigate    = useNavigate()
  const { register: registerUser } = useAuth()

  const [showPw,       setShowPw]       = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [serverErr,    setServerErr]    = useState('')
  const [welcome,      setWelcome]      = useState(null)       // { name, email }
  const [captureName,  setCaptureName]  = useState(null)       // { name, email }
  const captchaRef                      = useRef(null)
  const widgetId                        = useRef(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  const pw = watch('password') || ''
  const rules = STRENGTH_RULES.map(r => ({ ...r, ok: r.re.test(pw) }))

  // Load Cloudflare Turnstile
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !captchaRef.current) return
    const existing = document.querySelector('script[src*="turnstile"]')
    if (!existing) {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      s.async = true; s.defer = true
      document.head.appendChild(s)
    }
    const iv = setInterval(() => {
      if (window.turnstile && captchaRef.current) {
        clearInterval(iv)
        widgetId.current = window.turnstile.render(captchaRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme:   'dark',
        })
      }
    }, 100)
    return () => clearInterval(iv)
  }, [])

  const onSubmit = async (data) => {
    setLoading(true)
    setServerErr('')

    let captchaToken
    if (TURNSTILE_SITE_KEY && window.turnstile) {
      captchaToken = window.turnstile.getResponse(widgetId.current) || undefined
    }

    const displayName = `${data.firstName.trim()} ${data.lastName.trim()}`
    const result = await registerUser(data.email, data.password, displayName, captchaToken)

    if (result.ok) {
      setWelcome({ name: displayName, email: data.email })
    } else {
      setServerErr(result.error || 'Registration failed')
      if (TURNSTILE_SITE_KEY && window.turnstile) window.turnstile.reset(widgetId.current)
    }
    setLoading(false)
  }

  const inp = {
    width: '100%', background: '#2E2E2E', border: '1px solid #3A3A3A',
    borderRadius: '10px', padding: '12px 16px', color: '#F5F5F5',
    fontSize: '0.9rem', fontFamily: 'Inter, sans-serif', outline: 'none',
    boxSizing: 'border-box',
  }

  // Step 3: Display name capture (after welcome overlay)
  if (captureName) {
    return (
      <AnimatePresence>
        <DisplayNameCapture
          initialName={captureName.name}
          email={captureName.email}
          onDone={() => navigate('/app/faith-ai')}
        />
      </AnimatePresence>
    )
  }

  // Step 2: Welcome overlay (after signup)
  if (welcome) {
    return (
      <AnimatePresence>
        <WelcomeOverlay
          name={welcome.name}
          onDone={() => {
            setWelcome(null)
            setCaptureName({ name: welcome.name.split(' ')[0], email: welcome.email })
          }}
        />
      </AnimatePresence>
    )
  }

  return (
    <AuthCard backdrop={<FloatingVerses />}>
      <p style={{ textAlign: 'center', color: '#A0A0A0', fontSize: '0.88rem', marginBottom: 24 }}>
        Create your free trading journal account.
      </p>

      {serverErr && (
        <div style={{
          background: 'rgba(224,82,82,0.1)', border: '1px solid rgba(224,82,82,0.3)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16,
          color: '#E05252', fontSize: '0.85rem',
        }}>
          {serverErr}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ color: '#A0A0A0', fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>First name</label>
            <input {...register('firstName')} placeholder="John" style={inp} />
            {errors.firstName && <p style={{ color: '#E05252', fontSize: '0.75rem', marginTop: 3 }}>{errors.firstName.message}</p>}
          </div>
          <div>
            <label style={{ color: '#A0A0A0', fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>Last name</label>
            <input {...register('lastName')} placeholder="Doe" style={inp} />
            {errors.lastName && <p style={{ color: '#E05252', fontSize: '0.75rem', marginTop: 3 }}>{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <label style={{ color: '#A0A0A0', fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>Email</label>
          <input {...register('email')} type="email" placeholder="you@example.com"
            autoComplete="email" style={inp} />
          {errors.email && <p style={{ color: '#E05252', fontSize: '0.75rem', marginTop: 3 }}>{errors.email.message}</p>}
        </div>

        <div>
          <label style={{ color: '#A0A0A0', fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input {...register('password')} type={showPw ? 'text' : 'password'}
              placeholder="Min 8 characters" autoComplete="new-password"
              style={{ ...inp, paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {/* Password strength indicator */}
          {pw.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '5px 10px' }}>
              {rules.map(r => (
                <span key={r.label} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: '0.72rem',
                  color: r.ok ? '#4CAF7D' : '#555',
                }}>
                  <Check size={10} /> {r.label}
                </span>
              ))}
            </div>
          )}
          {errors.password && <p style={{ color: '#E05252', fontSize: '0.75rem', marginTop: 3 }}>{errors.password.message}</p>}
        </div>

        <div>
          <label style={{ color: '#A0A0A0', fontSize: '0.82rem', display: 'block', marginBottom: 4 }}>Confirm password</label>
          <input {...register('confirmPassword')} type="password" placeholder="••••••••••••"
            autoComplete="new-password" style={inp} />
          {errors.confirmPassword && <p style={{ color: '#E05252', fontSize: '0.75rem', marginTop: 3 }}>{errors.confirmPassword.message}</p>}
        </div>

        {/* CAPTCHA */}
        {TURNSTILE_SITE_KEY && (
          <div ref={captchaRef} style={{ minHeight: 65 }} />
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <input type="checkbox" {...register('terms')} id="terms"
            style={{ marginTop: 3, accentColor: '#3B82F6', cursor: 'pointer', flexShrink: 0 }} />
          <label htmlFor="terms" style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.5, cursor: 'pointer' }}>
            I agree to the{' '}
            <Link to="/terms"   style={{ color: '#3B82F6', textDecoration: 'none' }}>Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" style={{ color: '#3B82F6', textDecoration: 'none' }}>Privacy Policy</Link>
          </label>
        </div>
        {errors.terms && <p style={{ color: '#E05252', fontSize: '0.78rem', marginTop: -8 }}>{errors.terms.message}</p>}

        <button type="submit" disabled={loading} className="btn-gold"
          style={{ width: '100%', padding: 13, borderRadius: 10, fontSize: '0.95rem', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading
            ? <><Loader2 size={17} className="animate-spin" /> Creating account…</>
            : 'Create Account'
          }
        </button>
      </form>

      <p style={{ textAlign: 'center', color: '#A0A0A0', fontSize: '0.85rem', marginTop: 16 }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>Log in</Link>
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, color: '#2A2A2A' }}>
        <ShieldCheck size={12} />
        <span style={{ fontSize: '0.7rem' }}>Password hashed with Argon2id · Data encrypted at rest</span>
      </div>
    </AuthCard>
  )
}
