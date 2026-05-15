import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useFeedStore } from '@/stores/feedStore'
import { supabase } from '@/lib/supabase'
import LogoVS from '@/components/ui/LogoVS'
import StoryViewer from '@/components/story/StoryViewer'
import UserRow from '@/components/social/UserRow'
import ThemeToggle from '@/components/ui/ThemeToggle'

const TRENDING = [
  { emoji: '🏄', tag: '#SURF', cnt: '4.2K' },
  { emoji: '🎨', tag: '#ARTE', cnt: '11K' },
  { emoji: '🍃', tag: '#DÍA', cnt: '7.8K' },
  { emoji: '🎵', tag: '#MÚSICA', cnt: '18K' },
  { emoji: '✈️', tag: '#VIAJE', cnt: '3.1K' },
]

const FOR_YOU = [
  { emoji: '💪', tag: 'FIT.CREW', cnt: '892' },
  { emoji: '🌸', tag: 'BLOOM', cnt: '2.1K' },
  { emoji: '🍕', tag: 'PIZZA', cnt: '440' },
]

function makeDemoStory(item, idx) {
  return {
    id: `explore-${idx}`,
    emoji: item.emoji,
    username: item.tag.replace('#', ''),
    display: item.tag,
    caption: `Historias de ${item.tag}`,
    duration_ms: 7500,
    created_at: new Date().toISOString(),
    view_count: 0,
    story_count: 1,
    is_live: false,
  }
}

export default function Explore() {
  const navigate = useNavigate()
  const { openStory, closeStory, activeStory } = useFeedStore()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const debounceRef = useRef(null)

  const search = useCallback(async (q) => {
    if (!q.trim()) {
      setResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    try {
      const [{ data: profiles }, { data: stories }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_emoji, bio')
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
          .limit(8),
        supabase
          .from('stories')
          .select('*, profiles:user_id(username, avatar_emoji)')
          .eq('is_active', true)
          .ilike('caption', `%${q}%`)
          .limit(10),
      ])
      setResults({ profiles: profiles || [], stories: stories || [] })
    } catch {
      setResults({ profiles: [], stories: [] })
    }
    setSearching(false)
  }, [])

  const handleQueryChange = (e) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) {
      setResults(null)
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      search(val)
    }, 300)
  }

  const clearSearch = () => {
    setQuery('')
    setResults(null)
    setSearching(false)
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const hasResults =
    results && (results.profiles.length > 0 || results.stories.length > 0)
  const noResults =
    results && results.profiles.length === 0 && results.stories.length === 0

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
        <ThemeToggle />
      </div>

      {/* Scrollable body */}
      <div
        className="vs-scroll"
        style={{
          flex: 1,
          paddingBottom: 'calc(var(--tabh) + 8px)',
        }}
      >
        {/* Search box */}
        <div style={{ padding: '12px 16px 4px' }}>
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--k3)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 12,
              padding: '11px 14px',
            }}
          >
            <span style={{ fontSize: 16, opacity: 0.4 }}>🔍</span>
            <input
              value={query}
              onChange={handleQueryChange}
              placeholder="Buscar personas, historias..."
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                fontWeight: 300,
                flex: 1,
              }}
            />
            {query && (
              <button
                onClick={clearSearch}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,.35)',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            )}
          </motion.div>
        </div>

        {/* ── SEARCH ACTIVE ── */}
        {query.length > 0 ? (
          <>
            {/* Spinner */}
            {searching && (
              <div
                style={{
                  padding: '32px 0',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                  style={{
                    width: 22,
                    height: 22,
                    border: '2px solid rgba(255,255,255,.12)',
                    borderTop: '2px solid var(--r)',
                    borderRadius: '50%',
                  }}
                />
              </div>
            )}

            {/* No results */}
            {!searching && noResults && (
              <div className="empty-state" style={{ paddingTop: 48 }}>
                <span style={{ fontSize: 36 }}>🔎</span>
                <p>SIN RESULTADOS PARA {query.toUpperCase()}</p>
              </div>
            )}

            {/* Results */}
            {!searching && hasResults && (
              <>
                {/* PERSONAS section */}
                {results.profiles.length > 0 && (
                  <>
                    <div className="section-rule" style={{ marginTop: 8 }}>
                      <div className="section-rule-bar" />
                      <span className="section-rule-txt">PERSONAS</span>
                      <div className="section-rule-line" />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {results.profiles.map((profile) => (
                        <div
                          key={profile.id}
                          onClick={() => navigate(`/u/${profile.username}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <UserRow
                            user={profile}
                            myId={null}
                            showFollow={false}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* HISTORIAS section */}
                {results.stories.length > 0 && (
                  <>
                    <div className="section-rule" style={{ marginTop: 8 }}>
                      <div className="section-rule-bar" />
                      <span className="section-rule-txt">HISTORIAS</span>
                      <div className="section-rule-line" />
                    </div>
                    <div
                      className="vs-hscroll"
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 14,
                        padding: '6px 16px 16px',
                      }}
                    >
                      {results.stories.map((story, i) => {
                        const mapped = {
                          ...story,
                          emoji: story.emoji || story.profiles?.avatar_emoji || '🎬',
                          username: (story.profiles?.username || 'user').toUpperCase(),
                          display: story.profiles?.username || 'user',
                          story_count: 1,
                        }
                        return (
                          <motion.button
                            key={story.id}
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.25, delay: i * 0.05 }}
                            onClick={() => openStory(mapped)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 6,
                              flexShrink: 0,
                            }}
                            aria-label={`Ver historia de ${mapped.username}`}
                          >
                            <div
                              className="orb-ring fresh"
                              style={{ width: 64, height: 64, flexShrink: 0 }}
                            >
                              <div className="orb-face">
                                <span style={{ fontSize: 26 }}>{mapped.emoji}</span>
                              </div>
                            </div>
                            <span
                              style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: 9,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                color: 'rgba(255,255,255,.7)',
                                maxWidth: 72,
                                textAlign: 'center',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {mapped.username}
                            </span>
                            <span
                              style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: 9,
                                color: 'rgba(255,255,255,.4)',
                                letterSpacing: '0.4px',
                                maxWidth: 80,
                                textAlign: 'center',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {story.caption}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          /* ── DEFAULT: TRENDING + PARA TI ── */
          <>
            {/* Section: TRENDING */}
            <div className="section-rule" style={{ marginTop: 8 }}>
              <div className="section-rule-bar" />
              <span className="section-rule-txt">TRENDING</span>
              <div className="section-rule-line" />
            </div>

            <div
              className="vs-hscroll"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                padding: '6px 16px 16px',
              }}
            >
              {TRENDING.map((item, i) => (
                <motion.button
                  key={item.tag}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.06 }}
                  onClick={() => openStory(makeDemoStory(item, i))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    flexShrink: 0,
                  }}
                  aria-label={`Ver historias de ${item.tag}`}
                >
                  <div
                    className="orb-ring fresh"
                    style={{ width: 64, height: 64, flexShrink: 0 }}
                  >
                    <div className="orb-face">
                      <span style={{ fontSize: 26 }}>{item.emoji}</span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: 'rgba(255,255,255,.7)',
                      maxWidth: 72,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.tag}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 9,
                      fontWeight: 500,
                      color: 'var(--r)',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {item.cnt}
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Section: PARA TI */}
            <div className="section-rule">
              <div className="section-rule-bar" />
              <span className="section-rule-txt">PARA TI</span>
              <div className="section-rule-line" />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                padding: '4px 0 0',
              }}
            >
              {FOR_YOU.map((item, i) => (
                <motion.button
                  key={item.tag}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.07 }}
                  onClick={() => openStory(makeDemoStory(item, i + 10))}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,.04)',
                    cursor: 'pointer',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    textAlign: 'left',
                  }}
                  aria-label={`Ver comunidad ${item.tag}`}
                >
                  <div
                    className="orb-ring fresh"
                    style={{ width: 52, height: 52, flexShrink: 0 }}
                  >
                    <div className="orb-face">
                      <span style={{ fontSize: 22 }}>{item.emoji}</span>
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: "'Unbounded', sans-serif",
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#fff',
                        letterSpacing: '-0.3px',
                        marginBottom: 2,
                      }}
                    >
                      {item.tag}
                    </p>
                    <p
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 10,
                        color: 'rgba(255,255,255,.35)',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {item.cnt} miembros
                    </p>
                  </div>

                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 10,
                      color: 'var(--r)',
                      fontWeight: 600,
                      letterSpacing: '1px',
                      flexShrink: 0,
                    }}
                  >
                    VER
                  </span>
                </motion.button>
              ))}
            </div>

            {/* Spacer */}
            <div style={{ height: 24 }} />
          </>
        )}
      </div>

      {/* Story viewer */}
      <StoryViewer story={activeStory} onClose={closeStory} storyIndex={0} />
    </div>
  )
}
