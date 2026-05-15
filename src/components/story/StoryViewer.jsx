import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { fmtCount, timeAgo } from '@/lib/utils'
import FollowButton from '@/components/social/FollowButton'

// ---------------------------------------------------------------------------
// Toast — local state only, auto-dismiss after 2.5s
// ---------------------------------------------------------------------------
function useToast() {
  const [toast, setToast] = useState(null) // { msg, type: 'success' | 'error' }
  const timerRef = useRef(null)

  const show = useCallback((msg, type = 'success') => {
    clearTimeout(timerRef.current)
    setToast({ msg, type })
    timerRef.current = setTimeout(() => setToast(null), 2500)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { toast, show }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function StoryViewer({ story, stories: storiesProp, storyIndex = 0, onClose }) {
  // Normalize to a stories array — support both single and multi-story modes
  const stories = storiesProp && storiesProp.length > 0
    ? storiesProp
    : story ? [story] : []

  const user    = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)

  const [open,          setOpen]          = useState(false)
  const [currentIdx,    setCurrentIdx]    = useState(storyIndex)
  const [progress,      setProgress]      = useState(0)
  const [reacted,       setReacted]       = useState(null)   // emoji | null
  const [reactionCount, setReactionCount] = useState(0)
  const [replyText,     setReplyText]     = useState('')
  const [replySending,  setReplySending]  = useState(false)

  const { toast, show: showToast } = useToast()

  const progressRaf    = useRef(null)
  const autoCloseTimer = useRef(null)
  const touchStartY    = useRef(null)
  const containerRef   = useRef(null)
  const replyInputRef  = useRef(null)

  const currentStory = stories[currentIdx] ?? null

  const duration = currentStory?.duration_ms ?? 7500
  const videoSrc =
    currentStory?.blobUrl ||
    (currentStory?.video_url && !currentStory.video_url.startsWith('demo://')
      ? currentStory.video_url
      : null)

  const isDemo     = !user || user.id === 'demo'
  const isOwnStory = user && currentStory && user.id === currentStory.user_id

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  const handleClose = useCallback(() => {
    cancelAnimationFrame(progressRaf.current)
    clearTimeout(autoCloseTimer.current)
    setOpen(false)
    setTimeout(() => onClose?.(), 350)
  }, [onClose]) // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = useCallback(() => {
    if (currentIdx < stories.length - 1) {
      setCurrentIdx((i) => i + 1)
    } else {
      handleClose()
    }
  }, [currentIdx, stories.length, handleClose])

  const goPrev = useCallback(() => {
    if (currentIdx > 0) {
      setCurrentIdx((i) => i - 1)
    } else {
      handleClose()
    }
  }, [currentIdx, handleClose])

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function clearTimers() {
    cancelAnimationFrame(progressRaf.current)
    clearTimeout(autoCloseTimer.current)
  }

  function startProgress() {
    clearTimers()
    setProgress(0)
    const start = performance.now()

    function tick(now) {
      const elapsed = now - start
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)
      if (pct < 100) {
        progressRaf.current = requestAnimationFrame(tick)
      } else {
        autoCloseTimer.current = setTimeout(() => goNext(), 200)
      }
    }

    progressRaf.current = requestAnimationFrame(tick)
  }

  // -------------------------------------------------------------------------
  // Open/close lifecycle + fetch initial reaction — reset on story change
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!currentStory) {
      setOpen(false)
      return () => clearTimers()
    }

    // Animate open on first mount only
    requestAnimationFrame(() => setOpen(true))
    startProgress()

    // Reset per-story state
    setReactionCount(currentStory.reaction_count ?? 0)
    setReplyText('')
    setReacted(null)

    // Fetch whether current user already reacted
    if (user && !isDemo && currentStory.id) {
      supabase
        .from('reactions')
        .select('emoji')
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.emoji) setReacted(data.emoji)
        })
    }

    return () => clearTimers()
  }, [currentStory?.id, currentIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Tap zones
  // -------------------------------------------------------------------------
  const handleViewerTap = useCallback((e) => {
    // Ignore taps on interactive elements
    if (e.target.closest('button, input')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const third = rect.width / 3
    if (x < third) {
      goPrev()
    } else if (x > third * 2) {
      goNext()
    }
    // middle third: do nothing
  }, [goPrev, goNext])

  // -------------------------------------------------------------------------
  // Swipe down to close
  // -------------------------------------------------------------------------
  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartY.current === null) return
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    touchStartY.current = null
    if (deltaY > 80) handleClose()
  }

  // -------------------------------------------------------------------------
  // Reactions
  // -------------------------------------------------------------------------
  async function handleReaction(emoji) {
    if (isDemo) {
      showToast('Crea una cuenta para reaccionar', 'error')
      return
    }
    if (!user || !currentStory) return

    const alreadySameEmoji = reacted === emoji

    const prevReacted = reacted
    const prevCount   = reactionCount

    if (alreadySameEmoji) {
      setReacted(null)
      setReactionCount((c) => Math.max(0, c - 1))
    } else {
      const wasReacting = reacted !== null
      setReacted(emoji)
      setReactionCount((c) => wasReacting ? c : c + 1)
    }

    try {
      if (alreadySameEmoji) {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('story_id', currentStory.id)
          .eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('reactions')
          .upsert(
            { story_id: currentStory.id, user_id: user.id, emoji },
            { onConflict: 'story_id,user_id' }
          )
        if (error) throw error
      }
    } catch {
      setReacted(prevReacted)
      setReactionCount(prevCount)
      showToast('Error al reaccionar', 'error')
    }
  }

  // -------------------------------------------------------------------------
  // Reply
  // -------------------------------------------------------------------------
  async function handleReply() {
    if (isDemo) {
      showToast('Crea una cuenta para comentar', 'error')
      return
    }
    const text = replyText.trim()
    if (!text || !user || !currentStory) return
    setReplySending(true)
    try {
      const { error } = await supabase
        .from('replies')
        .insert({ story_id: currentStory.id, user_id: user.id, text })
      if (error) throw error
      setReplyText('')
      showToast('Respuesta enviada ✓', 'success')
    } catch {
      showToast('Error al enviar respuesta', 'error')
    } finally {
      setReplySending(false)
    }
  }

  function handleReplyKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleReply()
    }
  }

  // -------------------------------------------------------------------------
  // Render guard
  // -------------------------------------------------------------------------
  if (!currentStory) return null

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className={`viewer${open ? ' open' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleViewerTap}
    >
      {/* ================================================================
          BACKGROUND: Video or Emoji
      ================================================================ */}
      {videoSrc ? (
        <video
          src={videoSrc}
          autoPlay
          playsInline
          muted={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
          }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--k2)',
            fontSize: 120,
            zIndex: 0,
          }}
          aria-hidden="true"
        >
          {currentStory.emoji ?? currentStory.avatar_emoji ?? '🎬'}
        </div>
      )}

      {/* ================================================================
          GRADIENT OVERLAYS
      ================================================================ */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 140,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, transparent 100%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 260,
          background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, transparent 100%)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* ================================================================
          PROGRESS BARS — one per story
      ================================================================ */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 12,
          right: 12,
          display: 'flex',
          gap: 3,
          zIndex: 10,
        }}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso de la historia"
      >
        {(() => {
          const MAX_BARS = 8
          const total = stories.length
          let startIdx = 0
          if (total > MAX_BARS) {
            startIdx = Math.max(0, Math.min(currentIdx - Math.floor(MAX_BARS / 2), total - MAX_BARS))
          }
          return stories.slice(startIdx, startIdx + MAX_BARS).map((_, relIdx) => {
            const idx = startIdx + relIdx
            let fillWidth = '0%'
            if (idx < currentIdx) fillWidth = '100%'
            else if (idx === currentIdx) fillWidth = `${progress}%`
            return (
              <div key={idx} style={{ flex: 1, height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.22)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: fillWidth, background: '#fff', borderRadius: 2 }} />
              </div>
            )
          })
        })()}
      </div>

      {/* ================================================================
          HEADER: avatar + username + view count + follow + close
      ================================================================ */}
      <div
        style={{
          position: 'absolute',
          top: 26,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          zIndex: 10,
        }}
      >
        {/* Avatar */}
        <div
          className="orb-ring fresh"
          style={{ width: 38, height: 38, flexShrink: 0 }}
        >
          <div className="orb-face">
            {currentStory.avatar_url ? (
              <img
                src={currentStory.avatar_url}
                alt={currentStory.username ?? 'usuario'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '50%',
                }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : (
              <span style={{ fontSize: 17 }}>
                {currentStory.avatar_emoji ?? currentStory.emoji ?? '🎬'}
              </span>
            )}
          </div>
        </div>

        {/* Username + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "'Unbounded', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentStory.username ?? 'usuario'}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 2,
            }}
          >
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 10,
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              {currentStory.created_at ? timeAgo(currentStory.created_at) : 'AHORA'}
            </span>
            {currentStory.view_count > 0 && (
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.45)',
                }}
                aria-label={`${currentStory.view_count} vistas`}
              >
                👁 {fmtCount(currentStory.view_count)}
              </span>
            )}
          </div>
        </div>

        {/* Follow button — only for real authenticated users viewing others' stories */}
        {!isDemo && !isOwnStory && currentStory.user_id && (
          <FollowButton targetId={currentStory.user_id} small />
        )}

        {/* Close */}
        <button
          onClick={handleClose}
          aria-label="Cerrar historia"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            fontSize: 24,
            lineHeight: 1,
            padding: '4px 6px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* ================================================================
          NAV ARROWS — subtle side indicators
      ================================================================ */}
      {/* Flecha izquierda */}
      {currentIdx > 0 && (
        <div aria-hidden="true" style={{
          position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)',
          zIndex: 10, pointerEvents: 'none', userSelect: 'none',
          background: 'rgba(0,0,0,.35)', borderRadius: '50%',
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,.85)', fontSize: 20, backdropFilter: 'blur(4px)',
        }}>‹</div>
      )}
      {/* Flecha derecha */}
      {currentIdx < stories.length - 1 && (
        <div aria-hidden="true" style={{
          position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
          zIndex: 10, pointerEvents: 'none', userSelect: 'none',
          background: 'rgba(0,0,0,.35)', borderRadius: '50%',
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,.85)', fontSize: 20, backdropFilter: 'blur(4px)',
        }}>›</div>
      )}
      {/* Contador posición — solo si hay varias historias */}
      {stories.length > 1 && (
        <div style={{
          position: 'absolute', top: 26, right: 44, zIndex: 11,
          fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, fontWeight: 600,
          letterSpacing: 1, color: 'rgba(255,255,255,.55)',
          background: 'rgba(0,0,0,.3)', borderRadius: 20, padding: '2px 8px',
          backdropFilter: 'blur(4px)', pointerEvents: 'none',
        }}>
          {currentIdx + 1}/{stories.length}
        </div>
      )}

      {/* ================================================================
          CAPTION
      ================================================================ */}
      {currentStory.caption && (
        <p
          style={{
            position: 'absolute',
            bottom: 100,
            left: 16,
            right: 72,
            zIndex: 10,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 400,
            color: '#fff',
            lineHeight: 1.55,
            textShadow: '0 1px 6px rgba(0,0,0,0.7)',
            margin: 0,
          }}
        >
          {currentStory.caption}
        </p>
      )}

      {/* ================================================================
          REACTION BUTTONS (bottom-right)
      ================================================================ */}
      <div
        style={{
          position: 'absolute',
          bottom: 100,
          right: 14,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {['❤️', '🔥'].map((emoji) => {
          const active = reacted === emoji
          return (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              aria-label={`Reaccionar con ${emoji}`}
              aria-pressed={active}
              style={{
                background: active
                  ? 'rgba(255, 40, 80, 0.22)'
                  : 'rgba(0,0,0,0.45)',
                border: active
                  ? '1.5px solid rgba(255, 80, 100, 0.55)'
                  : '1px solid rgba(255,255,255,0.12)',
                boxShadow: active
                  ? '0 0 14px rgba(255, 30, 70, 0.55)'
                  : 'none',
                borderRadius: '50%',
                width: 46,
                height: 46,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                cursor: 'pointer',
                transition: 'transform 0.12s, box-shadow 0.14s, border 0.14s',
                transform: active ? 'scale(1.18)' : 'scale(1)',
              }}
            >
              {emoji}
            </button>
          )
        })}
        {/* Reaction count */}
        {reactionCount > 0 && (
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
              marginTop: -4,
            }}
            aria-label={`${reactionCount} reacciones`}
          >
            {fmtCount(reactionCount)}
          </span>
        )}
      </div>

      {/* ================================================================
          REPLY INPUT (bottom)
      ================================================================ */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 12,
          right: 12,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <input
          ref={replyInputRef}
          className="vs-input"
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: 13,
            borderRadius: 22,
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff',
            outline: 'none',
            caretColor: 'var(--r, #ff2b4e)',
          }}
          placeholder="Responde a esta historia..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={handleReplyKeyDown}
          disabled={replySending}
          aria-label="Responder a la historia"
        />
        {replyText.trim().length > 0 && (
          <button
            onClick={handleReply}
            disabled={replySending}
            aria-label="Enviar respuesta"
            style={{
              background: 'var(--r, #ff2b4e)',
              border: 'none',
              borderRadius: '50%',
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: replySending ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              opacity: replySending ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>

      {/* ================================================================
          TOAST
      ================================================================ */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            background: toast.type === 'error'
              ? 'rgba(220, 38, 38, 0.92)'
              : 'rgba(22, 163, 74, 0.92)',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: 24,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            pointerEvents: 'none',
            animation: 'fadeInDown 0.2s ease',
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}
