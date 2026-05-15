import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFollow(myId, targetId) {
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading]         = useState(false)
  const [count, setCount]             = useState(0)

  useEffect(() => {
    if (!myId || !targetId || myId === targetId) return
    // Check if already following
    supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('follower_id', myId)
      .eq('following_id', targetId)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => setIsFollowing(!!data))

    // Get follower count for target
    supabase
      .from('follows')
      .select('id', { count: 'exact', head: true })
      .eq('following_id', targetId)
      .eq('status', 'active')
      .then(({ count: c }) => setCount(c || 0))
  }, [myId, targetId])

  const toggle = useCallback(async () => {
    if (!myId || !targetId || loading) return
    setLoading(true)

    // Optimistic update
    const prev = isFollowing
    setIsFollowing(!prev)
    setCount(c => prev ? Math.max(0, c - 1) : c + 1)

    try {
      if (prev) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', myId)
          .eq('following_id', targetId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: myId, following_id: targetId, status: 'active' })
        if (error) throw error
      }
    } catch {
      // Rollback on error
      setIsFollowing(prev)
      setCount(c => prev ? c + 1 : Math.max(0, c - 1))
    } finally {
      setLoading(false)
    }
  }, [myId, targetId, isFollowing, loading])

  return { isFollowing, loading, count, toggle }
}
