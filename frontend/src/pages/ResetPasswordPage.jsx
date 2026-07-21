import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2, Eye, EyeOff, CheckCircle } from 'lucide-react'
import AuthCard from '../components/AuthCard'
import FloatingVerses from '../components/FloatingVerses'
import { supabase } from '../lib/supabase'

/* Where the password-reset email link lands. Supabase redirects here with the
   recovery tokens in the URL hash (#access_token=...&refresh_token=...&
   type=recovery). We adopt that session just long enough to set a new
   password, then send them to log in fresh. */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady]     = useState(false)   // recovery session established
  const [linkError, setLinkError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [show, setShow]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  // Pull the recovery tokens out of the URL hash and adopt the session
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const access_token  = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')
    const type          = hash.get('type')
    const errDesc       = hash.get('error_description')

    if (errDesc) { setLinkError(errDesc.replace(/\+/g, ' ')); return }
    if (!access_token || type !== 'recovery') {
      setLinkError('This reset link is invalid or has expired. Please request a new one.')
      return
    }
    supabase.auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) setLinkError('This reset link has expired. Please request a new one.')
        else setReady(true)
      })
      .catch(() => setLinkError('This reset link has expired. Please request a new one.'))
    // Clear the tokens from the address bar
    window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8 || !/[^A-Za-z0-9]/.test(password)) {
      setError('Password must be at least 8 characters and include a special character.')
      return
    }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      await supabase.auth.signOut()   // drop the temporary recovery session
      setDone(true)
      setTimeout(() => navigate('/login'), 2200)
    } catch (err) {
      setError(err?.message || 'Could not update your password. Try the link again.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = { width: '100%', background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '10px', padding: '12px 16px', color: '#F5F5F5', fontSize: '0.95rem', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }

  return (
    <AuthCard backdrop={<FloatingVerses />}>
      <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.3rem', textAlign: 'center', marginBottom: '8px' }}>
        Set a New Password
      </h2>

      {done ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(76,175,125,0.1)', border: '2px solid #4CAF7D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={28} color="#4CAF7D" />
          </div>
          <p style={{ color: '#A0A0A0', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Password updated. Taking you to sign in…
          </p>
        </div>
      ) : linkError ? (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <p style={{ color: '#E05252', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 18 }}>{linkError}</p>
          <Link to="/forgot-password" className="btn-gold" style={{ display: 'inline-block', padding: '11px 22px', borderRadius: 10, textDecoration: 'none', fontSize: '0.9rem' }}>
            Request a new link
          </Link>
        </div>
      ) : (
        <>
          <p style={{ textAlign: 'center', color: '#A0A0A0', fontSize: '0.9rem', marginBottom: '24px' }}>
            Choose a new password for your account.
          </p>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ position: 'relative' }}>
              <label style={{ color: '#A0A0A0', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>New password</label>
              <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters + a symbol" style={inputStyle} autoFocus disabled={!ready} />
              <button type="button" onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 12, top: 34, background: 'none', border: 'none', color: '#6A6A6A', cursor: 'pointer' }} aria-label="Toggle password">
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Confirm password</label>
              <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your new password" style={inputStyle} disabled={!ready} />
            </div>

            {error && <p style={{ color: '#E05252', fontSize: '0.8rem', margin: 0 }}>{error}</p>}
            {!ready && !linkError && <p style={{ color: '#7E7E7E', fontSize: '0.8rem', margin: 0 }}>Verifying your reset link…</p>}

            <button type="submit" disabled={saving || !ready} className="btn-gold" style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '1rem', cursor: saving || !ready ? 'not-allowed' : 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: !ready ? 0.6 : 1 }}>
              {saving ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : 'Update Password'}
            </button>
          </form>
        </>
      )}

      <p style={{ textAlign: 'center', marginTop: '24px' }}>
        <Link to="/login" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: '0.85rem' }}>← Back to Login</Link>
      </p>
    </AuthCard>
  )
}
