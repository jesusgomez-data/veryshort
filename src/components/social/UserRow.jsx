import { useNavigate } from 'react-router-dom'
import { useFollow } from '@/hooks/useFollow'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'

export default function UserRow({ user, myId, onChat, showFollow = true }) {
  const { following, toggle, loading } = useFollow(user?.id, myId)
  const { getOrCreateConversation } = useChatStore()
  const { user: me } = useAuthStore()
  const navigate = useNavigate()

  if (!user) return null

  const orbRingClass = user.hasStory ? 'orb-ring fresh' : 'orb-ring seen'

  const handleChat = async () => {
    if (!me || me.id === 'demo') return
    const conv = await getOrCreateConversation(me.id, user.id)
    if (conv) navigate(`/chat/${conv.id}`)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
      }}
    >
      {/* Avatar orb */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div className={orbRingClass} style={{ width: 42, height: 42 }}>
          <div className="orb-face">
            <span style={{ fontSize: 18 }}>{user.avatar_emoji ?? '🙂'}</span>
          </div>
        </div>

        {user.hasStory && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'var(--r)',
              border: '1.5px solid var(--k)',
              zIndex: 2,
            }}
          />
        )}
      </div>

      {/* Info column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "'Unbounded', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}
        >
          {user.username}
        </p>
        <p
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            color: 'rgba(255,255,255,0.38)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}
        >
          {user.display_name || user.bio || ' '}
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {(onChat || me?.id) && me?.id !== 'demo' && user.id !== me?.id && (
          <button
            onClick={handleChat}
            aria-label="Abrir chat"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'var(--k3)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              cursor: 'pointer',
              transition: 'transform 0.12s',
            }}
          >
            💬
          </button>
        )}

        {showFollow && user.id !== myId && (
          <button
            onClick={toggle}
            disabled={loading}
            className={following ? 'btn-ghost' : 'btn-primary'}
            style={{
              width: 'auto',
              padding: '7px 14px',
              fontSize: 9,
              letterSpacing: '1.5px',
              opacity: loading ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
            aria-label={following ? 'Dejar de seguir' : 'Seguir'}
          >
            {following ? '✓ SIGUES' : 'SEGUIR'}
          </button>
        )}
      </div>
    </div>
  )
}
