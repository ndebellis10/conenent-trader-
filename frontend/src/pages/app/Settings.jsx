import { useState, useEffect } from 'react'
import { useTradeStore } from '../../store/tradeStore'
import { useTradovateStore } from '../../store/tradovateStore'
import { useTradovateSync } from '../../lib/useTradovateSync'
import { useAuth } from '../../contexts/AuthContext'
import { authenticate } from '../../lib/tradovateApi'
import { userApi } from '../../lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Save, Trash2, Download, Wifi, WifiOff, RefreshCw, Loader2, Link2 } from 'lucide-react'

export default function Settings() {
  const { settings, updateSettings, trades } = useTradeStore()
  const { user } = useAuth()
  const [form, setForm] = useState({ ...settings })
  const [clearConfirm, setClearConfirm] = useState(false)

  /* ── Tradovate ── */
  const {
    username, cid: storedCid, environment, accessToken, connected, lastSync, syncError,
    syncing, autoSync, importedIds,
    setCredentials, setToken, disconnect, setSyncError, setAutoSync,
  } = useTradovateStore()
  const sync = useTradovateSync()

  const [tvUser, setTvUser] = useState(username || '')
  const [tvPass, setTvPass] = useState('')
  const [tvCid, setTvCid] = useState(storedCid || '')
  const [tvSec, setTvSec] = useState('')
  const [tvEnv, setTvEnv] = useState(environment || 'live')
  const [connecting, setConnecting] = useState(false)

  useEffect(() => { setTvUser(username || '') }, [username])
  useEffect(() => { setTvCid(storedCid || '') }, [storedCid])
  useEffect(() => { setTvEnv(environment || 'live') }, [environment])

  const handleConnect = async () => {
    if (!tvUser.trim() || !tvPass.trim()) {
      toast.error('Enter your Tradovate username and password')
      return
    }
    if (!tvCid || !tvSec.trim()) {
      toast.error('Enter your Tradovate App CID and Secret')
      return
    }
    setConnecting(true)
    try {
      const { accessToken: token, expirationTime } = await authenticate(
        tvUser.trim(), tvPass, tvEnv, parseInt(tvCid, 10), tvSec.trim()
      )
      setCredentials(tvUser.trim(), tvCid, tvEnv)
      setToken(token, expirationTime)
      toast.success('Connected to Tradovate!')
      setTvPass('')
      setTvSec('')
      setTimeout(() => sync(), 200)
    } catch (err) {
      setSyncError(err.message)
      toast.error(err.message || 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    disconnect()
    setTvPass('')
    toast.success('Disconnected from Tradovate')
  }

  /* ── General settings ── */
  const handleSave = async (e) => {
    e.preventDefault()
    updateSettings(form)

    // Use the auth user's email (most reliable) then fall back to settings
    const email = user?.email || form.email || settings.email || ''
    const displayName = form.name || email.split('@')[0] || 'Trader'

    // 1. Sync display name to Supabase profile (so admin can see it)
    try {
      await userApi.updateProfile({ display_name: displayName })
    } catch { /* silent — might not be in secure mode */ }

    // 2. Sync to leaderboard (works even with 0 trades — just stores the name)
    try {
      const { syncLeaderboard } = await import('../../lib/leaderboardApi')
      if (email) {
        await syncLeaderboard(displayName, email, trades)
      }
    } catch { /* leaderboard sync is non-critical */ }

    toast.success('Settings saved!')
  }

  const handleExport = () => {
    const data = JSON.stringify(trades, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'covenant-trader-data.json'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported!')
  }

  const inputStyle = {
    width: '100%', background: '#2E2E2E', border: '1px solid #3A3A3A',
    borderRadius: '8px', padding: '10px 14px', color: '#F5F5F5',
    fontSize: '0.9rem', fontFamily: 'Inter, sans-serif', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.5rem', marginBottom: '24px' }}>Settings</h1>

      {/* ── Account ── */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px' }}>
          <h2 style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Account</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[['name', 'Display Name', 'text'], ['email', 'Email', 'email']].map(([k, l, t]) => (
              <div key={k}>
                <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>{l}</label>
                <input type={t} value={form[k] || ''} onChange={e => setForm({ ...form, [k]: e.target.value })} style={inputStyle} />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" className="btn-gold" style={{ padding: '13px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Save size={16} /> Save Settings
        </button>
      </form>

      {/* ── Tradovate Integration ── */}
      <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px', marginTop: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Link2 size={15} color="#3B82F6" />
              <h2 style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Tradovate Integration</h2>
            </div>
            <p style={{ color: '#555', fontSize: '0.78rem', margin: 0 }}>
              Auto-sync your executed trades directly from Tradovate
            </p>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
            background: connected ? 'rgba(76,175,125,0.1)' : 'rgba(80,80,80,0.1)',
            border: `1px solid ${connected ? 'rgba(76,175,125,0.3)' : '#2E2E2E'}`,
            padding: '5px 12px', borderRadius: '20px',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#4CAF7D' : '#444' }} />
            <span style={{ color: connected ? '#4CAF7D' : '#555', fontSize: '0.75rem', fontWeight: 600 }}>
              {connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>

        {!connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Environment */}
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '8px' }}>Environment</label>
              <div style={{ display: 'flex', background: '#1A1A1A', borderRadius: '8px', padding: '3px', width: 'fit-content' }}>
                {['live', 'demo'].map(e => (
                  <button key={e} type="button" onClick={() => setTvEnv(e)} style={{
                    padding: '6px 22px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                    fontSize: '0.82rem', fontWeight: 600, textTransform: 'capitalize',
                    background: tvEnv === e ? '#3B82F6' : 'transparent',
                    color: tvEnv === e ? '#1A1A1A' : '#555',
                    transition: 'all 0.15s',
                  }}>{e.charAt(0).toUpperCase() + e.slice(1)}</button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Tradovate Username / Email</label>
              <input
                value={tvUser} onChange={e => setTvUser(e.target.value)}
                style={inputStyle} placeholder="your@email.com"
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>Tradovate Password</label>
              <input
                type="password" value={tvPass} onChange={e => setTvPass(e.target.value)}
                style={inputStyle} placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
              />
            </div>

            {/* How to get CID/Secret */}
            <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px', padding: '12px 14px' }}>
              <p style={{ color: '#3B82F6', fontSize: '0.76rem', fontWeight: 700, margin: '0 0 4px' }}>How to get your App CID & Secret:</p>
              <ol style={{ color: '#777', fontSize: '0.74rem', margin: 0, paddingLeft: '16px', lineHeight: 1.7 }}>
                <li>Log in at <span style={{ color: '#A0A0A0' }}>trader.tradovate.com</span></li>
                <li>Click your profile → <span style={{ color: '#A0A0A0' }}>Account Settings</span></li>
                <li>Go to <span style={{ color: '#A0A0A0' }}>Connections</span> → <span style={{ color: '#A0A0A0' }}>New Connection</span></li>
                <li>Name it "CovenantTrader" → click <span style={{ color: '#A0A0A0' }}>Register</span></li>
                <li>Copy the <span style={{ color: '#A0A0A0' }}>CID</span> (number) and <span style={{ color: '#A0A0A0' }}>Secret</span> shown</li>
              </ol>
            </div>

            {/* CID */}
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>App CID <span style={{ color: '#555', fontWeight: 400 }}>(number from Tradovate Connections)</span></label>
              <input
                value={tvCid} onChange={e => setTvCid(e.target.value)}
                style={inputStyle} placeholder="e.g. 3512"
                type="number"
              />
            </div>

            {/* Secret */}
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.8rem', display: 'block', marginBottom: '6px' }}>App Secret</label>
              <input
                type="password" value={tvSec} onChange={e => setTvSec(e.target.value)}
                style={inputStyle} placeholder="Secret from Tradovate Connections"
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
              />
            </div>

            {syncError && (
              <div style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: '8px', padding: '10px 14px', color: '#E05252', fontSize: '0.78rem' }}>
                {syncError}
              </div>
            )}

            <button type="button" onClick={handleConnect} disabled={connecting} className="btn-gold"
              style={{ padding: '12px', borderRadius: '10px', border: 'none', cursor: connecting ? 'not-allowed' : 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: connecting ? 0.7 : 1 }}>
              {connecting
                ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Connecting...</>
                : <><Wifi size={16} /> Connect to Tradovate</>
              }
            </button>

            <p style={{ color: '#444', fontSize: '0.74rem', margin: 0, textAlign: 'center' }}>
              Your credentials are sent directly to Tradovate and are never stored in plain text.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Status info */}
            <div style={{ background: '#1A1A1A', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                ['Account', username],
                ['Environment', environment.charAt(0).toUpperCase() + environment.slice(1)],
                ['Last sync', lastSync ? format(new Date(lastSync), 'MMM d, yyyy h:mm a') : 'Not yet synced'],
                ['Trades imported', importedIds.length],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#555', fontSize: '0.8rem' }}>{label}</span>
                  <span style={{ color: label === 'Trades imported' ? '#3B82F6' : '#A0A0A0', fontSize: '0.8rem', fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Auto-sync toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ color: '#A0A0A0', fontSize: '0.82rem' }}>Auto-sync on dashboard load</span>
              <div onClick={() => setAutoSync(!autoSync)} style={{
                width: 36, height: 20, borderRadius: 10, cursor: 'pointer', position: 'relative',
                background: autoSync ? 'rgba(59,130,246,0.5)' : '#2A2A2A',
                border: `1px solid ${autoSync ? '#3B82F6' : '#3A3A3A'}`,
                transition: 'all 0.2s',
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', position: 'absolute', top: 2,
                  left: autoSync ? 18 : 2, transition: 'left 0.2s',
                  background: autoSync ? '#3B82F6' : '#555',
                }} />
              </div>
            </div>

            {syncError && (
              <div style={{ background: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.25)', borderRadius: '8px', padding: '10px 14px', color: '#E05252', fontSize: '0.78rem' }}>
                {syncError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => sync()} disabled={syncing} className="btn-gold"
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', cursor: syncing ? 'not-allowed' : 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', opacity: syncing ? 0.7 : 1 }}>
                <RefreshCw size={14} style={syncing ? { animation: 'spin 0.8s linear infinite' } : {}} />
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
              <button type="button" onClick={handleDisconnect}
                style={{ padding: '10px 18px', background: 'transparent', border: '1px solid rgba(224,82,82,0.4)', color: '#E05252', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <WifiOff size={14} /> Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Data ── */}
      <div style={{ background: '#242424', borderRadius: '12px', border: '1px solid #3A3A3A', padding: '24px', marginTop: '24px' }}>
        <h2 style={{ color: '#3B82F6', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '20px' }}>Data</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={{ padding: '10px 20px', background: '#2E2E2E', border: '1px solid #3A3A3A', color: '#F5F5F5', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <Download size={14} /> Export All Data
          </button>
          {!clearConfirm ? (
            <button onClick={() => setClearConfirm(true)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #E05252', color: '#E05252', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <Trash2 size={14} /> Clear All Data
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: '#E05252', fontSize: '0.85rem' }}>Are you sure?</span>
              <button onClick={() => { localStorage.removeItem('covenant-trader-storage'); window.location.reload() }} style={{ background: '#E05252', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Yes, Delete</button>
              <button onClick={() => setClearConfirm(false)} style={{ background: '#3A3A3A', border: 'none', color: '#A0A0A0', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '24px', padding: '16px', background: '#242424', borderRadius: '8px', border: '1px solid #3A3A3A', textAlign: 'center' }}>
        <span style={{ color: '#666', fontSize: '0.8rem' }}>Theme: Dark Mode Only — Covenant Trader is always dark. ✝</span>
      </div>
    </div>
  )
}
