import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import LogoVS from '@/components/ui/LogoVS'
import { timeAgo } from '@/lib/utils'

export default function Messages() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { conversations, fetchConversations } = useChatStore()

  useEffect(() => {
    if (user?.id) fetchConversations(user.id)
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <button
          onClick={() => navigate('/')}
          aria-label="Volver al inicio"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            fontSize: 20,
            padding: '4px 8px 4px 0',
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <LogoVS size="topbar" />
        <div style={{ width: 34 }} />
      </div>

      {/* Conversation list */}
      <div
        className="vs-scroll"
        style={{
          flex: 1,
          paddingBottom: 'calc(var(--tabh) + 8px)',
        }}
      >
        {conversations.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: 40 }}>💬</span>
            <p>Sin mensajes aún</p>
            <p style={{ fontSize: 10, opacity: 0.5, marginBottom: 16 }}>Responde una historia para iniciar</p>
            <button
              onClick={() => navigate('/explore')}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,.18)',
                borderRadius: 10,
                padding: '10px 24px',
                cursor: 'pointer',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '2px',
                color: 'rgba(255,255,255,.55)',
                textTransform: 'uppercase',
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,.35)'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,.18)'
                e.currentTarget.style.color = 'rgba(255,255,255,.55)'
              }}
            >
              BUSCAR PERSONAS
            </button>
          </div>
        ) : (
          conversations.map((conv, i) => (
            <ConvRow
              key={conv.id}
              conv={conv}
              myId={user?.id}
              index={i}
              onPress={() => navigate(`/chat/${conv.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ConvRow({ conv, myId, index, onPress }) {
  // Determine the partner profile
  const isA = conv.participant_a === myId || conv.profile_a?.id === myId
  const partner = isA ? conv.profile_b : conv.profile_a
  const partnerEmoji = partner?.avatar_emoji ?? '👤'
  const partnerName = partner?.display_name ?? partner?.username ?? 'Usuario'

  const lastMsg = conv.last_message ?? conv.last_msg ?? ''
  const lastTime = conv.last_msg_at ?? conv.updated_at ?? ''
  const unreadCount = isA ? (conv.unread_a ?? 0) : (conv.unread_b ?? 0)

  // Green dot: show if last message exists and was sent within the last hour
  const isRecent = lastTime
    ? (Date.now() - new Date(lastTime).getTime()) < 60 * 60 * 1000
    : false
  const showGreenDot = lastMsg && isRecent && unreadCount === 0

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, delay: index * 0.05 }}
      onClick={onPress}
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,.04)',
        cursor: 'pointer',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
      }}
      aria-label={`Chat con ${partnerName}`}
    >
      {/* Orb with optional green dot */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          className="orb-ring seen"
          style={{ width: 46, height: 46 }}
        >
          <div className="orb-face">
            <span style={{ fontSize: 20 }}>{partnerEmoji}</span>
          </div>
        </div>
        {showGreenDot && (
          <div
            style={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid var(--k)',
              boxShadow: '0 0 6px rgba(34,197,94,.6)',
            }}
          />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
          <p
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 13,
              fontWeight: unreadCount > 0 ? 700 : 500,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '60%',
            }}
          >
            {partnerName}
          </p>
          {lastTime && (
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 9,
                color: 'rgba(255,255,255,.25)',
                letterSpacing: '0.5px',
                flexShrink: 0,
              }}
            >
              {timeAgo(lastTime)}
            </span>
          )}
        </div>

        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            fontWeight: 300,
            color: unreadCount > 0 ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.28)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {lastMsg || 'Inicia la conversación'}
        </p>
      </div>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <div
          style={{
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            background: 'var(--r)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 5px',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        </div>
      )}
    </motion.button>
  )
}
