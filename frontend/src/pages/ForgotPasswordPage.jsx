import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail } from 'lucide-react'
import AuthCard from '../components/AuthCard'
import FloatingVerses from '../components/FloatingVerses'

const schema = z.object({ email: z.string().email('Please enter a valid email') })

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, getValues, formState: { errors } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    setLoading(true)
    await new Promise(r => setTimeout(r, 1200))
    setLoading(false)
    setSentTo(data.email)
    setSent(true)
  }

  const inputStyle = { width: '100%', background: '#2E2E2E', border: '1px solid #3A3A3A', borderRadius: '10px', padding: '12px 16px', color: '#F5F5F5', fontSize: '0.95rem', fontFamily: 'Inter, sans-serif', outline: 'none' }

  return (
    <AuthCard backdrop={<FloatingVerses />}>
      <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', fontSize: '1.3rem', textAlign: 'center', marginBottom: '8px' }}>
        Reset Your Password
      </h2>

      {!sent ? (
        <>
          <p style={{ textAlign: 'center', color: '#A0A0A0', fontSize: '0.9rem', marginBottom: '28px' }}>
            Enter your email and we'll send you a reset link.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ color: '#A0A0A0', fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Email</label>
              <input {...register('email')} type="email" placeholder="you@example.com" style={inputStyle} />
              {errors.email && <p style={{ color: '#E05252', fontSize: '0.8rem', marginTop: '4px' }}>{errors.email.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="btn-gold" style={{ width: '100%', padding: '13px', borderRadius: '10px', fontSize: '1rem', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : 'Send Reset Link'}
            </button>
          </form>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '2px solid #3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Mail size={28} color="#3B82F6" />
          </div>
          <h3 style={{ color: '#F5F5F5', fontFamily: 'Poppins, sans-serif', marginBottom: '12px' }}>Check your inbox!</h3>
          <p style={{ color: '#A0A0A0', fontSize: '0.9rem', lineHeight: 1.6 }}>
            A reset link has been sent to<br />
            <span style={{ color: '#3B82F6', fontWeight: 600 }}>{sentTo}</span>
          </p>
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: '24px' }}>
        <Link to="/login" style={{ color: '#3B82F6', textDecoration: 'none', fontSize: '0.85rem' }}>← Back to Login</Link>
      </p>
    </AuthCard>
  )
}
