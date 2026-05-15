import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user:    null,
  profile: null,
  loading: true,

  init: async () => {
    // Get current session
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
      }
    } catch {
      // Network error or similar — just proceed as logged out
    } finally {
      set({ loading: false })
    }

    // Listen for future auth changes (login, logout, token refresh)
    // Return unsubscribe so callers can clean up (prevents double-registration in StrictMode)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null })
        return
      }
      if (session?.user && event !== 'INITIAL_SESSION') {
        // Only update on actual changes, not the initial duplicate event
        set({ user: session.user })
        await get().fetchProfile(session.user.id)
      }
    })

    return () => subscription.unsubscribe()
  },

  fetchProfile: async (userId) => {
    if (!userId || userId === 'demo') return null
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (!error && data) {
        set({ profile: data })
        return data
      }
    } catch { /* ignore */ }
    return null
  },

  updateProfile: async (updates) => {
    const { user } = get()
    if (!user || user.id === 'demo') return { error: new Error('Demo mode') }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select('*')
        .single()
      if (!error && data) set({ profile: data })
      return { data, error }
    } catch (e) {
      console.error('updateProfile error:', e)
      return { data: null, error: e }
    }
  },

  setDemoUser: () => {
    const demo = {
      id: 'demo', username: 'demo_user', display_name: 'Demo',
      avatar_emoji: '🧑‍💻', bio: 'Modo demo — sin cuenta',
      follower_count: 0, following_count: 0,
    }
    set({ user: demo, profile: demo, loading: false })
  },

  signOut: async () => {
    await supabase.auth.signOut().catch(() => {})
    set({ user: null, profile: null })
  },

  changePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  },
}))
