import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useFeedStore } from '@/stores/feedStore'
import { useAuthStore } from '@/stores/authStore'
import { useNotifs } from '@/hooks/useNotifs'
import StoryOrb from '@/components/story/StoryOrb'
import StoryViewer from '@/components/story/StoryViewer'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LogoVS from '@/components/ui/LogoVS'

const ROW_SIZES = [86, 72, 60]

export default function Feed() {
  const navigate  = useNavigate()
  const { user }  = useAuthStore()
  const {
    stories, followFeed, activeStory, viewed,
    fetchFeed, fetchFollowFeed, openStory, closeStory,
    subscribeRealtime, unsubscribe,
  } = useFeedStore()
  const { unread } = useNotifs(user?.id)
  const [mode, setMode] = useState('todos') // 'todos' | 'siguiendo'

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(null)
  const scrollRef   = useRef(null)

  useEffect(() => {
    fetchFeed()
    if (user?.id && user.id !== 'demo') fetchFollowFeed(user.id)
    const sub = subscribeRealtime()
    return () => unsubscribe()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pull-to-refresh handlers
  const handleTouchStart = (e) => {
    const el = scrollRef.current
    if (el && el.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    } else {
      touchStartY.current = null
    }
  }

  const handleTouchEnd = async (e) => {
    if (touchStartY.current === null) return
    const delta = e.changedTouches[0].clientY - touchStartY.current
    touchStartY.current = null
    if (delta < 60) return // not enough of a swipe

    setRefreshing(true)
    try {
      await fetchFeed()
      if (user?.id && user.id !== 'demo') await fetchFollowFeed(user.id)
    } finally {
      // keep spinner visible for at least 800ms for visual feedback
      setTimeout(() => setRefreshing(false), 800)
    }
  }

  const activeStories = mode === 'siguiendo' && followFeed.length > 0 ? followFeed : stories
  const topStories    = activeStories.slice(0, 5)
  const gridStories   = activeStories.slice(5)
  const rows = []
  for (let i = 0; i < gridStories.length; i += 3) rows.push(gridStories.slice(i, i + 3))

  const hasFollowFeed = followFeed.length > 0

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--k)' }}>
      {/* TopBar */}
      <div className="topbar">
        <LogoVS size="topbar" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => navigate('/activity')} aria-label="Actividad"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, position: 'relative', fontSize: 20 }}>
            🔔
            {unread > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: 'var(--r)', border: '1.5px solid var(--k)', boxShadow: '0 0 6px rgba(232,0,10,.6)' }} />
            )}
          </button>
          <ThemeToggle />
          <button onClick={() => navigate('/messages')} aria-label="Mensajes"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, fontSize: 20 }}>
            💬
          </button>
        </div>
      </div>

      {/* Feed mode toggle */}
      <div style={{ display: 'flex', padding: '6px 16px 0', gap: 0, flexShrink: 0 }}>
        {['todos', 'siguiendo'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '7px 14px', position: 'relative',
            fontFamily: 'Space Grotesk, sans-serif', fontSize: 10, fontWeight: 600,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            color: mode === m ? '#fff' : 'rgba(255,255,255,.25)',
            transition: 'color .15s',
          }}>
            {m.toUpperCase()}
            {mode === m && (
              <motion.div layoutId="feed-tab-bar" style={{
                position: 'absolute', bottom: 0, left: '15%', right: '15%',
                height: 2, background: 'var(--r)', borderRadius: 1,
              }} />
            )}
            {m === 'siguiendo' && !hasFollowFeed && (
              <span style={{ marginLeft: 4, fontSize: 8, color: 'rgba(255,255,255,.18)' }}>0</span>
            )}
          </button>
        ))}
      </div>

      {/* Pull-to-refresh indicator */}
      <AnimatePresence>
        {refreshing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 32 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              overflow: 'hidden', flexShrink: 0,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
              style={{
                width: 14, height: 14,
                border: '2px solid rgba(255,255,255,.12)',
                borderTop: '2px solid var(--r)',
                borderRadius: '50%',
              }}
            />
            <span style={{
              fontFamily: 'Space Grotesk, sans-serif', fontSize: 9,
              fontWeight: 600, letterSpacing: '2px',
              color: 'rgba(255,255,255,.4)', textTransform: 'uppercase',
            }}>
              ACTUALIZANDO...
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={scrollRef}
        className="vs-scroll"
        style={{ flex: 1, paddingBottom: 'calc(var(--tabh) + 8px)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Section rule */}
        <div className="section-rule">
          <div className="section-rule-bar" />
          <span className="section-rule-txt">{mode === 'siguiendo' ? 'SIGUIENDO' : 'ACTIVOS'}</span>
          <div className="section-rule-line" />
        </div>

        {/* Top strip */}
        <div className="vs-hscroll" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, padding: '4px 16px 12px' }}>
          {/* TÚ + add circle */}
          <button onClick={() => navigate('/record')} aria-label="Grabar historia"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 0, flexShrink: 0 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', background: 'var(--k3)',
              border: '2px dashed rgba(232,0,10,.45)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 28,
            }}>＋</div>
            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,.5)' }}>TÚ</span>
          </button>

          <AnimatePresence mode="popLayout">
            {topStories.map((story, i) => (
              <motion.div key={story.id}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.28, delay: i * 0.05 }}>
                <StoryOrb story={story} size="xl" isViewed={viewed.has(story.id)} onPress={() => openStory(story)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Section rule */}
        <div className="section-rule">
          <div className="section-rule-bar" />
          <span className="section-rule-txt">ACTIVOS AHORA</span>
          <div className="section-rule-line" />
        </div>

        {/* Staggered grid */}
        {rows.length > 0 ? (
          <div style={{ padding: '8px 16px 0' }}>
            {rows.map((row, ri) => (
              <motion.div key={ri}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: ri * 0.04 }}
                style={{
                  display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 14,
                  paddingLeft: ri % 2 === 0 ? 30 : 0,
                  paddingRight: ri % 2 !== 0 ? 30 : 0,
                }}>
                {row.map((story, si) => {
                  const sizePx = ROW_SIZES[si] ?? 60
                  // Dorado = popular (live o >500 vistas) | Rojo = sin ver | Gris = visto
                  const isPopular = story.is_live || (story.view_count ?? 0) > 500
                  const ringClass = viewed.has(story.id)
                    ? 'orb-ring seen'
                    : isPopular ? 'orb-ring gold' : 'orb-ring fresh'
                  const photoUrl  = story.avatar_url ?? story.profiles?.avatar_url ?? null
                  return (
                    <button key={story.id} onClick={() => openStory(story)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flexShrink: 0 }}
                      aria-label={`Ver historia de ${story.username}`}>
                      <div className={ringClass} style={{ width: sizePx, height: sizePx }}>
                        <div className="orb-face">
                          {photoUrl
                            ? <img src={photoUrl} alt={story.username} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e => { e.target.style.display = 'none' }} />
                            : <span style={{ fontSize: sizePx * 0.38 }}>{story.emoji ?? '🎬'}</span>
                          }
                          {story.story_count > 1 && (
                            <div style={{ position: 'absolute', bottom: -2, right: -4, background: 'var(--r)', color: '#fff', fontFamily: 'Space Grotesk', fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, border: '2px solid var(--k)' }}>
                              ×{story.story_count}
                            </div>
                          )}
                        </div>
                      </div>
                      <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--orb-label)', maxWidth: sizePx + 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {story.display ?? story.username}
                      </span>
                    </button>
                  )
                })}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            {mode === 'siguiendo' ? (
              <>
                <span style={{ fontSize: 40 }}>👥</span>
                <p>SIGUE A ALGUIEN</p>
                <button onClick={() => setMode('todos')} className="btn-ghost" style={{ width: 'auto', padding: '10px 24px', marginTop: 8 }}>
                  VER TODOS
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 40 }}>🎬</span>
                <p>AÚN NO HAY HISTORIAS</p>
              </>
            )}
          </div>
        )}
      </div>

      <StoryViewer
        stories={activeStory ? activeStories : []}
        storyIndex={activeStory ? activeStories.findIndex(s => s.id === activeStory.id) : 0}
        onClose={closeStory}
      />
    </div>
  )
}
