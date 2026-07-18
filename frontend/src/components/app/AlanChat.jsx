import { useState, useRef, useEffect } from 'react'
import AlanMascot from '../AlanMascot'
import { faithAiApi } from '../../lib/api'
import { Send } from 'lucide-react'

const SUGGESTED = [
  'What should I work on the most?',
  "What am I best at?",
  'How am I doing this week?',
  'Am I revenge trading?',
  'Which session makes me the most money?',
  'Give me a pre-market prayer',
]

function makeInitMessage(trades, stats) {
  if (!trades || trades.length === 0) {
    return "Peace be with you, trader. I'm Alan — your personal trading coach and spiritual guide. Start logging trades and I'll analyze your patterns, call out your weaknesses, and help you grow. What's on your mind?"
  }
  const streak = stats?.streak || 0
  const streakNote = streak > 1 ? ` You're on a ${streak}-win streak right now.`
    : streak < -1 ? ` Heads up — you're in a ${Math.abs(streak)}-loss streak.` : ''
  const pnlSign = parseFloat(stats?.totalPnl || 0) >= 0 ? '+' : ''
  return `Peace be with you. I've reviewed your full trading journal — ${trades.length} trades, ${stats?.winRate ?? 0}% win rate, ${pnlSign}$${stats?.totalPnl ?? '0.00'} total P&L.${streakNote} I know what you're doing well and where you're bleeding. Ask me anything — or ask "what should I work on?" and I'll give it to you straight.`
}

/* ── Chat tab ─────────────────────────────────────────────── */
export default function AlanChat({ trades, stats, goals, completions, settings, playbook, seed }) {
  const [messages,  setMessages]  = useState(() => [{ role: 'assistant', content: makeInitMessage(trades, stats) }])
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)
  const bottomRef = useRef(null)
  const sentSeedRef = useRef(0)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // A question asked from the home hub arrives as { text, n }; fire it once per bump.
  useEffect(() => {
    if (!seed?.n || seed.n === sentSeedRef.current) return
    sentSeedRef.current = seed.n
    if (seed.text) send(seed.text)
  }, [seed])

  async function send(text) {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput(''); setError(null)
    const next = [...messages, { role: 'user', content: msg }]
    setMessages(next)
    setLoading(true)
    try {
      const history = messages.slice(-10)
      const reply = await faithAiApi.chat(msg, history, trades, stats, goals, completions, settings, playbook)
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setError(e.message || 'Could not connect to Ask Alan. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const empty = messages.length <= 1

  return (
    <div className="alanchat">
      <style>{`
        .alanchat { display: flex; flex-direction: column; height: 620px; }
        .alanchat-scroll { flex: 1; overflow-y: auto; padding: 26px 24px 8px; }
        /* Constrain the reading column — full-width lines are hard to scan */
        .alanchat-col { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }

        .alanchat-row { display: flex; gap: 11px; align-items: flex-start; }
        .alanchat-row.me { justify-content: flex-end; }
        .alanchat-name { color: #6E6E6E; font-size: 0.7rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 5px; }
        /* Cap the wrapper, not the bubble, so short messages stay on one line */
        .alanchat-msg { max-width: 82%; min-width: 0; }
        .alanchat-bubble {
          width: fit-content; max-width: 100%; padding: 12px 16px; font-size: 0.9rem; line-height: 1.7;
          color: #D4D4D4; white-space: pre-wrap; border-radius: 14px 14px 14px 4px;
          background: #202020; border: 1px solid #2B2B2B;
        }
        .alanchat-row.me .alanchat-msg { display: flex; justify-content: flex-end; }
        .alanchat-row.me .alanchat-bubble {
          border-radius: 14px 14px 4px 14px; color: #E8EEF9;
          background: rgba(59,130,246,0.14); border-color: rgba(59,130,246,0.28);
        }

        /* Empty state — Alan front and centre instead of a void */
        .alanchat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20px 24px; }
        .alanchat-empty h2 { font-family: Poppins, sans-serif; font-weight: 800; color: #F2F2F2; font-size: 1.15rem; margin: 14px 0 6px; }
        .alanchat-empty p { color: #8A8A8A; font-size: 0.88rem; line-height: 1.65; margin: 0; max-width: 520px; }
        .alanchat-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 22px; max-width: 660px; }
        .alanchat-chip {
          background: rgba(255,255,255,0.03); border: 1px solid #303030; color: #9C9C9C;
          border-radius: 999px; padding: 8px 15px; font-size: 0.79rem; font-weight: 600;
          cursor: pointer; transition: all .15s;
        }
        .alanchat-chip:hover { border-color: rgba(59,130,246,0.5); color: #3B82F6; background: rgba(59,130,246,0.08); }

        /* Composer */
        .alanchat-composer { padding: 14px 24px 18px; }
        .alanchat-inputwrap {
          max-width: 760px; margin: 0 auto; display: flex; align-items: center; gap: 8px;
          background: #141414; border: 1px solid #2F2F2F; border-radius: 14px; padding: 5px 5px 5px 18px;
          transition: border-color .18s, box-shadow .18s;
        }
        .alanchat-inputwrap:focus-within { border-color: rgba(59,130,246,0.55); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .alanchat-inputwrap input {
          flex: 1; background: none; border: none; outline: none; min-width: 0;
          color: #F0F0F0; font-size: 0.9rem; font-family: Inter, sans-serif; padding: 11px 0;
        }
        .alanchat-inputwrap input::placeholder { color: #575757; }
        .alanchat-send {
          width: 38px; height: 38px; border-radius: 10px; border: none; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; transition: all .15s;
        }
        .alanchat-send.on  { background: #3B82F6; color: #0B1220; cursor: pointer; }
        .alanchat-send.on:hover { filter: brightness(1.12); }
        .alanchat-send.off { background: #1E1E1E; color: #3A3A3A; cursor: not-allowed; }

        .alanchat-hint { max-width: 760px; margin: 8px auto 0; color: #4A4A4A; font-size: 0.72rem; text-align: center; }
        @keyframes aiPulse { 0%,60%,100%{transform:translateY(0);opacity:.5} 30%{transform:translateY(-5px);opacity:1} }
      `}</style>

      {empty ? (
        <div className="alanchat-empty">
          <AlanMascot size={104} style={{ filter: 'drop-shadow(0 8px 22px rgba(0,0,0,0.5))' }} />
          <h2>Ask Alan</h2>
          <p>{messages[0]?.content}</p>
          <div className="alanchat-chips">
            {SUGGESTED.map(q => (
              <button key={q} type="button" className="alanchat-chip" onClick={() => send(q)}>{q}</button>
            ))}
          </div>
        </div>
      ) : (
        <div className="alanchat-scroll">
          <div className="alanchat-col">
            {messages.map((m, i) => (
              <div key={i} className={`alanchat-row${m.role === 'user' ? ' me' : ''}`}>
                {m.role === 'assistant' && <AlanMascot size={34} style={{ marginTop: 18 }} />}
                <div className="alanchat-msg">
                  {m.role === 'assistant' && <div className="alanchat-name">Alan</div>}
                  <div className="alanchat-bubble">{m.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="alanchat-row">
                <AlanMascot size={34} style={{ marginTop: 18 }} />
                <div>
                  <div className="alanchat-name">Alan</div>
                  <div className="alanchat-bubble" style={{ display: 'flex', gap: 5, padding: '16px 18px' }}>
                    {[0, 1, 2].map(n => (
                      <div key={n} style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', opacity: 0.5, animation: `aiPulse 1.2s ${n * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.2)', borderRadius: 10, padding: '11px 15px', color: '#E05252', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="alanchat-composer">
        <div className="alanchat-inputwrap">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask Alan anything about your trading…"
            disabled={loading}
          />
          <button type="button" onClick={() => send()} disabled={!input.trim() || loading}
            className={`alanchat-send ${input.trim() && !loading ? 'on' : 'off'}`}>
            <Send size={16} />
          </button>
        </div>
        <div className="alanchat-hint">Alan reads your journal — ask about a trade, a pattern, or your week.</div>
      </div>
    </div>
  )
}

