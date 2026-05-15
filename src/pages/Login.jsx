import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import LogoVS from '@/components/ui/LogoVS'

function translateError(msg = '') {
  if (msg.includes('already registered') || msg.includes('already been registered'))
    return 'Este email ya tiene cuenta, intenta entrar'
  if (msg.includes('Password should be at least') || msg.includes('password'))
    return 'La contraseña debe tener mínimo 6 caracteres'
  if (msg.includes('Invalid email') || msg.includes('invalid email'))
    return 'Email inválido'
  if (msg.includes('Invalid login credentials') || msg.includes('invalid credentials'))
    return 'Email o contraseña incorrectos'
  return msg || 'Algo salió mal, intenta de nuevo'
}

// Spinning VS diamond shown while loading
function LoadingDiamond() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
      style={{
        display: 'inline-block',
        fontFamily: "'Unbounded', sans-serif",
        fontSize: 14,
        fontWeight: 900,
        letterSpacing: '-1px',
        color: '#fff',
        lineHeight: 1,
      }}
    >
      VS
    </motion.span>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [confirmMsg, setConfirmMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    setConfirmMsg('')
    setLoading(true)

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        })
        if (error) throw error

        if (data.user) {
          // Create a minimal profile row — onboarding will fill the rest
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: username.toLowerCase().replace(/\s+/g, '.'),
            display_name: username,
            avatar_emoji: '🎬',
          })
          await useAuthStore.getState().fetchProfile(data.user.id)
          useAuthStore.setState({ user: data.user })
          navigate('/onboarding')
          return
        } else {
          // Email confirmation required
          setConfirmMsg('Te enviamos un email de confirmación. Revisa tu bandeja.')
          setLoading(false)
          return
        }
      } else {
        // LOGIN
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // Set state directly (onAuthStateChange may fire slightly later)
        const profile = await useAuthStore.getState().fetchProfile(data.user.id)
        useAuthStore.setState({ user: data.user, profile, loading: false })
        navigate('/')
        return
      }
    } catch (e) {
      setErr(translateError(e.message))
    } finally {
      setLoading(false)
    }
  }

  function handleDemo() {
    useAuthStore.getState().setDemoUser()
    navigate('/')
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--k)',
        padding: '24px 24px',
        overflowY: 'auto',
      }}
    >
      {/* Logo oficial */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center', marginBottom: 8 }}
      >
        <LogoVS size="splash" />
        <p style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 11, fontWeight: 300,
          letterSpacing: '2px', color: 'rgba(255,255,255,.3)',
          textTransform: 'lowercase', marginTop: 12,
        }}>
          comparte tu día en 7.5 segundos
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          maxWidth: 340,
          background: 'var(--k2)',
          border: '1px solid rgba(255,255,255,.07)',
          borderRadius: 20,
          padding: '28px 24px 24px',
          marginTop: 28,
        }}
      >
        {/* Mode tabs */}
        <div
          style={{
            display: 'flex',
            marginBottom: 24,
            background: 'var(--k3)',
            borderRadius: 10,
            padding: 3,
            gap: 3,
          }}
        >
          {['login', 'register'].map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setErr(''); setConfirmMsg('') }}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                transition: 'all 0.18s',
                background: mode === m ? 'var(--r)' : 'transparent',
                color: mode === m ? '#fff' : 'rgba(255,255,255,.35)',
                boxShadow: mode === m ? '0 4px 14px rgba(232,0,10,.3)' : 'none',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Registro'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'register' && (
            <input
              className="vs-input"
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          )}

          <input
            className="vs-input"
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <input
            className="vs-input"
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
          />

          {err && (
            <div
              style={{
                background: 'rgba(232,0,10,.1)',
                border: '1px solid rgba(232,0,10,.3)',
                borderRadius: 8,
                padding: '10px 14px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 12,
                color: 'var(--r2)',
                lineHeight: 1.5,
              }}
            >
              {err}
            </div>
          )}

          {confirmMsg && (
            <div
              style={{
                background: 'rgba(0,200,80,.1)',
                border: '1px solid rgba(0,200,80,.3)',
                borderRadius: 8,
                padding: '10px 14px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 12,
                color: 'rgba(60,230,120,1)',
                lineHeight: 1.5,
              }}
            >
              {confirmMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 42 }}
          >
            {loading
              ? <LoadingDiamond />
              : mode === 'login'
              ? 'ENTRAR'
              : 'CREAR CUENTA'}
          </button>
        </form>

        <div
          style={{
            marginTop: 16,
            borderTop: '1px solid rgba(255,255,255,.06)',
            paddingTop: 16,
          }}
        >
          <button
            onClick={handleDemo}
            className="btn-ghost"
            style={{ fontSize: 11, letterSpacing: '2.5px' }}
          >
            MODO DEMO — SIN REGISTRO
          </button>
        </div>
      </motion.div>

      <p
        style={{
          marginTop: 20,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 10,
          color: 'rgba(255,255,255,.18)',
          letterSpacing: '1.5px',
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        Very Short · Videos de 7.5 segundos
      </p>
    </div>
  )
}
