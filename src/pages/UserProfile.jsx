import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import FollowButton from '@/components/social/FollowButton'
import StoryOrb from '@/components/story/StoryOrb'
import StoryViewer from '@/components/story/StoryViewer'
import { fmtCount } from '@/lib/utils'
import Spinner from '@/components/ui/Spinner'

export default function UserProfile() {
  const { username } = useParams()
  const navigate     = useNavigate()
  const { user }     = useAuthStore()

  const [profile, setProfile] = useState(null)
  const [stories, setStories] = useState([])
  const [active,  setActive]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [counts,  setCounts]  = useState({ followers: 0, following: 0 })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (!p || cancelled) { navigate('/'); return }
      setProfile(p)

      // stories + counts in parallel
      const [{ data: s }, { count: fc }, { count: gc }] = await Promise.all([
        supabase.from('stories').select('*').eq('user_id', p.id)
          .eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('follows').select('id', { count: 'exact', head: true })
          .eq('following_id', p.id).eq('status', 'active'),
        supabase.from('follows').select('id', { count: 'exact', head: true })
          .eq('follower_id', p.id).eq('status', 'active'),
      ])

      if (!cancelled) {
        setStories(s || [])
        setCounts({ followers: fc || 0, following: gc || 0 })
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [username, navigate])

  const handleMessage = async () => {
    if (!user || user.id === 'demo' || !profile) return
    const conv = await useChatStore.getState().getOrCreateConversation(user.id, profile.id)
    if (conv) navigate(`/chat/${conv.id}`)
  }

  const isOwnProfile = user?.id && profile?.id && user.id === profile.id
  const canMessage   = user && user.id !== 'demo' && !isOwnProfile

  if (loading) return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--k)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  )

  const SG = "'Space Grotesk', sans-serif"
  const UB = "'Unbounded', sans-serif"

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--k)', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div className="topbar">
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: 22, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}>
          ←
        </button>
        <span style={{ fontFamily: SG, fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-primary)' }}>
          @{profile?.username}
        </span>
        <div style={{ width: 34 }} />
      </div>

      <div className="vs-scroll" style={{ flex: 1, paddingBottom: 24 }}>
        {/* Hero */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 16px 20px', borderBottom: '1px solid var(--border)', position: 'relative' }}>
          {/* Avatar orb */}
          <div className="orb-ring fresh" style={{ width: 90, height: 90, marginBottom: 14 }}>
            <div className="orb-face">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <span style={{ fontSize: 34 }}>{profile?.avatar_emoji || '🧑'}</span>
              }
            </div>
          </div>

          <p style={{ fontFamily: UB, fontSize: 20, fontWeight: 800, letterSpacing: 2, color: 'var(--text-primary)', marginBottom: 4 }}>
            {(profile?.display_name || profile?.username || '').toUpperCase()}
          </p>
          <p style={{ fontFamily: SG, fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: profile?.bio ? 10 : 16 }}>
            @{profile?.username}
          </p>
          {profile?.bio && (
            <p style={{ fontFamily: SG, fontSize: 13, fontWeight: 300, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.55, maxWidth: 260, marginBottom: 16 }}>
              {profile.bio}
            </p>
          )}
          {profile?.website && (
            <a href={profile.website} target="_blank" rel="noreferrer"
              style={{ fontFamily: SG, fontSize: 12, color: 'var(--r)', marginBottom: 14, wordBreak: 'break-all' }}>
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, alignItems: 'center' }}>
            <FollowButton targetId={profile?.id} />
            {canMessage && (
              <button onClick={handleMessage}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', borderRadius: 10,
                  background: 'var(--k3)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontFamily: SG, fontSize: 11, fontWeight: 600, letterSpacing: 1.5,
                  cursor: 'pointer', textTransform: 'uppercase', transition: 'border-color .15s',
                }}>
                <span style={{ fontSize: 14 }}>💬</span> MENSAJE
              </button>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', width: '100%', borderTop: '1px solid var(--border)' }}>
            {[
              ['VIDEOS',     stories.length],
              ['SEGUIDORES', fmtCount(profile?.follower_count  ?? counts.followers)],
              ['SIGUIENDO',  fmtCount(profile?.following_count ?? counts.following)],
            ].map(([l, n], i) => (
              <div key={l} style={{
                flex: 1, padding: '12px 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                borderRight: i < 2 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontFamily: UB, fontSize: 20, fontWeight: 800, color: 'var(--r)' }}>{n}</span>
                <span style={{ fontFamily: SG, fontSize: 7, fontWeight: 500, letterSpacing: 3, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stories */}
        <div className="section-rule">
          <div className="section-rule-bar" />
          <span className="section-rule-txt">HISTORIAS</span>
          <div className="section-rule-line" />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '8px 16px 16px' }}>
          {stories.map(s => (
            <StoryOrb
              key={s.id}
              story={{
                ...s,
                emoji:      s.emoji      || profile?.avatar_emoji || '🎬',
                avatar_url: profile?.avatar_url || null,
                display:    profile?.username || '',
              }}
              size="lg"
              onPress={() => setActive(s)}
              isViewed={false}
            />
          ))}
          {stories.length === 0 && (
            <div className="empty-state" style={{ width: '100%' }}>
              <span style={{ fontSize: 36 }}>🎬</span>
              <p>SIN HISTORIAS AÚN</p>
            </div>
          )}
        </div>
      </div>

      <StoryViewer
        stories={active ? stories.map(s => ({ ...s, emoji: s.emoji || profile?.avatar_emoji || '🎬', avatar_url: profile?.avatar_url })) : []}
        storyIndex={active ? stories.findIndex(s => s.id === active.id) : 0}
        onClose={() => setActive(null)}
      />
    </div>
  )
}
