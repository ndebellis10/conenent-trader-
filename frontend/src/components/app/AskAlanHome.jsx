import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, ArrowRight, MessageSquare, TrendingUp,
  BarChart2, BookOpen, PlusCircle, Cross,
} from 'lucide-react'
import AlanMascot from '../AlanMascot'

const BLUE = '#3B82F6'
const card = { background: '#1E1E1E', border: '1px solid #2A2A2A', borderRadius: 14 }
const SectionHead = ({ children }) => (
  <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.05rem', margin: '0 0 14px' }}>{children}</h2>
)

/* Ask Alan home hub — a launcher that funnels into the AI + the app's tools.
   `onAsk(text)` sends a question straight into the Chat tab; `onTab(id)` switches tabs. */
export default function AskAlanHome({ name, onAsk, onTab }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const hr = new Date().getHours()
  const greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening'
  const first = String(name || 'trader').split(' ')[0]

  const ask = (text) => {
    const m = (text ?? q).trim()
    onAsk?.(m)
    setQ('')
  }

  const PILLS = [
    'How did I do this week?',
    "What's my biggest leak?",
    'Give me a pre-market plan',
    'Ask Alan anything',
  ]

  const EXPLORE = [
    { icon: MessageSquare, title: 'Chat with Alan',   desc: 'Talk through any trade, setup, or question.', go: () => onTab?.('chat') },
    { icon: Sparkles,      title: 'Trade Coach',      desc: 'Deep coaching on your recent trades.',        go: () => onTab?.('coach') },
    { icon: TrendingUp,    title: '30-Day Summary',   desc: 'See your patterns over the last month.',      go: () => onTab?.('summary') },
  ]

  const FOCUS = [
    { icon: TrendingUp, title: 'Review your weekly performance', desc: 'Your win rate, P&L, and what to tighten this week.', go: () => onTab?.('summary') },
    { icon: BarChart2,  title: 'Check your best & worst days',   desc: 'See which days of the week make and lose you money.', go: () => navigate('/app/reports') },
    { icon: BookOpen,   title: 'Update your strategies',         desc: 'Pair recent results with your rules and refine them.', go: () => navigate('/app/playbook') },
    { icon: PlusCircle, title: "Log today's trade",              desc: "Capture the lesson while it's fresh.",               go: () => navigate('/app/log') },
  ]

  const RESOURCES = [
    { title: "Read the Trader's Prayer",    desc: 'Center your heart before the session in the Faith Journal.', go: () => navigate('/app/faith') },
    { title: 'Ask for a pre-market prayer', desc: 'Let Alan write a short prayer over your trading day.',       go: () => ask('Write me a short pre-market prayer for today.') },
    { title: 'Ask what to work on',         desc: 'Get one honest, specific thing to improve right now.',       go: () => ask('Based on my trades, what is the #1 thing I should work on?') },
  ]

  return (
    <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto', padding: '8px 4px 40px' }}>
      {/* Alan watermark — faint background presence behind the whole hub */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 'min(720px, 90vw)', height: 560, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'url(/alan.png)', backgroundRepeat: 'no-repeat',
        backgroundPosition: 'top center', backgroundSize: 'contain',
        opacity: 0.06, filter: 'grayscale(0.2)',
        maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 85%)',
        WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent 85%)',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Alan — big and front-and-center */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <AlanMascot size={160} style={{ filter: 'drop-shadow(0 0 26px rgba(59,130,246,0.35))' }} />
        </div>

        {/* Greeting */}
        <h1 style={{ textAlign: 'center', fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#F5F5F5', fontSize: 'clamp(1.5rem, 3.5vw, 2.1rem)', margin: '8px 0 22px' }}>
          {greet}, <span style={{ color: BLUE }}>{first}</span>
        </h1>

        {/* Ask Alan prompt bar */}
        <div style={{ maxWidth: 640, margin: '0 auto 14px' }}>
          <style>{`.alan-ask-input:focus { border-color: transparent !important; box-shadow: none !important; outline: none !important; }`}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#1E1E1E', border: '1px solid rgba(59,130,246,0.35)', borderRadius: 16, padding: '10px 16px', boxShadow: '0 0 30px rgba(59,130,246,0.08)' }}>
            <AlanMascot size={64} style={{ filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.3))' }} />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ask() }}
              placeholder="Ask Alan anything about your trading…"
              className="alan-ask-input"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#F0F0F0', fontSize: '0.95rem', fontFamily: 'Inter, sans-serif' }}
            />
            <button onClick={() => ask()} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(59,130,246,0.9)', color: '#0F172A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Quick pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 44 }}>
          {PILLS.map(p => (
            <button key={p} onClick={() => ask(p === 'Ask Alan anything' ? '' : p)}
              style={{ background: '#242424', border: '1px solid #333', color: '#C8C8C8', borderRadius: 999, padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.5)'; e.currentTarget.style.color = BLUE }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#C8C8C8' }}>
              {p}
            </button>
          ))}
        </div>

        {/* Explore */}
        <SectionHead>Explore</SectionHead>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginBottom: 36 }}>
          {EXPLORE.map(e => (
            <button key={e.title} onClick={e.go}
              style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
              onMouseEnter={ev => { ev.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)' }}
              onMouseLeave={ev => { ev.currentTarget.style.borderColor = '#2A2A2A' }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <e.icon size={20} color={BLUE} />
              </div>
              <div>
                <div style={{ color: '#F5F5F5', fontWeight: 700, fontSize: '0.95rem' }}>{e.title}</div>
                <div style={{ color: '#888', fontSize: '0.82rem', marginTop: 2 }}>{e.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Recommended focus + Resources */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28 }}>
          <div>
            <SectionHead>Recommended focus</SectionHead>
            <div style={{ ...card, overflow: 'hidden' }}>
              {FOCUS.map((f, i) => (
                <button key={f.title} onClick={f.go}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', borderTop: i ? '1px solid #2A2A2A' : 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#191919', border: '1px solid #2A2A2A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <f.icon size={15} color={BLUE} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#E8E8E8', fontWeight: 600, fontSize: '0.86rem' }}>{f.title}</div>
                    <div style={{ color: '#777', fontSize: '0.76rem', marginTop: 1 }}>{f.desc}</div>
                  </div>
                  <ArrowRight size={15} color="#555" style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionHead>Faith &amp; resources</SectionHead>
            <div style={{ ...card, overflow: 'hidden' }}>
              {RESOURCES.map((r, i) => (
                <button key={r.title} onClick={r.go}
                  style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, background: 'none', border: 'none', borderTop: i ? '1px solid #2A2A2A' : 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}>
                  <Cross size={15} color={BLUE} style={{ flexShrink: 0, marginTop: 3 }} />
                  <div>
                    <div style={{ color: BLUE, fontWeight: 600, fontSize: '0.86rem' }}>{r.title}</div>
                    <div style={{ color: '#888', fontSize: '0.78rem', marginTop: 2, lineHeight: 1.5 }}>{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
