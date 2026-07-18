import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import Logo from '../Logo'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(26,26,26,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #3A3A3A' : 'none',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <Logo size={44} showText layout="row" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {['features','how-it-works','testimonials'].map(id => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = '#F5F5F5'}
              onMouseLeave={e => e.target.style.color = '#A0A0A0'}
            >
              {id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="btn-gold-outline px-5 py-2 rounded-lg text-sm">
            Login
          </button>
          <button onClick={() => navigate('/signup')} className="btn-gold px-5 py-2 rounded-lg text-sm">
            Get Started Free
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: 'none', border: 'none', color: '#F5F5F5', cursor: 'pointer' }}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={{ background: '#1A1A1A', borderTop: '1px solid #3A3A3A', padding: '1.5rem' }} className="md:hidden flex flex-col gap-4">
          {['features','how-it-works','testimonials'].map(id => (
            <button key={id} onClick={() => scrollTo(id)}
              style={{ color: '#A0A0A0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '1rem' }}>
              {id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
          <button onClick={() => navigate('/login')} className="btn-gold-outline px-5 py-2 rounded-lg text-sm w-full">Login</button>
          <button onClick={() => navigate('/signup')} className="btn-gold px-5 py-2 rounded-lg text-sm w-full">Get Started Free</button>
        </div>
      )}
    </nav>
  )
}
