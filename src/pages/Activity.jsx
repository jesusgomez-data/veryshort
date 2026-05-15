import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useFeedStore } from '@/stores/feedStore'
import LogoVS from '@/components/ui/LogoVS'
import { useNotifs } from '@/hooks/useNotifs'
import { timeAgo, fmtCount } from '@/lib/utils'

function notifText(notif) {
  switch (notif.type) {
    case 'follow':
      return 'empezó a seguirte'
    case 'reaction':
      return `reaccionó con ${notif.data?.emoji ?? '❤️'}`
    case 'reply':
      return 'respondió tu historia'
    case 'story_view_milestone':
      return `Tu historia alcanzó ${fmtCount(notif.data?.milestone ?? 0)} vistas 🎯`
    case 'message':
      return 'te envió un mensaje'
    default:
      return 'interactuó con tu contenido'
  }
}

export default function Activity() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [refreshKey, setRefreshKey] = useState(0)
  const { notifs, unread, markAllRead } = useNotifs(user?.id, refreshKey)
  const openStory = useFeedStore((s) => s.openStory)
  const stories = useFeedStore((s) => s.stories)

  const newNotifs = notifs.filter((n) => !n.is_read)
  const oldNotifs = notifs.filter((n) => n.is_read)

  // Build a handler per notif type
  const handleNotifClick = useCallback((notif) => {
    switch (notif.type) {
      case 'follow':
        if (notif.actor?.username) navigate(`/u/${notif.actor.username}`)
        break
      case 'reaction':
      case 'reply':
        if (notif.story_id) {
          const story = stories.find((s) => s.id === notif.story_id)
          if (story) openStory(story)
        }
        break
      case 'story_view_milestone':
        // No navigation — just mark it read (markAllRead handles the whole list;
        // for a single item we rely on the existing is_read UI logic)
        break
      case 'message':
        navigate('/messages')
        break
      default:
        break
    }
  }, [navigate, openStory, stories])

  // Refresh: increment key to re-trigger useNotifs fetch
  function handleRefresh() {
    setRefreshKey((k) => k + 1)
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--k)',
      }}
    >
      {/* TopBar */}
      <div className="topbar">
        <LogoVS size="topbar" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            aria-label="Actualizar notificaciones"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,.1)',
              borderRadius: 8,
              padding: '5px 10px',
              cursor: 'pointer',
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 8,
              fontWeight: 600,
              letterSpacing: '2px',
              color: 'rgba(255,255,255,.3)',
              textTransform: 'uppercase',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.25)'
              e.currentTarget.style.color = 'rgba(255,255,255,.6)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'
              e.currentTarget.style.color = 'rgba(255,255,255,.3)'
            }}
          >
            ACTUALIZAR
          </button>

          {unread > 0 && (
            <button
              onClick={markAllRead}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 8,
                padding: '6px 12px',
                cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '2px',
                color: 'rgba(255,255,255,.45)',
                textTransform: 'uppercase',
              }}
            >
              MARCAR TODO
            </button>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div
        className="vs-scroll"
        style={{
          flex: 1,
          paddingBottom: 'calc(var(--tabh) + 8px)',
        }}
      >
        {notifs.length === 0 && (
          <div className="empty-state">
            <span style={{ fontSize: 40 }}>🔔</span>
            <p>Sin notificaciones aún</p>
          </div>
        )}

        {/* NUEVAS */}
        {newNotifs.length > 0 && (
          <>
            <div className="section-rule">
              <div className="section-rule-bar" />
              <span className="section-rule-txt">NUEVAS</span>
              <div className="section-rule-line" />
            </div>

            {newNotifs.map((notif, i) => (
              <NotifRow
                key={notif.id}
                notif={notif}
                index={i}
                onClick={() => handleNotifClick(notif)}
              />
            ))}
          </>
        )}

        {/* ANTES */}
        {oldNotifs.length > 0 && (
          <>
            <div className="section-rule" style={{ marginTop: newNotifs.length > 0 ? 8 : 0 }}>
              <div className="section-rule-bar" style={{ background: 'rgba(255,255,255,.15)' }} />
              <span className="section-rule-txt">ANTES</span>
              <div className="section-rule-line" />
            </div>

            {oldNotifs.map((notif, i) => (
              <NotifRow
                key={notif.id}
                notif={notif}
                index={i}
                onClick={() => handleNotifClick(notif)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function NotifRow({ notif, index, onClick }) {
  const isNew = !notif.is_read
  const actorEmoji = notif.actor?.avatar_emoji ?? '👤'
  const actorName = notif.actor?.username ?? 'VS'
  const isMilestone = notif.type === 'story_view_milestone'

  // Only certain types are navigable — milestone rows do nothing on click
  const isClickable = notif.type !== 'story_view_milestone'

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04 }}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick() : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,.04)',
        borderLeft: isNew ? '3px solid var(--r)' : '3px solid transparent',
        background: isNew ? 'rgba(232,0,10,.04)' : 'transparent',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background 0.15s',
      }}
      whileTap={isClickable ? { scale: 0.98 } : undefined}
    >
      {/* Orb */}
      <div
        className={isNew ? 'orb-ring fresh' : 'orb-ring seen'}
        style={{ width: 40, height: 40, flexShrink: 0 }}
      >
        <div className="orb-face">
          <span style={{ fontSize: 18 }}>
            {isMilestone ? '🎯' : actorEmoji}
          </span>
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 12,
            fontWeight: 400,
            color: 'rgba(255,255,255,.8)',
            lineHeight: 1.45,
          }}
        >
          {!isMilestone && (
            <span style={{ fontWeight: 700, color: '#fff' }}>
              {actorName}{' '}
            </span>
          )}
          {notifText(notif)}
        </p>
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 9,
            color: 'rgba(255,255,255,.25)',
            marginTop: 3,
            letterSpacing: '0.5px',
          }}
        >
          {timeAgo(notif.created_at)}
        </p>
      </div>

      {/* New indicator dot */}
      {isNew && (
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--r)',
            flexShrink: 0,
            boxShadow: '0 0 6px rgba(232,0,10,.6)',
          }}
        />
      )}

      {/* Chevron for clickable rows */}
      {isClickable && (
        <span
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,.15)',
            flexShrink: 0,
            marginLeft: -2,
          }}
        >
          ›
        </span>
      )}
    </motion.div>
  )
}
