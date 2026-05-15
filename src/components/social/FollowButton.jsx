import { useFollow } from '@/hooks/useFollow'
import { useAuthStore } from '@/stores/authStore'

export default function FollowButton({ targetId, small = false, showCount = false }) {
  const { user } = useAuthStore()
  const { isFollowing, loading, count, toggle } = useFollow(user?.id, targetId)

  if (!user || user.id === 'demo' || user.id === targetId) return null

  const h  = small ? '26px' : '32px'
  const px = small ? '10px' : '16px'
  const fs = small ? '8px'  : '10px'

  return (
    <button
      onClick={e => { e.stopPropagation(); toggle() }}
      disabled={loading}
      style={{
        height:        h,
        padding:       `0 ${px}`,
        borderRadius:  8,
        background:    isFollowing ? 'transparent' : 'var(--r)',
        color:         isFollowing ? 'rgba(255,255,255,.55)' : '#fff',
        border:        isFollowing ? '1px solid rgba(255,255,255,.15)' : 'none',
        fontFamily:    'Space Grotesk, sans-serif',
        fontSize:      fs,
        fontWeight:    700,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        cursor:        loading ? 'not-allowed' : 'pointer',
        transition:    'all .15s',
        opacity:       loading ? 0.55 : 1,
        display:       'flex',
        alignItems:    'center',
        gap:           4,
        whiteSpace:    'nowrap',
      }}
    >
      {loading ? '...' : isFollowing ? '✓ SIGUES' : '+ SEGUIR'}
      {showCount && count > 0 && (
        <span style={{ opacity: .6, fontSize: '0.85em' }}>({count})</span>
      )}
    </button>
  )
}
