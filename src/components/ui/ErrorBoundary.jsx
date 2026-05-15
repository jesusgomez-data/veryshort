import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    const msg = this.state.error?.message || 'Error desconocido'
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#000', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 20, padding: 32, fontFamily: "'Space Grotesk', sans-serif",
      }}>
        <span style={{ fontSize: 44 }}>⚠️</span>
        <p style={{ color: '#e8000a', fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
          Algo salió mal
        </p>
        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>
          {msg}
        </p>
        <button
          onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
          style={{
            background: '#e8000a', border: 'none', borderRadius: 10,
            color: '#fff', fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11, fontWeight: 700, letterSpacing: 2, padding: '12px 28px',
            cursor: 'pointer', textTransform: 'uppercase',
          }}
        >
          REINICIAR
        </button>
        <button
          onClick={() => { localStorage.clear(); window.location.reload() }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.2)', fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}
        >
          limpiar datos y reiniciar
        </button>
      </div>
    )
  }
}
