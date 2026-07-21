import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2, ShieldCheck, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUsdNews, impactMeta } from '../lib/usdNews'
import AuthCard from '../components/AuthCard'
import FloatingVerses from '../components/FloatingVerses'
import { useAuth } from '../contexts/AuthContext'
import { useTradeStore } from '../store/tradeStore'

const GRATITUDE_VERSES = [
  { text: 'Give thanks to the LORD, for he is good; his love endures forever.', ref: 'Psalm 107:1' },
  { text: 'I will give thanks to you, LORD, with all my heart; I will tell of all your wonderful deeds.', ref: 'Psalm 9:1' },
  { text: 'Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name.', ref: 'Psalm 100:4' },
  { text: 'Give thanks in all circumstances; for this is God\'s will for you in Christ Jesus.', ref: '1 Thessalonians 5:18' },
  { text: 'The LORD is my strength and my shield; my heart trusts in him, and he helps me.', ref: 'Psalm 28:7' },
  { text: 'Rejoice always, pray continually, give thanks in all circumstances.', ref: '1 Thessalonians 5:16-18' },
  { text: 'Let the peace of Christ rule in your hearts… and be thankful.', ref: 'Colossians 3:15' },
  { text: 'Every good and perfect gift is from above, coming down from the Father of the heavenly lights.', ref: 'James 1:17' },
  { text: 'Oh, give thanks to the LORD, for He is good! For His mercy endures forever.', ref: '1 Chronicles 16:34' },
  { text: 'The LORD has done great things for us, and we are filled with joy.', ref: 'Psalm 126:3' },
]

/* Today's remaining Forex Factory (USD) news, shown on the welcome-back
   screen so traders see what's coming before they start. Hidden entirely when
   the feed is empty/unavailable so it never shows a broken box. */
function UpcomingNews() {
  const { todaysEvents, loading } = useUsdNews()
  const now = Date.now()
  const upcoming = todaysEvents.filter(ev => ev._et.allDay || ev._et.ts > now).slice(0, 4)

  if (loading || !todaysEvents.length) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.1, duration: 0.6 }}
      style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid #2A2A2A',
        borderRadius: 14, padding: '16px 20px', marginBottom: 32, textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: upcoming.length ? 12 : 0 }}>
        <Calendar size={14} color="#3B82F6" />
        <span style={{ color: '#B0B0B0', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Coming up today — USD news
        </span>
      </div>
      {upcoming.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {upcoming.map((ev, i) => {
            const im = impactMeta(ev.impact)
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ color: '#8A8A8A', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem', width: 66, flexShrink: 0 }}>
                  {ev._et.time || '—'}
                </span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: im.color, flexShrink: 0 }} />
                <span style={{ color: '#E4E4E4', fontSize: '0.83rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ev.title}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <span style={{ color: '#6E6E6E', fontSize: '0.8rem' }}>No major USD news left today. Clear runway.</span>
      )}
    </motion.div>
  )
}

function WelcomeBackOverlay({ name, onDone }) {
  const verse     = GRATITUDE_VERSES[Math.floor(Math.random() * GRATITUDE_VERSES.length)]
  const firstName = (name && name !== 'Trader') ? name.split(' ')[0] : name || 'Trader'


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
          style={{ fontSize: '3.5rem', marginBottom: '24px', filter: 'drop-shadow(0 0 24px rgba(59,130,246,0.7))' }}
        >✝</motion.div>

        {/* Welcome back text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          <p style={{ color: '#3B82F6', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Welcome Back
          </p>
          <h1 style={{
            fontFamily: 'Poppins, sans-serif', fontWeight: 800,
            fontSize: 'clamp(2.2rem, 6vw, 4rem)',
            color: '#F5F5F5', lineHeight: 1.1, marginBottom: '40px',
            letterSpacing: '-0.02em',
          }}>
            Good to see you,{' '}
            <span style={{
              background: 'linear-gradient(90deg, #3B82F6, #F0D080, #3B82F6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {firstName}.
            </span>
          </h1>
        </motion.div>

        {/* Gratitude verse card */}
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

        {/* Upcoming Forex Factory (USD) news for today */}
        <UpcomingNews />

        {/* Enter button */}
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
          Enter CovenantTrader →
        </motion.button>
      </div>
    </motion.div>
  )
}

const schema = z.object({
  email:    z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

const VERSES = [
  '"Be strong and courageous. Do not be afraid; do not be discouraged." — Joshua 1:9',
  '"I can do all things through Christ who strengthens me." — Philippians 4:13',
  '"Commit to the LORD whatever you do, and he will establish your plans." — Proverbs 16:3',
]

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY




export default function LoginPage() {
  const navigate      = useNavigate()
  const location      = useLocation()
  const { login }     = useAuth()
  const settingsName  = useTradeStore(s => s.settings?.name)

  const [showPw,       setShowPw]       = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [serverErr,    setServerErr]    = useState('')
  const [showWelcome,  setShowWelcome]  = useState(false)
  const captchaRef                      = useRef(null)
  const widgetId                        = useRef(null)
  const pendingNav                      = useRef(null)

  const from  = location.state?.from?.pathname || '/app'
  const verse = VERSES[Math.floor(Date.now() / 30000) % VERSES.length]

  const handleWelcomeDone = useCallback(() => {
    setShowWelcome(false)
    // Always land on the AI home, whatever page sent them to login
    navigate('/app/faith-ai', { replace: true })
  }, [navigate])

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  // Load Cloudflare Turnstile widget
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !captchaRef.current) return
    const existing = document.querySelector('script[src*="turnstile"]')
    if (!existing) {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      s.async = true
      s.defer = true
      document.head.appendChild(s)
    }
    const interval = setInterval(() => {
      if (window.turnstile && captchaRef.current) {
        clearInterval(interval)
        widgetId.current = window.turnstile.render(captchaRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme:   'dark',
        })
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const onSubmit = async (data) => {
    setLoading(true)
    setServerErr('')

    let captchaToken
    if (TURNSTILE_SITE_KEY && window.turnstile) {
      captchaToken = window.turnstile.getResponse(widgetId.current) || undefined
    }

    const result = await login(data.email, data.password, captchaToken)

    if (result.ok) {
      pendingNav.current = from
      setShowWelcome(true)
    } else {
      setServerErr(result.error || 'Login failed')
      if (TURNSTILE_SITE_KEY && window.turnstile) {
        window.turnstile.reset(widgetId.current)
      }
    }
    setLoading(false)
  }

  const inp = {
    width: '100%', background: '#2E2E2E', border: '1px solid #3A3A3A',
    borderRadius: '10px', padding: '12px 16px', color: '#F5F5F5',
    fontSize: '0.95rem', fontFamily: 'Inter, sans-serif', outline: 'none',
  }

  return (
    <>
    <AnimatePresence>
      {showWelcome && (
        <WelcomeBackOverlay
          name={settingsName}
          onDone={handleWelcomeDone}
        />
      )}
    </AnimatePresence>

    <AuthCard backdrop={<FloatingVerses />}>
      <p style={{ textAlign: 'center', color: '#A0A0A0', fontSize: '0.9rem', marginBottom: '28px' }}>
        Welcome back. Trade with purpose.
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

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ color: '#A0A0A0', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Email</label>
          <input {...register('email')} type="email" placeholder="you@example.com"
            autoComplete="email" style={inp} />
          {errors.email && <p style={{ color: '#E05252', fontSize: '0.8rem', marginTop: 4 }}>{errors.email.message}</p>}
        </div>

        <div>
          <label style={{ color: '#A0A0A0', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input {...register('password')} type={showPw ? 'text' : 'password'}
              placeholder="••••••••" autoComplete="current-password"
              style={{ ...inp, paddingRight: '44px' }} />
            <button type="button" onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p style={{ color: '#E05252', fontSize: '0.8rem', marginTop: 4 }}>{errors.password.message}</p>}
          <div style={{ textAlign: 'right', marginTop: 6 }}>
            <Link to="/forgot-password" style={{ color: '#3B82F6', fontSize: '0.8rem', textDecoration: 'none' }}>
              Forgot Password?
            </Link>
          </div>
        </div>

        {/* Cloudflare Turnstile CAPTCHA */}
        {TURNSTILE_SITE_KEY && (
          <div ref={captchaRef} style={{ minHeight: 65 }} />
        )}

        <button type="submit" disabled={loading} className="btn-gold"
          style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '1rem', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: 4 }}>
          {loading
            ? <><Loader2 size={18} className="animate-spin" /> Logging in…</>
            : 'Log In'
          }
        </button>
      </form>

      <p style={{ textAlign: 'center', color: '#A0A0A0', fontSize: '0.85rem', marginTop: '20px' }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ color: '#3B82F6', textDecoration: 'none', fontWeight: 600 }}>Sign up free</Link>
      </p>

      {/* Security indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20, color: '#2A2A2A' }}>
        <ShieldCheck size={13} />
        <span style={{ fontSize: '0.72rem' }}>256-bit encrypted · Sessions expire in 15 min</span>
      </div>

      <p style={{ textAlign: 'center', color: '#555', fontSize: '0.78rem', fontStyle: 'italic', marginTop: '16px', lineHeight: 1.5 }}>
        {verse}
      </p>
    </AuthCard>
    </>
  )
}
