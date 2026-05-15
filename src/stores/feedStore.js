import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const DEMO = [
  { id:'d1',  emoji:'🏃', username:'CARLA.RUN',   display:'carla.run',   caption:'Cardio 5AM 🔥',      duration_ms:7200, created_at:new Date(Date.now()-120e3).toISOString(),   view_count:412,  is_live:true, story_count:1 },
  { id:'d2',  emoji:'🎸', username:'LUNA.M',       display:'luna.m',      caption:'Riff nuevo ✨',        duration_ms:6800, created_at:new Date(Date.now()-300e3).toISOString(),   view_count:921,  story_count:1 },
  { id:'d3',  emoji:'🍜', username:'TOMÁS',        display:'tomás',       caption:'Ramen casero 😅',      duration_ms:7500, created_at:new Date(Date.now()-540e3).toISOString(),   view_count:203,  story_count:1 },
  { id:'d4',  emoji:'📸', username:'DANI.FOTO',    display:'dani.foto',   caption:'Golden hour 📸',       duration_ms:5500, created_at:new Date(Date.now()-900e3).toISOString(),   view_count:788,  story_count:2 },
  { id:'d5',  emoji:'🌅', username:'KAI.WAVE',     display:'kai.wave',    caption:'El amanecer ☀️',       duration_ms:7500, created_at:new Date(Date.now()-180e3).toISOString(),   view_count:2100, is_live:true, story_count:3 },
  { id:'d6',  emoji:'💡', username:'VERA.ARTS',    display:'vera.arts',   caption:'Mi idea de hoy 💡',    duration_ms:6200, created_at:new Date(Date.now()-420e3).toISOString(),   view_count:882,  story_count:1 },
  { id:'d7',  emoji:'🚴', username:'ALEX',         display:'alex.lift',   caption:'Bici al amanecer',     duration_ms:7100, created_at:new Date(Date.now()-540e3).toISOString(),   view_count:334,  story_count:1 },
  { id:'d8',  emoji:'🎨', username:'SOFIA.P',      display:'sofia.p',     caption:'Acuarela 🎨',          duration_ms:7500, created_at:new Date(Date.now()-720e3).toISOString(),   view_count:1440, story_count:2 },
  { id:'d9',  emoji:'🌿', username:'RIO.ZEN',      display:'rio.zen',     caption:'Meditación 🧘',        duration_ms:6500, created_at:new Date(Date.now()-1260e3).toISOString(),  view_count:556,  story_count:1 },
  { id:'d10', emoji:'🎵', username:'MILO.BEATS',   display:'milo.beats',  caption:'Beat nuevo 🎧',        duration_ms:7500, created_at:new Date(Date.now()-1560e3).toISOString(),  view_count:3800, story_count:4 },
]

function mapStory(s) {
  return {
    ...s,
    emoji:      s.emoji || s.profiles?.avatar_emoji || '🎬',
    username:   (s.profiles?.username || s.username || 'user').toUpperCase(),
    display:    s.profiles?.username || s.display || 'user',
    avatar_url: s.profiles?.avatar_url || s.avatar_url || null,
    story_count: 1,
  }
}

export const useFeedStore = create((set, get) => ({
  stories:       DEMO,
  followFeed:    [],   // stories from followed users only
  myStories:     [],
  activeStory:   null,
  viewed:        new Set(),
  hasRealData:   false,
  realtimeSub:   null,

  // ── Fetch all active stories (global feed / discover)
  fetchFeed: async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles:user_id(id, username, display_name, avatar_emoji, avatar_url)')
        .eq('is_active', true)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data?.length > 0) {
        set({ stories: data.map(mapStory), hasRealData: true })
      }
    } catch { /* keep demo data */ }
  },

  // ── Fetch stories from users this user follows
  fetchFollowFeed: async (userId) => {
    if (!userId || userId === 'demo') return
    try {
      // Get IDs of users we follow
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('status', 'active')

      if (!followData?.length) return

      const followingIds = followData.map(f => f.following_id)

      const { data, error } = await supabase
        .from('stories')
        .select('*, profiles:user_id(id, username, display_name, avatar_emoji, avatar_url)')
        .in('user_id', followingIds)
        .eq('is_active', true)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error) set({ followFeed: (data || []).map(mapStory) })
    } catch { /* ignore */ }
  },

  fetchMyStories: async (userId) => {
    if (!userId || userId === 'demo') return
    const { data } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (data) set({ myStories: data.map(s => ({ ...s, fresh: true })) })
  },

  openStory: (story) => {
    set(s => ({ activeStory: story, viewed: new Set([...s.viewed, story.id]) }))
    // track view — fire and forget, skip demo IDs
    if (!story.id?.startsWith('d')) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return
        supabase.from('story_views')
          .upsert(
            { story_id: story.id, viewer_id: session.user.id, watch_pct: 0 },
            { onConflict: 'story_id,viewer_id' }
          )
          .then(() => supabase.rpc('increment_view_count', { story_uuid: story.id }))
      })
    }
  },

  closeStory: () => set({ activeStory: null }),

  addStory: (story) => {
    set(s => ({
      stories:    [story, ...s.stories],
      myStories:  [{ ...story, fresh: true }, ...s.myStories],
    }))
  },

  subscribeRealtime: () => {
    if (get().realtimeSub) return get().realtimeSub
    const sub = supabase
      .channel('public:stories:feed')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'stories'
      }, async payload => {
        // fetch the profile for the new story
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_emoji')
          .eq('id', payload.new.user_id)
          .single()
        const story = mapStory({ ...payload.new, profiles: profile })
        set(s => ({ stories: [story, ...s.stories] }))
      })
      .subscribe()
    set({ realtimeSub: sub })
    return sub
  },

  unsubscribe: () => {
    const { realtimeSub } = get()
    if (realtimeSub) supabase.removeChannel(realtimeSub)
    set({ realtimeSub: null })
  },
}))
