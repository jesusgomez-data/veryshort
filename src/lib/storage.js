import { supabase } from './supabase'

/**
 * Upload avatar image, returns public URL or null on error
 */
export async function uploadAvatar(userId, file) {
  const ext  = file.name.split('.').pop() || 'jpg'
  const path = `${userId}/avatar.${ext}`

  // Remove old avatar first (ignore error if doesn't exist)
  await supabase.storage.from('avatars').remove([path])

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  return publicUrl
}

/**
 * Upload video blob, returns public URL or null on error
 */
export async function uploadVideo(userId, blob, mimeType = 'video/webm') {
  const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm'
  const path = `${userId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('videos')
    .upload(path, blob, { contentType: mimeType })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(path)
  return publicUrl
}

/**
 * Get story viewers with profile info
 */
export async function getStoryViewers(storyId) {
  const { data, error } = await supabase
    .from('story_views')
    .select('*, viewer:viewer_id(id, username, display_name, avatar_emoji, avatar_url)')
    .eq('story_id', storyId)
    .order('viewed_at', { ascending: false })
    .limit(50)

  if (error) return []
  return data || []
}
