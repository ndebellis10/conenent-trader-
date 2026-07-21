/**
 * Ask Alan Coach — Zella-style chat + trade analysis for ALL users.
 * Tabs: Chat · Trade Coach · 30-Day Summary
 */
import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import AskAlanHome from '../../components/app/AskAlanHome'
import OnboardingChecklist from '../../components/app/OnboardingChecklist'
import TraderProfileModal from '../../components/app/TraderProfileModal'
import ChatDrawer from '../../components/app/ChatDrawer'
import { useTradeStore }  from '../../store/tradeStore'
import { useGoalStore }   from '../../store/goalStore'
import { useAdminStore }  from '../../store/adminStore'
import { useAuth }        from '../../contexts/AuthContext'
import { faithAiApi }     from '../../lib/api'
import { summarizeCourseProgress } from '../../lib/courseProgress'
import { format, subDays } from 'date-fns'
import { Sparkles, ChevronDown, ChevronUp, Loader2, RefreshCw, BookOpen } from 'lucide-react'

/* Ask Alan's sections. The app sidebar renders the labelled versions of these
   while you're on this page, driving the `?tab=` param — see ASK_ALAN_NAV in
   layouts/AppLayout.jsx. Keep the two lists in sync.
   Chat is not a section: it lives in a right-side drawer opened from Home. */
const AI_TABS = ['home', 'coach', 'summary']

const safeDate = d => { const dt = new Date(d || Date.now()); return isNaN(dt.getTime()) ? new Date() : dt }
const RESULT_COLOR = { Win: '#4CAF7D', Loss: '#E05252', Breakeven: '#888' }

function computeStats(trades) {
  if (!trades.length) return null
  const wins   = trades.filter(t => t.result === 'Win')
  const losses = trades.filter(t => t.result === 'Loss')
  const pnls   = trades.map(t => parseFloat(t.netPnl) || 0)
  const totalPnl = pnls.reduce((a, b) => a + b, 0)
  const avgWin  = wins.length   ? wins.reduce((a, t)   => a + (parseFloat(t.netPnl) || 0), 0) / wins.length   : 0
  const avgLoss = losses.length ? losses.reduce((a, t) => a + (parseFloat(t.netPnl) || 0), 0) / losses.length : 0
  const weekAgo    = subDays(new Date(), 7)
  const weekTrades = trades.filter(t => safeDate(t.date || t.createdAt) >= weekAgo)
  const weekPnl    = weekTrades.reduce((a, t) => a + (parseFloat(t.netPnl) || 0), 0)
  let streak = 0
  const sorted = [...trades].sort((a, b) => safeDate(b.date || b.createdAt) - safeDate(a.date || a.createdAt))
  if (sorted.length) {
    const first = sorted[0].result
    for (const t of sorted) { if (t.result === first) streak++; else break }
    streak = first === 'Win' ? streak : -streak
  }
  return {
    total:      trades.length,
    winRate:    Math.round(wins.length / trades.length * 100),
    totalPnl:   totalPnl.toFixed(2),
    avgWin:     avgWin.toFixed(2),
    avgLoss:    Math.abs(avgLoss).toFixed(2),
    streak,
    weekPnl:    weekPnl.toFixed(2),
    weekTrades: weekTrades.length,
  }
}

/* ── FeedbackCard ─────────────────────────────────────────── */
function FeedbackCard({ data }) {
  return (
    <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.04),rgba(30,30,30,0.8))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '20px 24px', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[
        { key: 'execution',  label: '⚡ Execution',  color: '#3B82F6' },
        { key: 'psychology', label: '🧠 Psychology', color: '#3B82F6' },
        { key: 'patterns',   label: '📈 Patterns',   color: '#5B9BD5' },
      ].map(({ key, label, color }) => (
        <div key={key}>
          <div style={{ color, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
          <p style={{ color: '#C8C8C8', fontSize: '0.875rem', lineHeight: 1.7, margin: 0 }}>{data[key]}</p>
        </div>
      ))}
      <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 8, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <BookOpen size={16} color="#3B82F6" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ color: '#5B9BD5', fontStyle: 'italic', fontFamily: 'Poppins, sans-serif', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 4px' }}>"{data.scripture}"</p>
          <span style={{ color: 'rgba(59,130,246,0.55)', fontSize: '0.75rem', fontWeight: 700 }}>— {data.scriptureRef}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Trade Coach tab ─────────────────────────────────────── */
function TradeRow({ trade, recentTrades, userId, isExpanded, onToggle }) {
  const [loading,  setLoading]  = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [error,    setError]    = useState(null)
  const pnl = parseFloat(trade.netPnl) || 0

  async function analyze() {
    if (feedback) { onToggle(); return }
    setLoading(true); setError(null)
    try {
      const result = await faithAiApi.coachTrade(trade, recentTrades, userId)
      setFeedback(result); onToggle(true)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ borderBottom: '1px solid #252525' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 80px 65px 100px 80px 1fr auto', gap: 8, alignItems: 'center', padding: '12px 16px', cursor: 'default' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{ color: '#888', fontSize: '0.77rem' }}>{format(safeDate(trade.createdAt || trade.date), 'MMM d, yy')}</span>
        <span style={{ color: '#F5F5F5', fontWeight: 700, fontSize: '0.85rem' }}>{trade.symbol || '—'}</span>
        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, background: trade.direction === 'Long' ? 'rgba(76,175,125,0.12)' : 'rgba(224,82,82,0.12)', color: trade.direction === 'Long' ? '#4CAF7D' : '#E05252' }}>{trade.direction}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.83rem', color: pnl >= 0 ? '#4CAF7D' : '#E05252' }}>
          {pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(2)}
        </span>
        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, background: trade.result === 'Win' ? 'rgba(76,175,125,0.12)' : trade.result === 'Loss' ? 'rgba(224,82,82,0.12)' : 'rgba(150,150,150,0.1)', color: RESULT_COLOR[trade.result] || '#888' }}>{trade.result}</span>
        <span style={{ color: '#555', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trade.strategyName || trade.preTrade || '—'}</span>
        <button onClick={analyze} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 7, cursor: loading ? 'wait' : 'pointer', border: feedback ? '1px solid rgba(59,130,246,0.35)' : '1px solid rgba(59,130,246,0.35)', background: feedback ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.1)', color: feedback ? '#3B82F6' : '#3B82F6', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap', opacity: loading ? 0.7 : 1 }}>
          {loading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
            : feedback ? (isExpanded ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> Show</>)
            : <><Sparkles size={12} /> Analyze</>}
        </button>
      </div>
      {error && <div style={{ padding: '8px 16px 12px', color: '#E05252', fontSize: '0.8rem' }}>{error}</div>}
      {feedback && isExpanded && <div style={{ padding: '0 16px 16px' }}><FeedbackCard data={feedback} /></div>}
    </div>
  )
}

function TradeCoachTab({ trades, userId }) {
  const [expandedId, setExpandedId] = useState(null)
  const recent = trades.slice(0, 30)
  const toggle = (id, forceOpen) => setExpandedId(curr => forceOpen ? id : curr === id ? null : id)

  if (!recent.length) return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: '#555' }}>
      <Sparkles size={28} color="rgba(59,130,246,0.3)" style={{ marginBottom: 14 }} />
      <p style={{ margin: 0, fontSize: '0.88rem' }}>No trades to analyze yet. Log some trades first.</p>
    </div>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '90px 80px 65px 100px 80px 1fr auto', gap: 8, padding: '10px 16px', borderBottom: '1px solid #2A2A2A' }}>
        {['Date','Symbol','Side','Net P&L','Result','Strategy / Emotion',''].map(h => (
          <span key={h} style={{ color: '#555', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
        ))}
      </div>
      {recent.map((trade, i) => (
        <TradeRow key={trade.id || i} trade={trade} recentTrades={trades.slice(0, 20)} userId={userId}
          isExpanded={expandedId === (trade.id || i)} onToggle={forceOpen => toggle(trade.id || i, forceOpen)} />
      ))}
    </div>
  )
}

/* ── Pattern Summary tab ─────────────────────────────────── */
function PatternSummaryTab({ trades, userId }) {
  const [loading, setLoading]  = useState(false)
  const [result,  setResult]   = useState(null)
  const [error,   setError]    = useState(null)
  const cutoff = subDays(new Date(), 30)
  const recent = useMemo(() => trades.filter(t => safeDate(t.createdAt || t.date) >= cutoff), [trades])

  async function generate() {
    setLoading(true); setError(null); setResult(null)
    try { setResult(await faithAiApi.monthlySummary(recent)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: '#888', fontSize: '0.83rem', margin: 0 }}>
          Analyzing <span style={{ color: '#3B82F6', fontWeight: 700 }}>{recent.length}</span> trades from the last 30 days.
        </p>
        <button onClick={generate} disabled={loading || !recent.length}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 9, border: 'none', cursor: loading ? 'wait' : !recent.length ? 'not-allowed' : 'pointer', background: loading ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)', color: '#3B82F6', fontWeight: 700, fontSize: '0.88rem', opacity: !recent.length ? 0.5 : 1 }}>
          {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
            : result ? <><RefreshCw size={15} /> Regenerate</>
            : <><Sparkles size={15} /> Generate 30-Day Analysis</>}
        </button>
      </div>

      {error && <div style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: 10, padding: '14px 18px', color: '#E05252', fontSize: '0.85rem' }}>{error}</div>}

      {!result && !loading && !error && (
        <div style={{ background: 'rgba(59,130,246,0.04)', border: '1px dashed rgba(59,130,246,0.2)', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
          <Sparkles size={32} color="rgba(59,130,246,0.4)" style={{ marginBottom: 16 }} />
          <p style={{ color: '#555', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
            Click "Generate 30-Day Analysis" to receive AI-powered insights<br />on your strengths, weaknesses, and one specific rule to add.
          </p>
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { key: 'strength',   label: '💪 Top Strength',       color: '#4CAF7D', bg: 'rgba(76,175,125,0.06)',  border: 'rgba(76,175,125,0.18)' },
              { key: 'weakness',   label: '⚠️ Top Weakness',        color: '#E05252', bg: 'rgba(224,82,82,0.06)',  border: 'rgba(224,82,82,0.18)'  },
              { key: 'ruleChange', label: '📋 Rule to Add',         color: '#3B82F6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.18)' },
            ].map(({ key, label, color, bg, border }) => (
              <div key={key} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ color, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{label}</div>
                <p style={{ color: '#C8C8C8', fontSize: '0.875rem', lineHeight: 1.7, margin: 0 }}>{result[key]}</p>
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 12, padding: '20px 24px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ color: '#3B82F6', fontSize: '1.4rem', lineHeight: 1, opacity: 0.7, flexShrink: 0 }}>✝</span>
            <div>
              <div style={{ color: '#888', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Scripture for this Season</div>
              <p style={{ color: '#5B9BD5', fontStyle: 'italic', fontFamily: 'Poppins, sans-serif', fontSize: '0.9rem', lineHeight: 1.7, margin: '0 0 6px' }}>"{result.scripture}"</p>
              <span style={{ color: 'rgba(59,130,246,0.55)', fontSize: '0.78rem', fontWeight: 700 }}>— {result.scriptureRef}</span>
            </div>
          </div>
          <div style={{ color: '#444', fontSize: '0.72rem', textAlign: 'right' }}>Based on {result.tradeCount} trades · Powered by Claude</div>
        </div>
      )}
    </div>
  )
}

/* ── Main page ───────────────────────────────────────────── */
export default function FaithAI() {
  const { trades, settings, playbook } = useTradeStore()
  const { goals, completions }         = useGoalStore()
  const viewingUser                    = useAdminStore(s => s.viewingUser)
  const { isAdmin, user }              = useAuth()
  const email = user?.email || null
  // What they've covered in the course, so Alan can tie lessons to their trades
  const courseProgress = useMemo(() => summarizeCourseProgress(email), [email])
  const [searchParams, setSearchParams] = useSearchParams()
  const [seed, setSeed]                = useState({ text: '', n: 0 })
  const [chatOpen, setChatOpen]        = useState(false)
  const [profileOpen, setProfileOpen]  = useState(false)

  // The active section lives in the URL so the app sidebar can drive it.
  const tab    = AI_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'home'
  const setTab = id => setSearchParams(id === 'home' ? {} : { tab: id }, { replace: true })

  const userId = viewingUser?.id || null
  const stats  = useMemo(() => computeStats(trades), [trades])

  // Prefer the display name the trader set in Settings
  const displayName = settings?.name || viewingUser?.name || user?.name || (user?.email || '').split('@')[0] || 'trader'

  // Ask from the home hub: slide the chat drawer open and hand it the question
  const askAlan = (text) => {
    setChatOpen(true)
    if (text) setSeed(s => ({ text, n: s.n + 1 }))
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Admin context only — the page header is gone; Home carries the greeting */}
      {viewingUser && (
        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '10px 16px', color: '#3B82F6', fontSize: '0.82rem', fontWeight: 600 }}>
          Viewing: {viewingUser.name || viewingUser.email}
        </div>
      )}

      {/* Content — section switching lives in the app sidebar while you're in Ask Alan */}
      <div style={{ minWidth: 0 }}>
        {tab === 'home' && (
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            {/* Alan is the hero; the get-started checklist sits below it */}
            <AskAlanHome name={displayName} onAsk={askAlan} onTab={setTab} />
            <div style={{ marginTop: 22 }}>
              <OnboardingChecklist
                email={email} settings={settings} trades={trades}
                goals={goals} playbook={playbook} courseProgress={courseProgress}
                onAsk={askAlan}
                onProfile={() => setProfileOpen(true)}
              />
            </div>
          </div>
        )}

        {tab === 'coach' && (
          <div style={{ background: '#222', border: '1px solid #2A2A2A', borderRadius: 14, overflow: 'hidden' }}>
            <TradeCoachTab trades={trades} userId={userId} />
          </div>
        )}

        {tab === 'summary' && (
          <div style={{ background: '#222', border: '1px solid #2A2A2A', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: 24 }}><PatternSummaryTab trades={trades} userId={userId} /></div>
          </div>
        )}
      </div>

      {/* Chat lives here — opened by typing on Home, not a sidebar section */}
      <TraderProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        trades={trades} stats={stats} goals={goals}
        completions={completions} settings={settings} playbook={playbook} seed={seed}
        courseProgress={courseProgress} email={email}
      />
    </div>
  )
}
