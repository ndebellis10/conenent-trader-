import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, ArrowRight, MessageSquare, TrendingUp,
  BarChart2, BookOpen, PlusCircle, Cross,
} from 'lucide-react'
import AlanMascot from '../AlanMascot'

const BLUE  = '#3B82F6'
const SKY   = '#5B9BD5'
const GREEN = '#4CAF7D'

/* Ask Alan home hub. `onAsk(text)` sends a question straight into the Chat
   section; `onTab(id)` switches sections. */
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
  ]

  const EXPLORE = [
    { icon: MessageSquare, accent: BLUE,  title: 'Chat with Alan', desc: 'Talk through any trade, setup, or question.', go: () => onTab?.('chat') },
    { icon: Sparkles,      accent: SKY,  title: 'Trade Coach',    desc: 'Deep coaching on your recent trades.',       go: () => onTab?.('coach') },
    { icon: TrendingUp,    accent: GREEN, title: '30-Day Summary', desc: 'See your patterns over the last month.',     go: () => onTab?.('summary') },
  ]

  const FOCUS = [
    { icon: TrendingUp, title: 'Review your weekly performance', desc: 'Win rate, P&L, and what to tighten this week.',   go: () => onTab?.('summary') },
    { icon: BarChart2,  title: 'Check your best & worst days',   desc: 'Which days of the week make and lose you money.', go: () => navigate('/app/reports') },
    { icon: BookOpen,   title: 'Update your strategies',         desc: 'Pair recent results with your rules.',            go: () => navigate('/app/playbook') },
    { icon: PlusCircle, title: "Log today's trade",              desc: "Capture the lesson while it's fresh.",            go: () => navigate('/app/log') },
  ]

  const RESOURCES = [
    { title: "Read the Trader's Prayer",    desc: 'Center your heart before the session.',             go: () => navigate('/app/faith') },
    { title: 'Ask for a pre-market prayer', desc: 'A short prayer over your trading day.',             go: () => ask('Write me a short pre-market prayer for today.') },
    { title: 'Ask what to work on',         desc: 'One honest, specific thing to improve right now.',  go: () => ask('Based on my trades, what is the #1 thing I should work on?') },
  ]

  return (
    <div className="alanhome">
      <style>{`
        .alanhome { max-width: 1080px; margin: 0 auto; }

        /* ── Hero ── */
        .alanhome-hero {
          position: relative; overflow: hidden;
          border: 1px solid #2C2C2C; border-radius: 20px;
          background:
            radial-gradient(90% 120% at 18% 10%, rgba(59,130,246,0.16), transparent 62%),
            linear-gradient(180deg, #212121 0%, #171717 100%);
          padding: 34px 38px;
          display: grid; grid-template-columns: auto minmax(0, 1fr);
          gap: 34px; align-items: center;
        }
        .alanhome-stage { position: relative; display: flex; justify-content: center; }
        /* soft pool of light under Alan so he's standing on something */
        .alanhome-stage::after {
          content: ''; position: absolute; left: 50%; bottom: -6px;
          width: 150px; height: 26px; transform: translateX(-50%);
          background: radial-gradient(ellipse, rgba(59,130,246,0.28), transparent 70%);
          filter: blur(6px);
        }
        .alanhome-greet {
          font-family: Poppins, sans-serif; font-weight: 800; color: #F5F5F5;
          font-size: clamp(1.5rem, 3vw, 2.15rem); margin: 0 0 6px; line-height: 1.15;
        }
        .alanhome-sub { color: #8A8A8A; font-size: 0.9rem; margin: 0 0 20px; }

        /* ── Ask bar ── */
        .alanhome-ask {
          display: flex; align-items: center; gap: 10px;
          background: #141414; border: 1px solid #333; border-radius: 14px;
          padding: 6px 6px 6px 18px; transition: border-color .18s, box-shadow .18s;
        }
        .alanhome-ask:focus-within {
          border-color: rgba(59,130,246,0.55);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
        }
        .alanhome-ask input {
          flex: 1; background: none; border: none; outline: none;
          color: #F0F0F0; font-size: 0.95rem; font-family: Inter, sans-serif;
          padding: 12px 0; min-width: 0;
        }
        .alanhome-ask input::placeholder { color: #5C5C5C; }
        .alanhome-send {
          width: 40px; height: 40px; border-radius: 10px; border: none; flex-shrink: 0;
          background: ${BLUE}; color: #0B1220; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: transform .15s, filter .15s;
        }
        .alanhome-send:hover { filter: brightness(1.12); transform: translateX(1px); }

        .alanhome-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
        .alanhome-pill {
          background: rgba(255,255,255,0.04); border: 1px solid #333; color: #9A9A9A;
          border-radius: 999px; padding: 7px 15px; font-size: 0.8rem; font-weight: 600;
          cursor: pointer; transition: all .15s;
        }
        .alanhome-pill:hover { border-color: rgba(59,130,246,0.5); color: ${BLUE}; background: rgba(59,130,246,0.07); }

        /* ── Section headings ── */
        .alanhome-eyebrow {
          display: block; color: #5A5A5A; font-size: 0.67rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.14em; margin: 40px 0 14px;
        }

        /* ── Explore cards ── */
        .alanhome-explore { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .alanhome-card {
          position: relative; overflow: hidden; text-align: left; cursor: pointer;
          border: 1px solid #2A2A2A; border-radius: 16px;
          background: linear-gradient(180deg, #1F1F1F, #1A1A1A);
          padding: 20px; transition: transform .18s, border-color .18s, box-shadow .18s;
        }
        .alanhome-card:hover { transform: translateY(-3px); box-shadow: 0 10px 26px rgba(0,0,0,0.4); }
        .alanhome-card-glow {
          position: absolute; inset: 0 0 auto 0; height: 90px; opacity: .5;
          pointer-events: none;
        }
        .alanhome-icon {
          width: 40px; height: 40px; border-radius: 11px; margin-bottom: 14px;
          display: flex; align-items: center; justify-content: center;
        }
        .alanhome-card h3 { color: #F2F2F2; font-weight: 700; font-size: 0.95rem; margin: 0 0 4px; }
        .alanhome-card p  { color: #7E7E7E; font-size: 0.82rem; margin: 0; line-height: 1.5; }
        .alanhome-card-arrow { position: absolute; right: 18px; bottom: 18px; opacity: 0; transition: opacity .18s, transform .18s; }
        .alanhome-card:hover .alanhome-card-arrow { opacity: 1; transform: translateX(3px); }

        /* ── Two-column lists ── */
        .alanhome-cols { display: grid; grid-template-columns: 1.15fr 1fr; gap: 34px; }
        .alanhome-list { border: 1px solid #2A2A2A; border-radius: 16px; overflow: hidden; background: #1C1C1C; }
        .alanhome-row {
          width: 100%; display: flex; align-items: center; gap: 13px; text-align: left;
          padding: 15px 17px; background: none; border: none; cursor: pointer;
          transition: background .15s;
        }
        .alanhome-row + .alanhome-row { border-top: 1px solid #262626; }
        .alanhome-row:hover { background: rgba(59,130,246,0.06); }
        .alanhome-row-ico {
          width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
          background: #232323; border: 1px solid #303030;
          display: flex; align-items: center; justify-content: center;
        }
        .alanhome-row-t { color: #E6E6E6; font-weight: 600; font-size: 0.87rem; }
        .alanhome-row-d { color: #6E6E6E; font-size: 0.77rem; margin-top: 2px; }

        @media (max-width: 900px) {
          .alanhome-hero { grid-template-columns: 1fr; text-align: center; padding: 28px 22px; gap: 20px; }
          .alanhome-pills { justify-content: center; }
          .alanhome-explore { grid-template-columns: 1fr; }
          .alanhome-cols { grid-template-columns: 1fr; gap: 24px; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div className="alanhome-hero">
        <div className="alanhome-stage">
          <AlanMascot size={190} style={{ filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.55))' }} />
        </div>

        <div style={{ minWidth: 0 }}>
          <h1 className="alanhome-greet">
            {greet}, <span style={{ color: BLUE }}>{first}</span>
          </h1>
          <p className="alanhome-sub">I've read your journal. Ask me anything — or pick up where you left off.</p>

          <div className="alanhome-ask">
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') ask() }}
              placeholder="Ask Alan anything about your trading…"
            />
            <button className="alanhome-send" onClick={() => ask()} aria-label="Ask Alan">
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="alanhome-pills">
            {PILLS.map(p => (
              <button key={p} className="alanhome-pill" onClick={() => ask(p)}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Explore ── */}
      <span className="alanhome-eyebrow">Explore</span>
      <div className="alanhome-explore">
        {EXPLORE.map(e => (
          <button key={e.title} className="alanhome-card" onClick={e.go}
            onMouseEnter={ev => { ev.currentTarget.style.borderColor = `${e.accent}55` }}
            onMouseLeave={ev => { ev.currentTarget.style.borderColor = '#2A2A2A' }}>
            <div className="alanhome-card-glow" style={{ background: `radial-gradient(70% 100% at 50% 0%, ${e.accent}22, transparent 70%)` }} />
            <div className="alanhome-icon" style={{ background: `${e.accent}1A`, border: `1px solid ${e.accent}3A` }}>
              <e.icon size={19} color={e.accent} />
            </div>
            <h3>{e.title}</h3>
            <p>{e.desc}</p>
            <ArrowRight className="alanhome-card-arrow" size={15} color={e.accent} />
          </button>
        ))}
      </div>

      {/* ── Focus + resources ── */}
      <div className="alanhome-cols">
        <div>
          <span className="alanhome-eyebrow" style={{ marginTop: 40 }}>Recommended focus</span>
          <div className="alanhome-list">
            {FOCUS.map(f => (
              <button key={f.title} className="alanhome-row" onClick={f.go}>
                <span className="alanhome-row-ico"><f.icon size={15} color={BLUE} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="alanhome-row-t" style={{ display: 'block' }}>{f.title}</span>
                  <span className="alanhome-row-d" style={{ display: 'block' }}>{f.desc}</span>
                </span>
                <ArrowRight size={14} color="#4A4A4A" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="alanhome-eyebrow" style={{ marginTop: 40 }}>Faith &amp; resources</span>
          <div className="alanhome-list">
            {RESOURCES.map(r => (
              <button key={r.title} className="alanhome-row" onClick={r.go}>
                <span className="alanhome-row-ico" style={{ background: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.25)' }}>
                  <Cross size={14} color={BLUE} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="alanhome-row-t" style={{ display: 'block', color: BLUE }}>{r.title}</span>
                  <span className="alanhome-row-d" style={{ display: 'block' }}>{r.desc}</span>
                </span>
                <ArrowRight size={14} color="#4A4A4A" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
