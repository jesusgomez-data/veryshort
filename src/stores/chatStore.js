import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { sortedParticipants } from '../lib/utils'

export const useChatStore = create((set, get) => ({
  conversations: [],
  messages:      {},   // { [convId]: Message[] }
  activeSubs:    {},   // { [convId]: RealtimeChannel }
  unreadTotal:   0,

  fetchConversations: async (userId) => {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        profile_a:participant_a(id, username, display_name, avatar_emoji),
        profile_b:participant_b(id, username, display_name, avatar_emoji)
      `)
      .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
      .order('last_msg_at', { ascending: false, nullsFirst: false })

    if (!error && data) set({ conversations: data })
  },

  fetchMessages: async (convId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:sender_id(id, username, display_name, avatar_emoji)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
      .limit(60)

    if (!error && data) {
      set(s => ({ messages: { ...s.messages, [convId]: data } }))
    }
    return data || []
  },

  sendMessage: async (convId, senderId, text, storyId = null) => {
    // Optimistic update — show message immediately with a temp id
    const tempMsg = {
      id: `temp-${Date.now()}`,
      conversation_id: convId,
      sender_id: senderId,
      text,
      story_id: storyId,
      is_read: false,
      created_at: new Date().toISOString(),
      _pending: true,
    }
    set(s => ({
      messages: {
        ...s.messages,
        [convId]: [...(s.messages[convId] || []), tempMsg],
      },
    }))

    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: convId, sender_id: senderId, text, story_id: storyId })
      .select()
      .single()

    if (!error && data) {
      // Replace the temp message with the real persisted message
      set(s => ({
        messages: {
          ...s.messages,
          [convId]: s.messages[convId].map(m =>
            m.id === tempMsg.id ? data : m
          ),
        },
      }))
    } else if (error) {
      // Mark temp message as failed so the UI can show an error state
      console.error('[chatStore] sendMessage error:', error)
      set(s => ({
        messages: {
          ...s.messages,
          [convId]: s.messages[convId].map(m =>
            m.id === tempMsg.id ? { ...m, _pending: false, _failed: true } : m
          ),
        },
      }))
    }
    return !error
  },

  getOrCreateConversation: async (myId, otherId) => {
    const [a, b] = sortedParticipants(myId, otherId)

    let { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_a', a)
      .eq('participant_b', b)
      .single()

    if (!data) {
      const { data: created } = await supabase
        .from('conversations')
        .insert({ participant_a: a, participant_b: b })
        .select()
        .single()
      data = created
    }
    return data
  },

  subscribeToConversation: (convId) => {
    const { activeSubs } = get()
    if (activeSubs[convId]) return

    const channel = supabase
      .channel(`conv:${convId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `conversation_id=eq.${convId}`,
      }, async (payload) => {
        const msg = payload.new

        // Fetch sender profile
        const { data: sender } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_emoji')
          .eq('id', msg.sender_id)
          .single()

        set(s => {
          const existing = s.messages[convId] || []
          // Deduplicate: skip if we already have this real id, OR if a temp
          // placeholder for this message is sitting in the list (optimistic sent).
          // temp ids look like "temp-<timestamp>" so we cannot match by value;
          // instead we check only the real id to avoid a true duplicate.
          if (existing.some(m => m.id === msg.id)) return s

          // Replace a pending temp message that came from the same sender with
          // matching text and was sent within the last 10 seconds.
          const TEN_S = 10_000
          const tempIdx = existing.findIndex(
            m =>
              m._pending &&
              m.sender_id === msg.sender_id &&
              m.text === msg.text &&
              Math.abs(new Date(msg.created_at) - new Date(m.created_at)) < TEN_S
          )
          if (tempIdx !== -1) {
            const updated = [...existing]
            updated[tempIdx] = { ...msg, sender }
            return { messages: { ...s.messages, [convId]: updated } }
          }

          return {
            messages: {
              ...s.messages,
              [convId]: [...existing, { ...msg, sender }],
            },
          }
        })
      })
      .subscribe()

    set(s => ({ activeSubs: { ...s.activeSubs, [convId]: channel } }))
  },

  unsubscribeFromConversation: (convId) => {
    const { activeSubs } = get()
    if (activeSubs[convId]) {
      supabase.removeChannel(activeSubs[convId])
      set(s => {
        const { [convId]: _, ...rest } = s.activeSubs
        return { activeSubs: rest }
      })
    }
  },

  markRead: async (convId, userId) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', convId)
      .neq('sender_id', userId)
      .eq('is_read', false)
  },
}))
