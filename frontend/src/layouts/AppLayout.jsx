import { useState, useEffect, useCallback, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useTradovateStore } from '../store/tradovateStore'
import { useAuthStore } from '../store/authStore'
import { useAuth } from '../contexts/AuthContext'
import { useIdleTimeout } from '../hooks/useIdleTimeout'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, PlusCircle, BarChart2, BookOpen, Cross, Settings,
  LogOut, Menu, X, CalendarDays, TrendingUp, FileBarChart2, ListChecks,
  Trophy, Save, CheckCircle, ShieldAlert, Sparkles, Newspaper, FlaskConical,
  Cloud, CloudOff, Loader2, Home, ArrowLeft, Upload,
} from 'lucide-react'

/* Backtesting's own sections — replace the Trading Journal nav on that page. */
const BACKTEST_NAV = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, to: '/app/backtest' },
  { id: 'trades',    label: 'BT Trades',  icon: ListChecks,      to: '/app/backtest?tab=trades' },
  { id: 'import',    label: 'Import CSV', icon: Upload,          to: '/app/backtest?tab=import' },
]

/* Ask Alan's own sections — these replace the Trading Journal nav while on that page. */
const ASK_ALAN_NAV = [
  { id: 'home',    label: 'Home',           icon: Home,          to: '/app/faith-ai' },
  { id: 'coach',   label: 'Trade Coach',    icon: Sparkles,      to: '/app/faith-ai?tab=coach' },
  { id: 'summary', label: '30-Day Summary', icon: TrendingUp,    to: '/app/faith-ai?tab=summary' },
]
import { isSecureMode, serverCreateTrade } from '../lib/syncManager'
import { useTradeStore } from '../store/tradeStore'
import Logo from '../components/Logo'
import AlanMascot from '../components/AlanMascot'
import AdminBanner from '../components/app/AdminBanner'
import ErrorBoundary from '../components/ErrorBoundary'
import { format } from 'date-fns'

const VERSES = [
  { text: "The plans of the diligent lead to profit.", ref: "Proverbs 21:5" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "Be strong and courageous. Do not be afraid.", ref: "Joshua 1:9" },
  { text: "Commit to the LORD whatever you do.", ref: "Proverbs 16:3" },
  { text: "Plans fail for lack of counsel, but with many advisers they succeed.", ref: "Proverbs 11:14" },
]

const TRADING_ITEMS = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/log', label: 'Log Trade', icon: PlusCircle },
  { to: '/app/dayview', label: 'Day View', icon: CalendarDays },
  { to: '/app/tradeview', label: 'Trade View', icon: TrendingUp },
  { to: '/app/news', label: 'USD News', icon: Newspaper },
  { to: '/app/reports', label: 'Reports', icon: FileBarChart2 },

  { to: '/app/playbook', label: 'Playbook', icon: BookOpen },
  { to: '/app/goals', label: 'Daily Goals', icon: ListChecks },
  { to: '/app/faith', label: 'Faith Journal', icon: Cross },
  { to: '/app/settings', label: 'Settings', icon: Settings },
]

/* ── Rail icon button with slide-out label tab ── */
function RailBtn({ icon: Icon, label, isActive, onClick, danger = false }) {
  const [hovered, setHovered] = useState(false)

  const color = danger
    ? (hovered ? '#E05252' : '#3A3A3A')
    : (isActive ? '#3B82F6' : hovered ? '#3B82F6' : '#4A4A4A')

  const bg = danger
    ? 'transparent'
    : isActive ? 'rgba(59,130,246,0.15)' : hovered ? 'rgba(59,130,246,0.08)' : 'transparent'

  const border = danger
    ? (hovered ? 'rgba(224,82,82,0.25)' : 'transparent')
    : isActive ? 'rgba(59,130,246,0.35)' : 'transparent'

  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        style={{
          width: 40, height: 40, borderRadius: 10,
          background: bg,
          border: `1px solid ${border}`,
          color,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
      >
        <Icon size={danger ? 16 : 18} />
      </button>

      {/* Slide-out label tab */}
      <div style={{
        position: 'absolute',
        left: 'calc(100% + 8px)',
        top: '50%',
        pointerEvents: 'none',
        opacity: hovered ? 1 : 0,
        transform: hovered
          ? 'translateY(-50%) translateX(0)'
          : 'translateY(-50%) translateX(-6px)',
        transition: 'opacity 0.18s ease, transform 0.18s ease',
        zIndex: 9999,
        whiteSpace: 'nowrap',
      }}>
        {/* Arrow pointing left */}
        <div style={{
          position: 'absolute',
          left: -5,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 0, height: 0,
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderRight: danger ? '5px solid #E05252' : '5px solid #3B82F6',
        }} />
        <div style={{
          background: danger ? '#E05252' : '#3B82F6',
          color: danger ? '#fff' : '#1A1A1A',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.04em',
          padding: '5px 10px',
          borderRadius: 6,
        }}>
          {label}
        </div>
      </div>
    </div>
  )
}

function VerseRotator() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx(i => (i + 1) % VERSES.length); setVisible(true) }, 500)
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const v = VERSES[idx]
  return (
    <div style={{ background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid #3A3A3A', padding: '8px 24px', textAlign: 'center', transition: 'opacity 0.5s', opacity: visible ? 1 : 0 }}>
      <span style={{ color: '#3B82F6', fontSize: '0.78rem', fontStyle: 'italic' }}>"{v.text}" — {v.ref}</span>
    </div>
  )
}

export default function AppLayout() {
  const mainRef = useRef(null)
  const [mobileOpen,       setMobileOpen]       = useState(false)
  const [activeRail,       setActiveRail]        = useState('trading')
  const [saved,            setSaved]             = useState(false)
  const [saving,           setSaving]            = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { trades, journalEntries, playbook, settings: tradeSettings } = useTradeStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const now       = new Date()
  const { checkTokenExpiry }    = useTradovateStore()
  const clearUser               = useAuthStore(s => s.clearUser)
  const { logout: secureLogout, isAdmin } = useAuth()

  const handleLogout = useCallback(() => {
    setShowLogoutConfirm(true)
  }, [])

  const confirmLogout = useCallback(async () => {
    setShowLogoutConfirm(false)
    clearUser()
    await secureLogout()
    navigate('/')
  }, [clearUser, secureLogout, navigate])

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)

    if (isSecureMode()) {
      // Find any trades that failed to sync (temp numeric IDs instead of UUIDs)
      const unsynced = trades.filter(t => !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(t.id))
      let failed = 0

      for (const trade of unsynced) {
        const serverTrade = await serverCreateTrade(trade)
        if (serverTrade) {
          // Swap temp id → server UUID in the store
          useTradeStore.setState(s => ({
            trades: s.trades.map(t => t.id === trade.id ? { ...serverTrade } : t),
          }))
        } else {
          failed++
        }
      }

      setSaving(false)
      setSaved(true)
      if (failed > 0) {
        toast.error(`⚠️ ${failed} trade(s) couldn't sync. Check your connection.`)
      } else {
        toast.success('☁️ All trades saved to cloud!')
      }
      setTimeout(() => setSaved(false), 3000)
    } else {
      // Local mode — download a backup file so data isn't lost
      const backup = {
        savedAt: new Date().toISOString(),
        trades, journalEntries, playbook, settings: tradeSettings,
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `faithtrader-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setSaving(false)
      setSaved(true)
      toast('💾 Backup downloaded — sign in to save to the cloud.', { duration: 5000 })
      setTimeout(() => setSaved(false), 3000)
    }
  }, [trades, journalEntries, playbook, tradeSettings, saving])

  // Auto-logout after 30 min idle
  useIdleTimeout({
    onTimeout: () => {
      toast.error('Session expired due to inactivity.', { duration: 5000 })
      handleLogout()
    },
    onWarning: () => {
      toast('You will be logged out in 5 minutes due to inactivity.', {
        icon: '⏱️', duration: 10000,
      })
    },
  })

  useEffect(() => { checkTokenExpiry() }, [])

  // Sync activeRail when navigating via links (not rail clicks)
  useEffect(() => {
    if      (location.pathname === '/app/leaderboard')    setActiveRail('leaderboard')
    else if (location.pathname === '/app/admin-users')    setActiveRail('admin-users')
    else if (location.pathname === '/app/backtest')       setActiveRail('backtest')
    else if (location.pathname === '/app/faith-ai')       setActiveRail('faith-ai')
    else                                                  setActiveRail('trading')
  }, [location.pathname])

  // The <main> scroll container persists across route changes (only <Outlet/> swaps),
  // so React Router never resets it — without this, navigating to a page after
  // scrolling down on the previous one lands you mid-scroll instead of at the top.
  useEffect(() => { mainRef.current?.scrollTo(0, 0) }, [location.pathname])

  // Admin cannot log trades or see Faith Journal
  const items = isAdmin
    ? TRADING_ITEMS.filter(i => i.to !== '/app/log' && i.to !== '/app/faith')
    : TRADING_ITEMS

  // Inside Ask Alan the sidebar shows the AI's sections instead of the journal nav
  const inAskAlan   = location.pathname === '/app/faith-ai'
  const inBacktest  = location.pathname === '/app/backtest'
  const sectionTab  = new URLSearchParams(location.search).get('tab')
  const aiTab       = sectionTab || 'home'
  const btTab       = sectionTab || 'dashboard'
  // Either focused area replaces the journal nav with its own sections
  const focusNav    = inAskAlan ? ASK_ALAN_NAV : inBacktest ? BACKTEST_NAV : null
  const focusActive = inAskAlan ? aiTab : btTab
  const focusLabel  = inAskAlan ? 'Ask Alan' : 'Backtesting'

  const navLinkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: '9px',
    padding: '9px 10px',
    borderRadius: '8px', textDecoration: 'none',
    color: isActive ? '#3B82F6' : '#7A7A7A',
    background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
    transition: 'all 0.15s',
    fontSize: '0.87rem', fontWeight: 500,
  })

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1A1A1A', overflow: 'hidden' }}>

      {/* ── Desktop sidebar ── */}
      <div className="hidden md:flex" style={{ flexShrink: 0 }}>

        {/* Icon rail */}
        <div style={{
          width: 52, background: '#1E1E1E', borderRight: '1px solid #2A2A2A',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '10px 0', gap: 6, flexShrink: 0,
          position: 'relative', zIndex: 100,
          overflow: 'visible',
        }}>
          <div style={{ marginBottom: 10 }}>
            <Logo size={32} showText={false} />
          </div>

          {/* Ask Alan — first in the rail */}
          <RailBtn
            icon={AlanMascot}
            label="Ask Alan"
            isActive={activeRail === 'faith-ai'}
            onClick={() => { setActiveRail('faith-ai'); navigate('/app/faith-ai') }}
          />

          <RailBtn
            icon={BarChart2}
            label="Trading"
            isActive={activeRail === 'trading'}
            onClick={() => { setActiveRail('trading'); navigate('/app/dashboard') }}
          />

          <RailBtn
            icon={Trophy}
            label="Leaderboard"
            isActive={activeRail === 'leaderboard'}
            onClick={() => { setActiveRail('leaderboard'); navigate('/app/leaderboard') }}
          />

          {/* Divider */}
          <div style={{ width: 28, height: 1, background: '#2E2E2E', margin: '4px auto' }} />

          {/* Backtesting — all users (currently a "coming soon" page + CSV upload) */}
          <RailBtn
            icon={FlaskConical}
            label="Backtesting"
            isActive={activeRail === 'backtest'}
            onClick={() => { setActiveRail('backtest'); navigate('/app/backtest') }}
          />

          {/* Admin-only: All Traders */}
          {isAdmin && (
            <RailBtn
              icon={ShieldAlert}
              label="All Traders"
              isActive={activeRail === 'admin-users'}
              onClick={() => { setActiveRail('admin-users'); navigate('/app/admin-users') }}
            />
          )}

          <div style={{ flex: 1 }} />

          <RailBtn
            icon={LogOut}
            label="Log Out"
            isActive={false}
            onClick={handleLogout}
            danger
          />
        </div>

        {/* Nav panel — inside Ask Alan this becomes the AI's own sections */}
        <div style={{
          width: 172, background: '#252525', borderRight: '1px solid #333',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid #2E2E2E' }}>
            <span style={{ color: '#3B82F6', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
              {focusNav ? focusLabel : 'Trading Journal'}
            </span>
          </div>

          <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            {focusNav ? (
              <>
                {focusNav.map(item => {
                  const active = focusActive === item.id
                  return (
                    <button key={item.id} onClick={() => navigate(item.to)} style={{ ...navLinkStyle({ isActive: active }), width: '100%', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                      <item.icon size={15} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}

                {/* Way back out of the focused AI view */}
                <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #2E2E2E' }}>
                  <button onClick={() => navigate('/app/dashboard')} style={{ ...navLinkStyle({ isActive: false }), width: '100%', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
                    <ArrowLeft size={15} />
                    <span>Back to app</span>
                  </button>
                </div>
              </>
            ) : (
              items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end} style={navLinkStyle}>
                  <item.icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              ))
            )}
          </nav>
        </div>
      </div>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <>
          <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199 }} />
          <div style={{
            position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 200,
            width: 260, background: '#252525', borderRight: '1px solid #3A3A3A',
            display: 'flex', flexDirection: 'column', boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
          }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #3A3A3A', minHeight: 64 }}>
              <Logo size={42} showText layout="row" />
              <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', marginLeft: 'auto' }}>
                <X size={18} />
              </button>
            </div>

            <nav style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
              {items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} style={navLinkStyle}>
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div style={{ padding: '12px 8px', borderTop: '1px solid #3A3A3A' }}>
              <button onClick={() => { setMobileOpen(false); setShowLogoutConfirm(true) }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}>
                <LogOut size={18} /><span style={{ fontSize: '0.9rem' }}>Exit App</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Logout confirmation dialog ── */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#242424', border: '1px solid #3A3A3A',
            borderTop: '3px solid #E05252',
            borderRadius: 16, padding: '36px 32px',
            maxWidth: 380, width: '100%', textAlign: 'center',
            boxShadow: '0 0 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 14 }}>🚪</div>
            <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', margin: '0 0 10px', fontSize: '1.3rem' }}>
              Are you sure you want to log out?
            </h2>
            <p style={{ color: '#888', fontSize: '0.85rem', margin: '0 0 28px', lineHeight: 1.6 }}>
              Your trades and data are saved. You can log back in anytime.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  border: '1px solid #3A3A3A', background: '#2E2E2E',
                  color: '#A0A0A0', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                style={{
                  flex: 1, padding: '12px', borderRadius: 10,
                  border: 'none', background: '#E05252',
                  color: '#fff', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <LogOut size={16} /> Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <header style={{ background: '#242424', borderBottom: '1px solid #3A3A3A', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button className="md:hidden" onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: '#F5F5F5', cursor: 'pointer' }}>
            <Menu size={20} />
          </button>
          <div style={{ color: '#A0A0A0', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace' }} className="hidden md:block">
            {format(now, 'EEEE, MMMM d, yyyy — HH:mm')}
          </div>
        </header>

        {/* Admin "now viewing" bar + floating panel */}
        {isAdmin && <AdminBanner onAdminLogout={secureLogout} />}

        <VerseRotator />

        <main ref={mainRef} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
