import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const MAX_MS = 7500
const MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
]

export function useRecord(userId) {
  const [phase, setPhase]     = useState('idle') // idle|camera|recording|preview|uploading
  const [elapsed, setElapsed] = useState(0)
  const [facing, setFacing]   = useState('user')
  const [camErr, setCamErr]   = useState('')
  const [blobUrl, setBlobUrl] = useState(null)

  const streamRef  = useRef(null)
  const recRef     = useRef(null)
  const chunksRef  = useRef([])
  const timerRef   = useRef(null)
  const blobRef    = useRef(null)

  const progress = Math.min(elapsed / MAX_MS, 1)
  const dashOff  = 120 - 120 * progress

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const openCamera = useCallback(async (facingMode = facing) => {
    setCamErr('')
    try {
      stopStream()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      })
      streamRef.current = stream
      setPhase('camera')
      return stream
    } catch (e) {
      const msg =
        e.name === 'NotAllowedError'  ? 'Permite el acceso a la cámara en tu navegador' :
        e.name === 'NotFoundError'    ? 'No se encontró cámara en este dispositivo' :
        e.name === 'NotReadableError' ? 'La cámara la usa otra aplicación' :
        `Error: ${e.message}`
      setCamErr(msg)
      return null
    }
  }, [facing, stopStream])

  const flipCamera = useCallback(async () => {
    const next = facing === 'user' ? 'environment' : 'user'
    setFacing(next)
    if (!streamRef.current) return
    const stream = await openCamera(next)
    return stream
  }, [facing, openCamera])

  const startRecording = useCallback(() => {
    if (!streamRef.current) return
    chunksRef.current = []
    const mime = MIME_TYPES.find(t => MediaRecorder.isTypeSupported(t)) || ''
    const rec  = new MediaRecorder(streamRef.current, mime ? { mimeType: mime } : {})
    recRef.current = rec

    rec.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime || 'video/webm' })
      blobRef.current = blob
      const url = URL.createObjectURL(blob)
      setBlobUrl(url)
      stopStream()
      setPhase('preview')
    }

    rec.start(100)
    setPhase('recording')
    setElapsed(0)

    let ms = 0
    timerRef.current = setInterval(() => {
      ms += 100
      setElapsed(ms)
      if (ms >= MAX_MS) stopRecording()
    }, 100)
  }, [stopStream])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    if (recRef.current?.state === 'recording') recRef.current.stop()
    setPhase('preview')
  }, [])

  const retake = useCallback(async () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlobUrl(null)
    blobRef.current = null
    setElapsed(0)
    await openCamera(facing)
  }, [blobUrl, facing, openCamera])

  const uploadAndPost = useCallback(async ({ caption, emoji = '🎬', category = 'general' }) => {
    if (!blobRef.current) throw new Error('No video recorded')
    setPhase('uploading')

    let videoUrl = 'demo://local'
    const durMs  = Math.max(elapsed, 500)

    if (userId && userId !== 'demo') {
      const blob = blobRef.current
      const ext  = blob.type.includes('mp4') ? 'mp4' : 'webm'
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('videos')
        .upload(path, blob, { contentType: blob.type })

      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(path)
        videoUrl = publicUrl
      }

      const { data: row, error: dbErr } = await supabase
        .from('stories')
        .insert({
          user_id:     userId,
          video_url:   videoUrl,
          duration_ms: durMs,
          caption:     caption || 'Mi historia ✨',
          emoji,
          category,
          is_active:   true,
          expires_at:  new Date(Date.now() + 86400000).toISOString(),
        })
        .select('*')
        .single()

      if (dbErr) { setPhase('preview'); throw dbErr }
      return { row, blobUrl }
    }

    return {
      row: {
        id: 'l-' + Date.now(), user_id: userId, video_url: blobUrl,
        duration_ms: durMs, caption, emoji, category,
        created_at: new Date().toISOString(), view_count: 0, story_count: 1,
        username: 'TÚ', display: 'tú',
      },
      blobUrl,
    }
  }, [userId, elapsed, blobUrl])

  const reset = useCallback(() => {
    clearInterval(timerRef.current)
    stopStream()
    if (blobUrl) URL.revokeObjectURL(blobUrl)
    setBlobUrl(null)
    blobRef.current = null
    setElapsed(0)
    setPhase('idle')
    setCamErr('')
  }, [stopStream, blobUrl])

  return {
    phase, elapsed, facing, camErr, blobUrl, progress, dashOff,
    stream: streamRef,
    openCamera, flipCamera, startRecording, stopRecording,
    uploadAndPost, retake, reset,
  }
}
