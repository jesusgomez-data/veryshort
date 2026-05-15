import { useEffect } from 'react'
import { useNotifStore } from '@/stores/notifStore'

/**
 * Thin hook — reads from the singleton notifStore.
 * The Realtime subscription is managed at app-level (App.jsx),
 * so calling this from multiple components is safe.
 */
export function useNotifs(userId, _refreshKey = 0) {
  const notifs      = useNotifStore(s => s.notifs)
  const unread      = useNotifStore(s => s.unread)
  const fetch       = useNotifStore(s => s.fetch)
  const markAllRead = useNotifStore(s => s.markAllRead)

  // Refresh when userId or refreshKey changes
  useEffect(() => {
    fetch(userId)
  }, [userId, _refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    notifs,
    unread,
    markAllRead: () => markAllRead(userId),
  }
}
