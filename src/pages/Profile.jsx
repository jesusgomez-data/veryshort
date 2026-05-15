import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useFeedStore } from '@/stores/feedStore'
import LogoVS from '@/components/ui/LogoVS'
import { supabase } from '@/lib/supabase'
import { uploadAvatar, getStoryViewers } from '@/lib/storage'
import { fmtCount, timeAgo } from '@/lib/utils'
import ThemeToggle from '@/components/ui/ThemeToggle'
import Sheet from '@/components/ui/Sheet'
import Spinner from '@/components/ui/Spinner'
import StoryViewer from '@/components/story/StoryViewer'

// ─── constants ────────────────────────────────────────────────────────────────
const EMOJI_OPTIONS = [
  '🎬', '🏃', '🎨', '🌅', '💡', '🚴', '🎵', '🌸',
  '💪', '🍜', '📸', '🌿', '🔥', '⚡', '🎯', '🌊',
  '🎮', '🍕', '🎭', '🚀',
]

const SG = "'Space Grotesk', sans-serif"
const UB = "'Unbounded', sans-serif"

// ─── tiny helpers ─────────────────────────────────────────────────────────────
function Label({ children, style = {} }) {
  return (
    <p style={{
      fontFamily: SG, fontSize: 9, fontWeight: 500,
      letterSpacing: '2.5px', textTransform: 'uppercase',
      color: 'rgba(255,255,255,.25)', ...style,
    }}>
      {children}
    </p>
  )
}

function SettingsRow({ icon, label, labelColor = '#fff', onClick, right, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: 'transparent', border: 'none',
        borderBottom: '1px solid rgba(255,255,255,.04)',
        cursor: 'pointer', padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontFamily: SG, fontSize: 14, fontWeight: 400, color: danger ? 'var(--r)' : labelColor, flex: 1 }}>
        {label}
      </span>
      {right !== undefined ? right : (
        <span style={{ color: 'rgba(255,255,255,.2)', fontSize: 16 }}>›</span>
      )}
    </button>
  )
}

function AvatarOrb({ size = 90, avatarUrl, emoji = '🎬', ringClass = 'fresh', uploading = false }) {
  return (
    <div className={`orb-ring ${ringClass}`} style={{ width: size, height: size, flexShrink: 0 }}>
      <div className="orb-face" style={{ position: 'relative' }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
        ) : (
          <span style={{ fontSize: size * 0.4 }}>{emoji}</span>
        )}
        {uploading && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Spinner size={size * 0.38} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const updateProfile = useAuthStore((s) => s.updateProfile)

  const myStories = useFeedStore((s) => s.myStories)
  const fetchMyStories = useFeedStore((s) => s.fetchMyStories)
  const openStory = useFeedStore((s) => s.openStory)
  const viewed = useFeedStore((s) => s.viewed)

  // ── avatar upload ──
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  // ── share ──
  const [copied, setCopied] = useState(false)

  // ── counts ──
  const [counts, setCounts] = useState({ followers: 0, following: 0 })

  // ── sheets ──
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [followSheet, setFollowSheet] = useState(null) // 'followers' | 'following' | null
  const [viewersSheet, setViewersSheet] = useState(null) // story object or null

  // ── story management ──
  const [storyActionSheet, setStoryActionSheet] = useState(null) // story object or null
  const [viewingStoryIndex, setViewingStoryIndex] = useState(null) // index into displayedStories or null
  const [storiesTab, setStoriesTab] = useState('active') // 'active' | 'archived'
  const [archivedStories, setArchivedStories] = useState([])
  const [loadingArchived, setLoadingArchived] = useState(false)
  const [storyActionLoading, setStoryActionLoading] = useState(false)
  const [deleteConfirmStory, setDeleteConfirmStory] = useState(false)

  // ── edit fields ──
  const [editName, setEditName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editEmoji, setEditEmoji] = useState('🎬')
  const [editPrivate, setEditPrivate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'ok' | 'error' | null

  // ── change password (settings) ──
  const [pwExpanded, setPwExpanded] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwStatus, setPwStatus] = useState(null) // 'ok' | 'error' | null

  // ── follow list ──
  const [followList, setFollowList] = useState([])
  const [loadingFollow, setLoadingFollow] = useState(false)

  // ── story viewers ──
  const [viewers, setViewers] = useState([])
  const [loadingViewers, setLoadingViewers] = useState(false)

  // ── delete confirm ──
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // ─────────────────────────────────────────────────────────────────────────────
  const avatar = profile?.avatar_url || null
  const emoji = profile?.avatar_emoji ?? '🎬'
  const displayName = profile?.display_name ?? profile?.username ?? 'usuario'
  const username = profile?.username ?? 'usuario'
  const bio = profile?.bio ?? ''

  // The list shown in the grid depends on which tab is active
  const displayedStories = storiesTab === 'active' ? myStories : archivedStories

  // ── initial load ──
  useEffect(() => {
    if (!user?.id) return
    fetchMyStories(user.id)
    fetchCounts()
  }, [user?.id]) // eslint-disable-line

  const fetchCounts = useCallback(async () => {
    if (!user?.id) return
    try {
      const [{ count: fc }, { count: gc }] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true })
          .eq('following_id', user.id).eq('status', 'active'),
        supabase.from('follows').select('id', { count: 'exact', head: true })
          .eq('follower_id', user.id).eq('status', 'active'),
      ])
      setCounts({ followers: fc || 0, following: gc || 0 })
    } catch {
      setCounts({ followers: 0, following: 0 })
    }
  }, [user?.id]) // eslint-disable-line

  // ── fetch archived stories ──
  const fetchArchivedStories = useCallback(async () => {
    if (!user?.id) return
    setLoadingArchived(true)
    try {
      const { data } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', false)
        .order('created_at', { ascending: false })
      setArchivedStories(data || [])
    } catch {
      setArchivedStories([])
    }
    setLoadingArchived(false)
  }, [user?.id]) // eslint-disable-line

  // Load archived stories when switching to that tab
  useEffect(() => {
    if (storiesTab === 'archived') {
      fetchArchivedStories()
    }
  }, [storiesTab]) // eslint-disable-line

  // ── avatar upload ──
  async function handleAvatarFile(e) {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    setUploading(true)
    try {
      const url = await uploadAvatar(user.id, file)
      await updateProfile({ avatar_url: url })
    } catch (err) {
      console.error('Avatar upload failed', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── share profile ──
  function handleShare() {
    const url = `${window.location.origin}/u/${profile?.username}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ── open edit sheet ──
  function openEdit() {
    setEditName(profile?.display_name ?? '')
    setEditUsername(profile?.username ?? '')
    setEditBio(profile?.bio ?? '')
    setEditWebsite(profile?.website ?? '')
    setEditLocation(profile?.location ?? '')
    setEditEmoji(profile?.avatar_emoji ?? '🎬')
    setEditPrivate(profile?.is_private ?? false)
    setSaveStatus(null)
    setEditOpen(true)
  }

  function openEditFromSettings() {
    setSettingsOpen(false)
    setTimeout(openEdit, 140)
  }

  // ── save edit ──
  async function saveEdit() {
    setSaving(true)
    setSaveStatus(null)
    try {
      const result = await updateProfile({
        display_name: editName.trim(),
        username:     editUsername.trim(),
        bio:          editBio.trim(),
        website:      editWebsite.trim(),
        location:     editLocation.trim(),
        avatar_emoji: editEmoji,
        is_private:   editPrivate,
      })
      if (result?.error) {
        setSaveStatus('error')
      } else {
        setSaveStatus('ok')
        setTimeout(() => { setSaveStatus(null); setEditOpen(false) }, 900)
      }
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  // ── change password ──
  async function handleChangePassword() {
    if (!newPw.trim() || newPw.length < 6) return
    setPwSaving(true)
    setPwStatus(null)
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwSaving(false)
    if (error) {
      setPwStatus('error')
    } else {
      setPwStatus('ok')
      setNewPw('')
      setTimeout(() => setPwStatus(null), 2000)
    }
  }

  // ── sign out ──
  async function handleSignOut() {
    setSettingsOpen(false)
    await useAuthStore.getState().signOut()
    navigate('/login')
  }

  // ── privacy toggle (from settings) ──
  async function togglePrivacy() {
    await updateProfile({ is_private: !profile?.is_private })
  }

  // ── followers / following ──
  const openFollowSheet = useCallback(async (type) => {
    setFollowSheet(type)
    setLoadingFollow(true)
    setFollowList([])
    try {
      if (type === 'followers') {
        const { data } = await supabase
          .from('follows')
          .select('follower:follower_id(id,username,display_name,avatar_emoji,avatar_url)')
          .eq('following_id', user.id)
          .eq('status', 'active')
        setFollowList((data || []).map((r) => r.follower).filter(Boolean))
      } else {
        const { data } = await supabase
          .from('follows')
          .select('following:following_id(id,username,display_name,avatar_emoji,avatar_url)')
          .eq('follower_id', user.id)
          .eq('status', 'active')
        setFollowList((data || []).map((r) => r.following).filter(Boolean))
      }
    } catch {
      setFollowList([])
    }
    setLoadingFollow(false)
  }, [user?.id]) // eslint-disable-line

  async function handleUnfollow(targetId) {
    await supabase.from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetId)
    setFollowList((prev) => prev.filter((u) => u.id !== targetId))
    setCounts((c) => ({ ...c, following: Math.max(0, c.following - 1) }))
  }

  // ── story viewers ──
  async function openViewersSheet(story) {
    openStory(story)
    setViewersSheet(story)
    setLoadingViewers(true)
    setViewers([])
    try {
      const data = await getStoryViewers(story.id)
      setViewers(data || [])
    } catch {
      setViewers([])
    }
    setLoadingViewers(false)
  }

  // ── story action sheet ──
  function handleStoryTap(story) {
    setDeleteConfirmStory(false)
    setStoryActionSheet(story)
  }

  function closeStoryActionSheet() {
    setStoryActionSheet(null)
    setDeleteConfirmStory(false)
  }

  function handleViewStory(story) {
    const idx = displayedStories.findIndex((s) => s.id === story.id)
    setStoryActionSheet(null)
    setViewingStoryIndex(idx >= 0 ? idx : 0)
  }

  function handleViewersFromAction(story) {
    setStoryActionSheet(null)
    setTimeout(() => openViewersSheet(story), 180)
  }

  // ── delete story ──
  async function deleteStory(storyId) {
    if (!user?.id) return
    setStoryActionLoading(true)
    const { error } = await supabase.from('stories')
      .delete()
      .eq('id', storyId)
      .eq('user_id', user.id)
    setStoryActionLoading(false)
    if (!error) {
      closeStoryActionSheet()
      useFeedStore.getState().fetchMyStories(user.id)
      if (storiesTab === 'archived') fetchArchivedStories()
    }
  }

  // ── archive story ──
  async function archiveStory(storyId) {
    if (!user?.id) return
    setStoryActionLoading(true)
    const { error } = await supabase.from('stories')
      .update({ is_active: false })
      .eq('id', storyId)
      .eq('user_id', user.id)
    setStoryActionLoading(false)
    if (!error) {
      closeStoryActionSheet()
      useFeedStore.getState().fetchMyStories(user.id)
    }
  }

  // ── unarchive story (restore to active) ──
  async function unarchiveStory(storyId) {
    if (!user?.id) return
    setStoryActionLoading(true)
    const { error } = await supabase.from('stories')
      .update({ is_active: true })
      .eq('id', storyId)
      .eq('user_id', user.id)
    setStoryActionLoading(false)
    if (!error) {
      closeStoryActionSheet()
      useFeedStore.getState().fetchMyStories(user.id)
      fetchArchivedStories()
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--k)' }}>

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarFile}
      />

      {/* ── StoryViewer overlay ──────────────────────────────────────────── */}
      {viewingStoryIndex !== null && displayedStories.length > 0 && (
        <StoryViewer
          stories={displayedStories}
          storyIndex={viewingStoryIndex}
          onClose={() => setViewingStoryIndex(null)}
        />
      )}

      {/* ── TopBar ────────────────────────────────────────────────────── */}
      <div className="topbar">
        <LogoVS size="topbar" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Configuración"
            style={{
              background: 'var(--k3)', border: '1px solid var(--border)',
              borderRadius: 10, width: 38, height: 38,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: 17,
            }}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div className="vs-scroll" style={{ flex: 1, paddingBottom: 'calc(var(--tabh) + 8px)' }}>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 20px' }}
        >
          {/* Orb with camera button */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <AvatarOrb
              size={90}
              avatarUrl={avatar}
              emoji={emoji}
              ringClass="static"
              uploading={uploading}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Cambiar foto"
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 30, height: 30,
                background: 'var(--r)', border: '2.5px solid var(--k)',
                borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, boxShadow: '0 2px 8px rgba(232,0,10,.4)',
              }}
            >
              📷
            </button>
          </div>

          {/* Name */}
          <p style={{
            fontFamily: UB, fontSize: 22, fontWeight: 900,
            color: 'var(--text-primary)', letterSpacing: '-0.5px',
            marginBottom: 4, textAlign: 'center',
          }}>
            {displayName}
          </p>

          {/* Username */}
          <p style={{
            fontFamily: SG, fontSize: 11, color: 'var(--text-secondary)',
            letterSpacing: '1.5px', marginBottom: bio ? 10 : 0,
          }}>
            @{username}
          </p>

          {/* Bio */}
          {bio && (
            <p style={{
              fontFamily: SG, fontSize: 13, fontWeight: 300,
              color: 'var(--text-secondary)', lineHeight: 1.55,
              textAlign: 'center', maxWidth: 260, marginBottom: 0,
            }}>
              {bio}
            </p>
          )}

          {/* Edit + Share buttons row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, width: '100%', maxWidth: 280 }}>
            <button
              onClick={openEdit}
              className="btn-ghost"
              style={{ flex: 1, padding: '9px 12px', fontSize: 9, letterSpacing: '1.8px' }}
            >
              ✏️ EDITAR
            </button>
            <button
              onClick={handleShare}
              className="btn-ghost"
              style={{ flex: 1, padding: '9px 12px', fontSize: 9, letterSpacing: '1.8px' }}
            >
              {copied ? '¡COPIADO!' : '🔗 COMPARTIR'}
            </button>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', marginTop: 18, width: '100%', maxWidth: 280,
            background: 'var(--k2)', border: '1px solid rgba(255,255,255,.06)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            {[
              { label: 'VIDEOS', value: myStories.length, onClick: null },
              { label: 'SEGUIDORES', value: counts.followers, onClick: () => openFollowSheet('followers') },
              { label: 'SIGUIENDO', value: counts.following, onClick: () => openFollowSheet('following') },
            ].map((stat, i) => (
              <button
                key={stat.label}
                onClick={stat.onClick ?? undefined}
                className="pstat"
                style={{
                  borderRight: i < 2 ? '1px solid rgba(255,255,255,.06)' : 'none',
                  borderTop: 'none',
                  cursor: stat.onClick ? 'pointer' : 'default',
                }}
              >
                <span className="pstat-n">{fmtCount(stat.value)}</span>
                <span className="pstat-l">{stat.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Section header */}
        <div className="section-rule">
          <div className="section-rule-bar" />
          <span className="section-rule-txt">MIS HISTORIAS</span>
          <div className="section-rule-line" />
        </div>

        {/* Stories tab toggle — ACTIVAS | ARCHIVADAS */}
        <div style={{
          display: 'flex', margin: '0 14px 12px',
          background: 'var(--k2)', borderRadius: 10,
          border: '1px solid rgba(255,255,255,.06)', overflow: 'hidden',
        }}>
          {[
            { key: 'active', label: 'ACTIVAS' },
            { key: 'archived', label: 'ARCHIVADAS' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStoriesTab(tab.key)}
              style={{
                flex: 1, padding: '10px 0',
                background: storiesTab === tab.key ? 'var(--r)' : 'transparent',
                border: 'none', cursor: 'pointer',
                fontFamily: SG, fontSize: 9, fontWeight: 700,
                letterSpacing: '2px', textTransform: 'uppercase',
                color: storiesTab === tab.key ? '#fff' : 'rgba(255,255,255,.35)',
                transition: 'all .18s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stories grid */}
        {storiesTab === 'archived' && loadingArchived ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spinner size={28} />
          </div>
        ) : displayedStories.length === 0 ? (
          <div className="empty-state" style={{ paddingTop: 28 }}>
            <span style={{ fontSize: 38 }}>{storiesTab === 'archived' ? '📦' : '🎬'}</span>
            <p>
              {storiesTab === 'archived'
                ? 'No tienes historias archivadas'
                : 'Aún no has publicado historias'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10, padding: '6px 14px 12px',
          }}>
            {displayedStories.map((story, i) => {
              const storyAvatar = story.avatar_url || profile?.avatar_url || null
              const storyEmoji = story.emoji ?? '🎬'
              const isArchived = storiesTab === 'archived'
              const ringClass = isArchived ? 'seen' : (viewed.has(story.id) ? 'seen' : 'fresh')
              const dur = ((story.duration_ms ?? 7500) / 1000).toFixed(1)

              return (
                <motion.button
                  key={story.id}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.26, delay: i * 0.04 }}
                  onClick={() => handleStoryTap(story)}
                  style={{
                    background: 'transparent', border: 'none',
                    cursor: 'pointer', display: 'flex',
                    flexDirection: 'column', alignItems: 'center', gap: 5, padding: 0,
                    opacity: isArchived ? 0.6 : 1,
                  }}
                  aria-label={`Historia: ${story.caption ?? ''}`}
                >
                  <div style={{ position: 'relative' }}>
                    <div
                      className={`orb-ring ${ringClass}`}
                      style={{
                        width: 78, height: 78,
                        ...(isArchived ? { filter: 'grayscale(0.4)' } : {}),
                      }}
                    >
                      <div className="orb-face">
                        {storyAvatar ? (
                          <img src={storyAvatar} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        ) : (
                          <span style={{ fontSize: 30 }}>{storyEmoji}</span>
                        )}
                      </div>
                    </div>

                    {/* Archived badge */}
                    {isArchived && (
                      <span style={{
                        position: 'absolute', top: 3, left: 3,
                        background: 'rgba(0,0,0,.8)', color: 'rgba(255,255,255,.7)',
                        fontSize: 7, fontFamily: SG, fontWeight: 700,
                        borderRadius: 4, padding: '1px 4px',
                      }}>
                        📦
                      </span>
                    )}

                    {/* Duration badge */}
                    <span style={{
                      position: 'absolute', bottom: 3, left: 3,
                      background: 'rgba(0,0,0,.75)', color: '#fff',
                      fontSize: 7, fontFamily: SG, fontWeight: 700,
                      borderRadius: 4, padding: '1px 4px', letterSpacing: '0.3px',
                    }}>
                      {dur}S
                    </span>

                    {/* View count badge */}
                    <span style={{
                      position: 'absolute', bottom: 3, right: 3,
                      background: 'rgba(0,0,0,.75)', color: 'rgba(255,255,255,.75)',
                      fontSize: 7, fontFamily: SG, fontWeight: 600,
                      borderRadius: 4, padding: '1px 4px',
                    }}>
                      👁 {fmtCount(story.view_count ?? 0)}
                    </span>
                  </div>

                  {/* Caption */}
                  {story.caption && (
                    <p style={{
                      fontFamily: SG, fontSize: 8, fontWeight: 400,
                      color: 'rgba(255,255,255,.35)', letterSpacing: '0.3px',
                      textAlign: 'center', maxWidth: 78,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {story.caption}
                    </p>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SHEET: Story Action Menu
      ═══════════════════════════════════════════════════════════════════ */}
      <Sheet
        open={!!storyActionSheet}
        onClose={closeStoryActionSheet}
        title=""
        maxHeight="58%"
      >
        {storyActionSheet && (
          <div style={{ paddingBottom: 24 }}>

            {/* Story preview header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '8px 20px 16px',
              borderBottom: '1px solid rgba(255,255,255,.06)',
            }}>
              <div className="orb-ring seen" style={{ width: 48, height: 48, flexShrink: 0 }}>
                <div className="orb-face">
                  <span style={{ fontSize: 22 }}>{storyActionSheet.emoji ?? '🎬'}</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {storyActionSheet.caption ? (
                  <p style={{
                    fontFamily: SG, fontSize: 13, fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {storyActionSheet.caption}
                  </p>
                ) : null}
                <p style={{
                  fontFamily: SG, fontSize: 10, fontWeight: 400,
                  color: 'rgba(255,255,255,.3)', letterSpacing: '1px',
                  marginTop: storyActionSheet.caption ? 2 : 0,
                }}>
                  {timeAgo(storyActionSheet.created_at)}
                </p>
              </div>
            </div>

            {/* Inline delete confirmation */}
            <AnimatePresence>
              {deleteConfirmStory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    margin: '12px 20px 0',
                    padding: '14px',
                    background: 'rgba(232,0,10,.08)',
                    border: '1px solid rgba(232,0,10,.2)',
                    borderRadius: 12,
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    <p style={{
                      fontFamily: SG, fontSize: 12, fontWeight: 500,
                      color: 'rgba(255,255,255,.75)', lineHeight: 1.5,
                    }}>
                      Esta historia se eliminará de forma permanente. ¿Continuar?
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setDeleteConfirmStory(false)}
                        style={{
                          flex: 1, background: 'transparent',
                          border: '1px solid rgba(255,255,255,.15)',
                          borderRadius: 8, padding: '9px', cursor: 'pointer',
                          fontFamily: SG, fontSize: 10, fontWeight: 600,
                          letterSpacing: '1.5px', color: 'rgba(255,255,255,.4)',
                        }}
                      >
                        CANCELAR
                      </button>
                      <button
                        onClick={() => deleteStory(storyActionSheet.id)}
                        disabled={storyActionLoading}
                        style={{
                          flex: 1, background: 'var(--r)',
                          border: 'none', borderRadius: 8, padding: '9px',
                          cursor: 'pointer', fontFamily: SG, fontSize: 10,
                          fontWeight: 700, letterSpacing: '1.5px', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        {storyActionLoading ? <Spinner size={14} color="#fff" /> : 'ELIMINAR'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons (hidden while delete confirm is showing) */}
            {!deleteConfirmStory && (
              <>
                {/* Ver historia */}
                <button
                  onClick={() => handleViewStory(storyActionSheet)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,.04)',
                    cursor: 'pointer', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 18, width: 26, textAlign: 'center', flexShrink: 0 }}>▶</span>
                  <span style={{ fontFamily: SG, fontSize: 14, fontWeight: 500, color: '#fff' }}>
                    VER HISTORIA
                  </span>
                </button>

                {/* Vistas */}
                <button
                  onClick={() => handleViewersFromAction(storyActionSheet)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,.04)',
                    cursor: 'pointer', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 18, width: 26, textAlign: 'center', flexShrink: 0 }}>👁</span>
                  <span style={{ fontFamily: SG, fontSize: 14, fontWeight: 500, color: '#fff' }}>
                    VISTAS ({fmtCount(storyActionSheet.view_count ?? 0)})
                  </span>
                </button>

                {/* Archive or Restore depending on active tab */}
                {storiesTab === 'active' ? (
                  <button
                    onClick={() => archiveStory(storyActionSheet.id)}
                    disabled={storyActionLoading}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,.04)',
                      cursor: 'pointer', padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                      opacity: storyActionLoading ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: 18, width: 26, textAlign: 'center', flexShrink: 0 }}>
                      {storyActionLoading ? <Spinner size={16} /> : '📦'}
                    </span>
                    <span style={{ fontFamily: SG, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.75)' }}>
                      ARCHIVAR
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => unarchiveStory(storyActionSheet.id)}
                    disabled={storyActionLoading}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,.04)',
                      cursor: 'pointer', padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                      opacity: storyActionLoading ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontSize: 18, width: 26, textAlign: 'center', flexShrink: 0 }}>
                      {storyActionLoading ? <Spinner size={16} /> : '✅'}
                    </span>
                    <span style={{ fontFamily: SG, fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,.75)' }}>
                      RESTAURAR
                    </span>
                  </button>
                )}

                {/* Eliminar */}
                <button
                  onClick={() => setDeleteConfirmStory(true)}
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    cursor: 'pointer', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 18, width: 26, textAlign: 'center', flexShrink: 0 }}>🗑</span>
                  <span style={{ fontFamily: SG, fontSize: 14, fontWeight: 500, color: 'var(--r)' }}>
                    ELIMINAR
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════════════
          SHEET: Story Viewers
      ═══════════════════════════════════════════════════════════════════ */}
      <Sheet
        open={!!viewersSheet}
        onClose={() => setViewersSheet(null)}
        title="Quién lo vio"
        maxHeight="72%"
      >
        {viewersSheet && (
          <>
            {/* Story preview header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,.06)',
            }}>
              <div className="orb-ring seen" style={{ width: 48, height: 48, flexShrink: 0 }}>
                <div className="orb-face">
                  <span style={{ fontSize: 20 }}>{viewersSheet.emoji ?? '🎬'}</span>
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontFamily: SG, fontSize: 12, fontWeight: 400,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {viewersSheet.caption ?? 'Sin título'}
                </p>
                <p style={{
                  fontFamily: UB, fontSize: 26, fontWeight: 900,
                  color: 'var(--r)', lineHeight: 1.1, marginTop: 2,
                }}>
                  {fmtCount(viewersSheet.view_count ?? viewers.length)}
                  <span style={{
                    fontFamily: SG, fontSize: 9, fontWeight: 500,
                    color: 'rgba(255,255,255,.25)', letterSpacing: '2px',
                    marginLeft: 8, verticalAlign: 'middle',
                  }}>
                    VISTAS
                  </span>
                </p>
              </div>
            </div>

            {/* Viewer list */}
            {loadingViewers && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}>
                <Spinner size={28} />
              </div>
            )}

            {!loadingViewers && viewers.length === 0 && (
              <div className="empty-state">
                <span style={{ fontSize: 32 }}>👆</span>
                <p>Sé el primero en compartirla</p>
              </div>
            )}

            {!loadingViewers && viewers.map((v, i) => {
              const vp = v.viewer || {}
              const vAvatar = vp.avatar_url || null
              const vEmoji = vp.avatar_emoji ?? '🙂'
              const ago = v.viewed_at ? `HACE ${timeAgo(v.viewed_at)}` : ''

              return (
                <div key={v.id ?? i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 20px',
                  borderBottom: '1px solid rgba(255,255,255,.04)',
                }}>
                  <div className="orb-ring seen" style={{ width: 36, height: 36, flexShrink: 0 }}>
                    <div className="orb-face">
                      {vAvatar ? (
                        <img src={vAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      ) : (
                        <span style={{ fontSize: 15 }}>{vEmoji}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: SG, fontSize: 13, fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {vp.username ? `@${vp.username}` : 'usuario'}
                    </p>
                  </div>
                  {ago && (
                    <span style={{
                      fontFamily: SG, fontSize: 9, fontWeight: 500,
                      letterSpacing: '1.5px', color: 'rgba(255,255,255,.22)',
                    }}>
                      {ago}
                    </span>
                  )}
                </div>
              )
            })}
          </>
        )}
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════════════
          SHEET: Followers / Following
      ═══════════════════════════════════════════════════════════════════ */}
      <Sheet
        open={!!followSheet}
        onClose={() => setFollowSheet(null)}
        title={followSheet === 'followers' ? 'Seguidores' : 'Siguiendo'}
        maxHeight="72%"
      >
        {/* Tab switcher */}
        <div style={{
          display: 'flex', borderBottom: '1px solid rgba(255,255,255,.06)',
        }}>
          {['followers', 'following'].map((t) => (
            <button
              key={t}
              onClick={() => openFollowSheet(t)}
              style={{
                flex: 1, padding: '12px 0',
                background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: SG, fontSize: 10, fontWeight: 600,
                letterSpacing: '2px', textTransform: 'uppercase',
                color: followSheet === t ? '#fff' : 'rgba(255,255,255,.3)',
                borderBottom: followSheet === t ? '2px solid var(--r)' : '2px solid transparent',
                transition: 'all .18s',
              }}
            >
              {t === 'followers' ? 'SEGUIDORES' : 'SIGUIENDO'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="vs-scroll" style={{ flex: 1, maxHeight: 360 }}>
          {loadingFollow && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 28 }}>
              <Spinner size={26} />
            </div>
          )}

          {!loadingFollow && followList.length === 0 && (
            <div className="empty-state">
              <p>Nadie aquí todavía</p>
            </div>
          )}

          {!loadingFollow && followList.map((u) => {
            const uAvatar = u.avatar_url || null
            const uEmoji = u.avatar_emoji ?? '🎬'

            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 20px',
                borderBottom: '1px solid rgba(255,255,255,.04)',
              }}>
                <div className="orb-ring seen" style={{ width: 40, height: 40, flexShrink: 0 }}>
                  <div className="orb-face">
                    {uAvatar ? (
                      <img src={uAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      <span style={{ fontSize: 16 }}>{uEmoji}</span>
                    )}
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: SG, fontSize: 13, fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {u.display_name || u.username}
                  </p>
                  <p style={{
                    fontFamily: SG, fontSize: 11,
                    color: 'rgba(255,255,255,.3)', marginTop: 1,
                  }}>
                    @{u.username}
                  </p>
                </div>

                {followSheet === 'following' && u.id !== user?.id ? (
                  <button
                    onClick={() => handleUnfollow(u.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,.15)',
                      borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                      fontFamily: SG, fontSize: 9, fontWeight: 600,
                      letterSpacing: '1.5px', color: 'rgba(255,255,255,.5)',
                    }}
                  >
                    DEJAR
                  </button>
                ) : (
                  <button
                    onClick={() => { setFollowSheet(null); navigate(`/u/${u.username}`) }}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,.1)',
                      borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
                      fontFamily: SG, fontSize: 9, fontWeight: 600,
                      letterSpacing: '1.5px', color: 'rgba(255,255,255,.4)',
                    }}
                  >
                    VER
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════════════
          SHEET: Edit Profile
      ═══════════════════════════════════════════════════════════════════ */}
      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Editar perfil" maxHeight="88%">
        <div style={{ padding: '14px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Avatar preview + upload */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <AvatarOrb size={72} avatarUrl={avatar} emoji={editEmoji} ringClass="fresh" uploading={uploading} />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 26, height: 26,
                  background: 'var(--r)', border: '2px solid var(--k)',
                  borderRadius: 7, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                📷
              </button>
            </div>
            <Label>FOTO DE PERFIL</Label>
          </div>

          {/* Display name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>NOMBRE</Label>
            <input
              className="vs-input"
              placeholder="Tu nombre visible"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>

          {/* Username */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>USUARIO</Label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                fontFamily: SG, fontSize: 14, color: 'rgba(255,255,255,.3)',
              }}>@</span>
              <input
                className="vs-input"
                placeholder="usuario"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                style={{ paddingLeft: 28 }}
              />
            </div>
          </div>

          {/* Bio */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>BIO</Label>
              <Label style={{ color: editBio.length > 140 ? 'var(--r)' : 'rgba(255,255,255,.18)' }}>
                {editBio.length}/150
              </Label>
            </div>
            <textarea
              className="vs-input"
              placeholder="Cuéntanos algo..."
              value={editBio}
              onChange={(e) => setEditBio(e.target.value.slice(0, 150))}
              rows={3}
              style={{ resize: 'none', lineHeight: 1.55 }}
            />
          </div>

          {/* Website */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>WEBSITE</Label>
            <input
              className="vs-input"
              placeholder="https://tu-sitio.com"
              value={editWebsite}
              onChange={(e) => setEditWebsite(e.target.value)}
              type="url"
            />
          </div>

          {/* Location */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Label>UBICACION</Label>
            <input
              className="vs-input"
              placeholder="Ciudad, País"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
            />
          </div>

          {/* Private toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            background: 'var(--k3)', borderRadius: 10,
            border: '1px solid rgba(255,255,255,.07)',
          }}>
            <div>
              <p style={{ fontFamily: SG, fontSize: 14, fontWeight: 400, color: 'var(--text-primary)' }}>
                Cuenta privada
              </p>
              <p style={{ fontFamily: SG, fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>
                Solo seguidores aprobados
              </p>
            </div>
            <Toggle value={editPrivate} onChange={setEditPrivate} />
          </div>

          {/* Emoji picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Label>EMOJI AVATAR (cuando no hay foto)</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {EMOJI_OPTIONS.map((em) => (
                <button
                  key={em}
                  onClick={() => setEditEmoji(em)}
                  style={{
                    width: 42, height: 42, borderRadius: 11,
                    border: editEmoji === em ? '2px solid var(--r)' : '2px solid rgba(255,255,255,.08)',
                    background: editEmoji === em ? 'rgba(232,0,10,.14)' : 'var(--k3)',
                    cursor: 'pointer', fontSize: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .14s',
                  }}
                  aria-label={em}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Save status feedback */}
          <AnimatePresence>
            {saveStatus && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: saveStatus === 'ok' ? 'rgba(0,204,102,.12)' : 'rgba(232,0,10,.12)',
                  border: `1px solid ${saveStatus === 'ok' ? 'rgba(0,204,102,.3)' : 'rgba(232,0,10,.3)'}`,
                  fontFamily: SG, fontSize: 12, fontWeight: 500,
                  color: saveStatus === 'ok' ? '#00cc66' : 'var(--r)',
                  textAlign: 'center', letterSpacing: '1px',
                }}
              >
                {saveStatus === 'ok' ? '¡Perfil actualizado!' : 'Error al guardar. Inténtalo de nuevo.'}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            className="btn-primary"
            onClick={saveEdit}
            disabled={saving}
          >
            {saving ? <Spinner size={18} color="#fff" /> : 'GUARDAR CAMBIOS'}
          </button>
        </div>
      </Sheet>

      {/* ═══════════════════════════════════════════════════════════════════
          SHEET: Settings
      ═══════════════════════════════════════════════════════════════════ */}
      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Ajustes" maxHeight="82%">
        <div style={{ paddingBottom: 24 }}>

          {/* Profile summary */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 13,
            padding: '14px 20px 16px',
            borderBottom: '1px solid rgba(255,255,255,.06)',
          }}>
            <AvatarOrb size={48} avatarUrl={avatar} emoji={emoji} ringClass="seen" />
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontFamily: UB, fontSize: 13, fontWeight: 700,
                color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayName}
              </p>
              <p style={{
                fontFamily: SG, fontSize: 11,
                color: 'rgba(255,255,255,.35)', marginTop: 2, letterSpacing: '0.8px',
              }}>
                @{username}
              </p>
            </div>
          </div>

          {/* CUENTA */}
          <Label style={{ padding: '14px 20px 6px', display: 'block' }}>CUENTA</Label>

          <SettingsRow icon="✏️" label="Editar perfil" onClick={openEditFromSettings} />

          {/* Cambiar contraseña — expandable */}
          <button
            onClick={() => { setPwExpanded((v) => !v); setPwStatus(null) }}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              borderBottom: '1px solid rgba(255,255,255,.04)',
              cursor: 'pointer', padding: '14px 20px',
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>🔒</span>
            <span style={{ fontFamily: SG, fontSize: 14, fontWeight: 400, color: '#fff', flex: 1 }}>
              Cambiar contraseña
            </span>
            <span style={{
              color: 'rgba(255,255,255,.2)', fontSize: 14,
              transform: pwExpanded ? 'rotate(90deg)' : 'none',
              transition: 'transform .18s',
            }}>›</span>
          </button>

          <AnimatePresence>
            {pwExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '12px 20px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input
                    className="vs-input"
                    type="password"
                    placeholder="Nueva contraseña (min. 6 caracteres)"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                  />
                  {pwStatus && (
                    <p style={{
                      fontFamily: SG, fontSize: 11,
                      color: pwStatus === 'ok' ? '#00cc66' : 'var(--r)',
                      letterSpacing: '1px',
                    }}>
                      {pwStatus === 'ok' ? '¡Contraseña cambiada!' : 'Error. Inténtalo de nuevo.'}
                    </p>
                  )}
                  <button
                    className="btn-primary"
                    onClick={handleChangePassword}
                    disabled={pwSaving || newPw.length < 6}
                    style={{ padding: '11px', fontSize: 11 }}
                  >
                    {pwSaving ? <Spinner size={16} color="#fff" /> : 'ACTUALIZAR'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* APARIENCIA */}
          <Label style={{ padding: '14px 20px 6px', display: 'block' }}>APARIENCIA</Label>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,.04)',
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>🎨</span>
            <span style={{ fontFamily: SG, fontSize: 14, fontWeight: 400, color: '#fff', flex: 1 }}>
              Tema
            </span>
            <ThemeToggle />
          </div>

          {/* PRIVACIDAD */}
          <Label style={{ padding: '14px 20px 6px', display: 'block' }}>PRIVACIDAD</Label>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 20px',
            borderBottom: '1px solid rgba(255,255,255,.04)',
          }}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>🔐</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: SG, fontSize: 14, fontWeight: 400, color: '#fff' }}>
                Cuenta privada
              </p>
              <p style={{ fontFamily: SG, fontSize: 11, color: 'rgba(255,255,255,.3)', marginTop: 2 }}>
                Solo seguidores aprobados
              </p>
            </div>
            <Toggle value={profile?.is_private ?? false} onChange={togglePrivacy} />
          </div>

          {/* SESIÓN */}
          <Label style={{ padding: '14px 20px 6px', display: 'block' }}>SESION</Label>

          <SettingsRow icon="🚪" label="Cerrar sesión" onClick={handleSignOut} danger right={null} />

          {/* Delete account */}
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                cursor: 'pointer', padding: '12px 20px',
                display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>⚠️</span>
              <span style={{
                fontFamily: SG, fontSize: 12, fontWeight: 400,
                color: 'rgba(232,0,10,.5)',
              }}>
                Eliminar cuenta
              </span>
            </button>
          ) : (
            <div style={{
              margin: '4px 20px 8px',
              padding: '14px',
              background: 'rgba(232,0,10,.08)',
              border: '1px solid rgba(232,0,10,.2)',
              borderRadius: 12,
            }}>
              <p style={{
                fontFamily: SG, fontSize: 12, fontWeight: 500,
                color: 'rgba(255,255,255,.7)', marginBottom: 10, lineHeight: 1.5,
              }}>
                Para eliminar tu cuenta, contacta a soporte en{' '}
                <span style={{ color: 'var(--r)' }}>soporte@veryshort.app</span>
              </p>
              <button
                onClick={() => setDeleteConfirm(false)}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,.15)',
                  borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
                  fontFamily: SG, fontSize: 10, fontWeight: 600,
                  letterSpacing: '1.5px', color: 'rgba(255,255,255,.4)',
                }}
              >
                CANCELAR
              </button>
            </div>
          )}
        </div>
      </Sheet>
    </div>
  )
}

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 26, borderRadius: 13,
        background: value ? 'var(--r)' : 'var(--k4)',
        border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background .2s', flexShrink: 0,
        boxShadow: value ? '0 2px 8px rgba(232,0,10,.35)' : 'none',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3, left: value ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff',
        transition: 'left .18s cubic-bezier(0.22,1,0.36,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,.3)',
      }} />
    </button>
  )
}
