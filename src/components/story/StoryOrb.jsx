import { useState } from 'react'

const SIZE_MAP = { sm: 48, md: 60, lg: 68, xl: 76, xxl: 90 }

function getRingClass(isViewed, isLive, viewCount) {
  if (isViewed) return 'orb-ring seen'
  // Dorado solo para populares (live o >500 vistas)
  if (isLive || (viewCount ?? 0) > 500) return 'orb-ring gold'
  return 'orb-ring fresh'
}

export default function StoryOrb({ story, size = 'md', onPress, isViewed }) {
  const [pressed, setPressed] = useState(false)
  const px         = SIZE_MAP[size] ?? SIZE_MAP.md
  const ringClass  = getRingClass(isViewed, story?.is_live, story?.view_count)
  const storyCount = story?.story_count ?? 1
  const emoji      = story?.emoji ?? story?.avatar_emoji ?? '🎬'
  const label      = story?.display ?? story?.username ?? ''
  // Support real photo — avatar_url takes priority over emoji
  const photoUrl   = story?.avatar_url ?? story?.profiles?.avatar_url ?? null

  function handlePress() {
    setPressed(true)
    setTimeout(() => setPressed(false), 140)
    onPress?.()
  }

  return (
    <button
      onClick={handlePress}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
        padding: 0, flexShrink: 0,
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        transition: 'transform 0.14s',
      }}
      aria-label={`Ver historia de ${label}`}
    >
      <div className={ringClass} style={{ width: px, height: px, position: 'relative', flexShrink: 0 }}>
        <div className="orb-face">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              onError={e => { e.target.style.display = 'none' }}
            />
          ) : (
            <span style={{ fontSize: px * 0.38 }}>{emoji}</span>
          )}
        </div>

        {storyCount > 1 && (
          <span style={{
            position: 'absolute', bottom: 0, right: 0,
            background: 'var(--r)', color: '#fff',
            fontSize: 8, fontWeight: 700,
            fontFamily: "'Space Grotesk', sans-serif",
            borderRadius: 10, padding: '1px 5px', lineHeight: 1.4,
            border: '2px solid var(--k)', zIndex: 2,
          }}>
            ×{storyCount}
          </span>
        )}

        {story?.is_live && (
          <div style={{
            position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--r)', color: '#fff',
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 7, fontWeight: 700,
            letterSpacing: 2, textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: 3,
            border: '1.5px solid var(--k)', zIndex: 2,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', animation: 'dot-blink .8s ease-in-out infinite' }} />
            LIVE
          </div>
        )}
      </div>

      {label && (
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5,
          color: 'var(--orb-label, rgba(255,255,255,0.6))',
          maxWidth: px + 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1,
          marginTop: story?.is_live ? 6 : 0,
        }}>
          {label}
        </span>
      )}
    </button>
  )
}
