import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useFeedStore } from '@/stores/feedStore'
import { useRecord } from '@/hooks/useRecord'
import Spinner from '@/components/ui/Spinner'

const MAX_MS = 7500
const EMOJI_OPTIONS = ['🎬', '🔥', '❤️', '😂', '🌊', '🎵', '💪', '✨']

export default function Record() {
  const navigate           = useNavigate()
  const { user, profile }  = useAuthStore()
  const { addStory }       = useFeedStore()
  const videoRef   = useRef(null)
  const [caption, setCaption] = useState('')
  const [toastMsg, setToastMsg] = useState('')
  const [toastOk, setToastOk]   = useState(false)
  const [selectedEmoji, setSelectedEmoji] = useState('🎬')

  const {
    phase, elapsed, facing, camErr, blobUrl,
    dashOff, stream, openCamera, flipCamera,
    startRecording, stopRecording, uploadAndPost, retake, reset,
  } = useRecord(user?.id)

  // Attach stream / blob to video element when phase changes
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (phase === 'camera' || phase === 'recording') {
      el.srcObject = stream.current
      el.src = ''
      el.muted = true
      el.play().catch(() => {})
    } else if (phase === 'preview' && blobUrl) {
      el.srcObject = null
      el.src = blobUrl
      el.muted = false
      el.loop = true
      el.play().catch(() => {})
    }
  }, [phase, blobUrl, stream])

  useEffect(() => () => reset(), []) // eslint-disable-line react-hooks/exhaustive-deps

  function showToast(msg, ok = false, ms = 2800) {
    setToastMsg(msg)
    setToastOk(ok)
    setTimeout(() => setToastMsg(''), ms)
  }

  const handleClose = () => {
    if (phase === 'recording') {
      if (window.confirm('¿Cancelar grabación?')) {
        reset()
        navigate(-1)
      }
    } else {
      reset()
      navigate(-1)
    }
  }

  const handlePost = async () => {
    try {
      const { row, blobUrl: url } = await uploadAndPost({ caption, emoji: selectedEmoji })
      addStory({
        ...row,
        blobUrl:    url,
        username:   (profile?.username || user?.email?.split('@')[0] || 'TÚ').toUpperCase(),
        display:    profile?.username  || user?.email?.split('@')[0] || 'tú',
        emoji:      selectedEmoji,
        avatar_url: profile?.avatar_url   || null,
      })
      showToast('Historia publicada ✓', true, 1500)
      setTimeout(() => navigate('/'), 1500)
    } catch (e) {
      showToast(`Error: ${e?.message ?? 'intenta de nuevo'}`, false)
    }
  }

  const showVideo = phase === 'camera' || phase === 'recording' || phase === 'preview'
  const pct = Math.min(elapsed / MAX_MS, 1)

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            className="toast-stack"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ zIndex: 900 }}
          >
            <div className={`toast-item${toastOk ? ' ok' : ''}`}>{toastMsg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success overlay — shown briefly after post */}
      <AnimatePresence>
        {toastOk && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 800,
              background: 'rgba(0,0,0,.75)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1.15, 1] }}
              transition={{ duration: 0.4, times: [0, 0.6, 1] }}
              style={{ fontSize: 64 }}
            >
              ✓
            </motion.div>
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 13,
              fontWeight: 700, letterSpacing: '3px', color: '#fff', textTransform: 'uppercase',
            }}>
              PUBLICADO
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <div className="topbar" style={{ position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="logo-mark">VS</span><span className="logo-dot" />
        </div>
        <button
          onClick={handleClose}
          style={{ background: 'var(--k3)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 9, width: 34, height: 34, color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >✕</button>
      </div>

      {/* Camera stage */}
      <div className="cam-stage" style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000' }}>
        {showVideo && (
          <video
            ref={videoRef}
            playsInline
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', zIndex: 1,
              transform: phase !== 'preview' && facing === 'user' ? 'scaleX(-1)' : 'none',
            }}
          />
        )}

        {/* Idle */}
        {phase === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, zIndex: 2 }}>
            <button
              onClick={openCamera}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                width: 150, height: 150, borderRadius: '50%', cursor: 'pointer', zIndex: 2,
                background: 'rgba(232,0,10,.07)', border: '2px solid rgba(232,0,10,.25)',
              }}
            >
              <span style={{ fontSize: 40 }}>📷</span>
              <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, letterSpacing: 3, color: 'rgba(232,0,10,.7)', textTransform: 'uppercase' }}>ABRIR CÁMARA</p>
            </button>
            {camErr && (
              <div style={{ background: 'rgba(232,0,10,.12)', border: '1px solid rgba(232,0,10,.3)', borderRadius: 8, padding: '12px 16px', fontFamily: 'Space Grotesk', fontSize: 12, color: 'rgba(255,255,255,.7)', textAlign: 'center', maxWidth: 280 }}>
                {camErr}
              </div>
            )}
          </div>
        )}

        {/* Upload overlay */}
        {phase === 'uploading' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Spinner />
            <p style={{ fontFamily: 'Space Grotesk', fontSize: 11, letterSpacing: 3, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase' }}>PUBLICANDO...</p>
          </div>
        )}

        {/* REC indicator */}
        {phase === 'recording' && (
          <div style={{ position: 'absolute', top: 52, left: 16, zIndex: 4, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,.55)', borderRadius: 4, padding: '4px 10px', backdropFilter: 'blur(4px)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--r)', animation: 'dot-blink .7s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'Space Grotesk', fontSize: 10, letterSpacing: 2, color: '#fff', textTransform: 'uppercase' }}>
              REC {((MAX_MS - elapsed) / 1000).toFixed(1)}S
            </span>
          </div>
        )}

        {/* Timer arc */}
        {(phase === 'camera' || phase === 'recording') && (
          <div style={{ position: 'absolute', top: 52, right: 16, width: 44, height: 44, zIndex: 4 }}>
            <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="3" />
              <circle cx="22" cy="22" r="19" fill="none" stroke="var(--r)" strokeWidth="3"
                strokeLinecap="round" strokeDasharray="120" strokeDashoffset={dashOff}
                style={{ filter: 'drop-shadow(0 0 3px var(--r))', transition: 'stroke-dashoffset .1s linear' }}
              />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: 600, color: 'var(--r)', letterSpacing: 1 }}>
              {phase === 'recording' ? `${((MAX_MS - elapsed) / 1000).toFixed(1)}` : '7'}S
            </div>
          </div>
        )}

        {/* Caption + emoji selector on preview */}
        {phase === 'preview' && (
          <div style={{ position: 'absolute', bottom: 52, left: 16, right: 16, zIndex: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Emoji selector row */}
            <div style={{
              display: 'flex', gap: 6, justifyContent: 'center',
              background: 'rgba(0,0,0,.55)', borderRadius: 12,
              padding: '8px 10px', backdropFilter: 'blur(8px)',
            }}>
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  onClick={() => setSelectedEmoji(em)}
                  aria-label={`Emoji ${em}`}
                  style={{
                    background: selectedEmoji === em
                      ? 'rgba(232,0,10,.35)'
                      : 'rgba(255,255,255,.08)',
                    border: selectedEmoji === em
                      ? '1.5px solid rgba(232,0,10,.7)'
                      : '1.5px solid transparent',
                    borderRadius: 8,
                    width: 36, height: 36,
                    fontSize: 18,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s, border-color 0.15s',
                    transform: selectedEmoji === em ? 'scale(1.12)' : 'scale(1)',
                  }}
                >
                  {em}
                </button>
              ))}
            </div>

            {/* Caption input */}
            <input
              className="vs-input"
              placeholder="Describe tu historia..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={120}
              style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,.6)' }}
            />
          </div>
        )}
      </div>

      {/* Tools bar */}
      {(phase === 'idle' || phase === 'camera') && (
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', padding: '10px 12px 6px', background: 'var(--k2)', borderTop: '1px solid rgba(255,255,255,.04)' }}>
          {[['🎵','AUDIO'],['✍️','TEXTO'],['✨','FX'],['🎨','COLOR'],['😎','FILTRO']].map(([ic,tx]) => (
            <button key={tx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, border: 'none', background: 'transparent' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--k3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, border: '1px solid rgba(255,255,255,.07)' }}>{ic}</div>
              <span style={{ fontFamily: 'Space Grotesk', fontSize: 8, letterSpacing: 1, color: 'rgba(255,255,255,.22)', textTransform: 'uppercase' }}>{tx}</span>
            </button>
          ))}
        </div>
      )}

      {/* Record row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '12px 20px 14px', background: 'var(--k2)' }}>
        {/* Left btn */}
        {phase === 'preview'
          ? <button onClick={retake} style={sideBtn}>🔄</button>
          : <button onClick={handleClose} style={sideBtn}>✕</button>
        }

        {/* Center btn */}
        {phase === 'idle' && <RecBtn onClick={openCamera}><RecCore /></RecBtn>}
        {phase === 'camera' && <RecBtn onClick={startRecording}><RecCore /></RecBtn>}
        {phase === 'recording' && <RecBtn onClick={stopRecording} isStop><RecSquare /></RecBtn>}
        {phase === 'preview' && (
          <RecBtn onClick={handlePost} isPost>
            <span style={{ fontFamily: 'Space Grotesk', fontSize: 10, fontWeight: 600, letterSpacing: 2, color: '#fff', textTransform: 'uppercase' }}>PUBLICAR</span>
          </RecBtn>
        )}
        {phase === 'uploading' && <RecBtn><Spinner size={22} /></RecBtn>}

        {/* Right btn */}
        {(phase === 'camera' || phase === 'recording')
          ? <button onClick={flipCamera} style={sideBtn}>🔄</button>
          : <button style={{ ...sideBtn, opacity: 0.2, cursor: 'not-allowed' }}>⬆️</button>
        }
      </div>
    </div>
  )
}

const sideBtn = {
  width: 42, height: 42, borderRadius: '50%', background: 'var(--k3)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, cursor: 'pointer', border: '1px solid rgba(255,255,255,.07)',
  color: '#fff', transition: 'transform .13s',
}

function RecBtn({ onClick, isStop, isPost, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 72, height: 72, borderRadius: '50%',
        border: `3px solid ${isStop ? 'var(--r2)' : 'var(--r)'}`,
        background: isStop ? 'var(--r)' : isPost ? 'transparent' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', animation: (!isStop && !isPost) ? 'recPulse 2s ease-out infinite' : 'none',
      }}
    >
      {children}
    </button>
  )
}

function RecCore() {
  return <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--r)', boxShadow: '0 4px 16px rgba(232,0,10,.4)' }} />
}

function RecSquare() {
  return <div style={{ width: 22, height: 22, borderRadius: 8, background: '#fff' }} />
}
