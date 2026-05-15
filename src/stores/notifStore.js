import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const DEMO_NOTIFS = [
  { id:'n1', type:'reaction',              data:{ emoji:'🔥' }, actor:{ username:'carla.run', avatar_emoji:'🏃' }, is_read:false, created_at:new Date(Date.now()-60e3).toISOString() },
  { id:'n2', type:'follow',                data:{},             actor:{ username:'vera.arts',  avatar_emoji:'🎨' }, is_read:false, created_at:new Date(Date.now()-300e3).toISOString() },
  { id:'n3', type:'reply',                 data:{},             actor:{ username:'alex.lift',  avatar_emoji:'🚴' }, is_read:true,  created_at:new Date(Date.now()-7200e3).toISOString() },
  { id:'n4', type:'story_view_milestone',  data:{ milestone:1000 }, actor:null,                                    is_read:true,  created_at:new Date(Date.now()-14400e3).toISOString() },
]

export const useNotifStore = create((set, get) => ({
  notifs:  DEMO_NOTIFS,
  unread:  2,
  channel: null,   // singleton — only ONE subscription allowed

  fetch: async (userId) => {
    if (!userId || userId === 'demo') return
    const { data, error } = await supabase
      .from('notifications')
      .select('*, actor:actor_id(id, username, avatar_emoji)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40)
    if (!error && data?.length > 0) {
      set({ notifs: data, unread: data.filter(n => !n.is_read).length })
    }
  },

  // Call once at app level — guards against duplicates
  subscribe: (userId) => {
    if (get().channel || !userId || userId === 'demo') return
    const ch = supabase
      .channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, async (payload) => {
        const n = payload.new
        const { data: actor } = await supabase
          .from('profiles').select('id, username, avatar_emoji')
          .eq('id', n.actor_id).single()
        set(s => ({ notifs: [{ ...n, actor }, ...s.notifs], unread: s.unread + 1 }))
      })
      .subscribe()
    set({ channel: ch })
  },

  unsubscribe: () => {
    const { channel } = get()
    if (channel) { supabase.removeChannel(channel); set({ channel: null }) }
  },

  markAllRead: async (userId) => {
    if (!userId || userId === 'demo') {
      set(s => ({ notifs: s.notifs.map(n => ({ ...n, is_read: true })), unread: 0 }))
      return
    }
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId).eq('is_read', false)
    set(s => ({ notifs: s.notifs.map(n => ({ ...n, is_read: true })), unread: 0 }))
  },
}))
