import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'

const EMOJIS = [
  '🧑‍💻', '🎨', '🎵', '🏃', '📸',
  '🌊', '🍜', '🚴', '✈️', '🌿',
  '🎸', '💡', '🔥', '⚡', '🌅',
]

const USERNAME_RE = /^[a-zA-Z0-9._]{3,20}$/

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
}

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)       // 0 = emoji, 1 = username, 2 = bio
  const [dir, setDir] = useState(1)
  const [emoji, setEmoji] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  function goNext() {
    setErr('')
    setDir(1)
    setStep((s) => s + 1)
  }

  function validateUsername() {
    if (!USERNAME_RE.test(username)) {
      setErr('3-20 caracteres: letras, números, puntos o guiones bajos')
      return false
    }
    return true
  }

  async function handleContinue() {
    if (step === 0) {
      if (!emoji) { setErr('Elige un emoji para tu perfil'); return }
      goNext()
    } else if (step === 1) {
      if (!validateUsername()) return
      goNext()
    } else {
      await finish()
    }
  }

  async function finish() {
    setSaving(true)
    setErr('')
    try {
      const { error } = await useAuthStore.getState().updateProfile({
        username: username.toLowerCase(),
        bio: bio.trim() || null,
        avatar_emoji: emoji,
        display_name: username,
      })
      if (error) {
        // Unique constraint on username
        if (error.code === '23505' || error.message?.toLowerCase().includes('unique')) {
          setErr('Ese nombre de usuario ya está en uso, elige otro')
          setDir(-1)
          setStep(1)
          return
        }
        throw error
      }
      navigate('/')
    } catch (e) {
      setErr(e.message || 'Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  async function handleSkipBio() {
    setBio('')
    await finish()
  }

  const steps = ['emoji', 'username', 'bio']

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#000',
        padding: '0 24px 40px',
        overflowY: 'auto',
      }}
    >
      {/* VS· Logo */}
      <div style={{ textAlign: 'center', paddingTop: 52, marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: '-2px',
              color: '#fff',
              lineHeight: 1,
            }}
          >
            VS
          </span>
          <span
            className="logo-dot"
            style={{ width: 7, height: 7, marginBottom: 12, marginLeft: 2 }}
          />
        </div>
      </div>

      {/* Progress dots */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 40,
          marginTop: 4,
        }}
      >
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i === step ? '#e8000a' : 'transparent',
              border: i === step ? '2px solid #e8000a' : '2px solid rgba(255,255,255,.25)',
              transition: 'all 0.25s ease',
              boxShadow: i === step ? '0 0 8px rgba(232,0,10,.6)' : 'none',
            }}
          />
        ))}
      </div>

      {/* Animated step content */}
      <div style={{ width: '100%', maxWidth: 360, flex: 1, position: 'relative' }}>
        <AnimatePresence mode="wait" custom={dir}>
          {step === 0 && (
            <motion.div
              key="step-emoji"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1
                style={{
                  fontFamily: "'Unbounded', sans-serif",
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#fff',
                  textAlign: 'center',
                  marginBottom: 8,
                  letterSpacing: '-0.5px',
                }}
              >
                Elige tu emoji
              </h1>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  color: 'rgba(255,255,255,.4)',
                  textAlign: 'center',
                  marginBottom: 32,
                }}
              >
                Tu avatar en Very Short
              </p>

              {/* Emoji grid 5 per row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: 10,
                  justifyItems: 'center',
                  marginBottom: 32,
                }}
              >
                {EMOJIS.map((em) => (
                  <button
                    key={em}
                    onClick={() => setEmoji(em)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      border: emoji === em
                        ? '2.5px solid #e8000a'
                        : '2px solid rgba(255,255,255,.1)',
                      background: emoji === em
                        ? 'rgba(232,0,10,.1)'
                        : 'rgba(255,255,255,.05)',
                      fontSize: 24,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      boxShadow: emoji === em ? '0 0 12px rgba(232,0,10,.35)' : 'none',
                      transform: emoji === em ? 'scale(1.08)' : 'scale(1)',
                    }}
                    aria-label={`Emoji ${em}`}
                    aria-pressed={emoji === em}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-username"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1
                style={{
                  fontFamily: "'Unbounded', sans-serif",
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#fff',
                  textAlign: 'center',
                  marginBottom: 8,
                  letterSpacing: '-0.5px',
                }}
              >
                Tu usuario
              </h1>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  color: 'rgba(255,255,255,.4)',
                  textAlign: 'center',
                  marginBottom: 32,
                }}
              >
                Así te encontrarán en Very Short
              </p>

              <div style={{ position: 'relative', marginBottom: 8 }}>
                <span
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 15,
                    color: 'rgba(255,255,255,.35)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                >
                  @
                </span>
                <input
                  className="vs-input"
                  type="text"
                  placeholder="tu_usuario"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErr('') }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={20}
                  style={{ paddingLeft: 30, textAlign: 'left', width: '100%' }}
                  autoFocus
                />
              </div>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 11,
                  color: 'rgba(255,255,255,.25)',
                  textAlign: 'right',
                  marginBottom: 32,
                  letterSpacing: '0.5px',
                }}
              >
                {username.length}/20
              </p>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-bio"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1
                style={{
                  fontFamily: "'Unbounded', sans-serif",
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#fff',
                  textAlign: 'center',
                  marginBottom: 8,
                  letterSpacing: '-0.5px',
                }}
              >
                Tu bio
              </h1>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  color: 'rgba(255,255,255,.4)',
                  textAlign: 'center',
                  marginBottom: 32,
                }}
              >
                Cuéntanos algo de ti (opcional)
              </p>

              <textarea
                className="vs-input"
                placeholder="Cuéntanos algo..."
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 100))}
                rows={4}
                style={{
                  resize: 'none',
                  width: '100%',
                  fontFamily: "'Space Grotesk', sans-serif",
                  lineHeight: 1.6,
                }}
                autoFocus
              />
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 11,
                  color: bio.length > 85 ? 'rgba(232,0,10,.7)' : 'rgba(255,255,255,.25)',
                  textAlign: 'right',
                  marginTop: 6,
                  marginBottom: 32,
                  letterSpacing: '0.5px',
                  transition: 'color 0.2s',
                }}
              >
                {bio.length}/100
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {err && (
            <motion.div
              key="err"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: 'rgba(232,0,10,.1)',
                border: '1px solid rgba(232,0,10,.3)',
                borderRadius: 10,
                padding: '10px 14px',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 12,
                color: '#ff6b6b',
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              {err}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA buttons */}
        <button
          className="btn-primary"
          onClick={handleContinue}
          disabled={saving}
          style={{ width: '100%', marginBottom: step === 2 ? 12 : 0 }}
        >
          {saving ? '...' : step === 2 ? 'GUARDAR Y CONTINUAR' : 'CONTINUAR'}
        </button>

        {step === 2 && (
          <button
            onClick={handleSkipBio}
            disabled={saving}
            className="btn-ghost"
            style={{
              width: '100%',
              fontSize: 11,
              letterSpacing: '2.5px',
            }}
          >
            OMITIR
          </button>
        )}
      </div>
    </div>
  )
}
