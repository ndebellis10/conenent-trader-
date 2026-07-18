import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Covenant Trader render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', gap: 20, textAlign: 'center',
          padding: '40px 24px',
        }}>
          <div style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.4))' }}>✝</div>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 700, color: '#F5F5F5', margin: 0, fontSize: '1.4rem' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#666', margin: 0, maxWidth: 380, lineHeight: 1.6 }}>
            This page encountered an error. Your data is safe — refresh the page or navigate back.
          </p>
          {this.state.error?.message && (
            <p style={{ color: '#555', fontSize: '0.75rem', margin: 0, maxWidth: 480, fontFamily: 'monospace', background: '#1A1A1A', padding: '8px 12px', borderRadius: 6, wordBreak: 'break-all' }}>
              {this.state.error.message}
            </p>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: '#3B82F6', color: '#FFFFFF',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.history.back() }}
              style={{
                padding: '10px 24px', borderRadius: 10,
                border: '1px solid #3A3A3A', background: 'transparent',
                color: '#A0A0A0', fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
