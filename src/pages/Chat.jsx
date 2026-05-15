import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import MessageInput from '@/components/chat/MessageInput'
import { timeAgo } from '@/lib/utils'

// 15 minutes in milliseconds — threshold for showing a time separator
const TIME_GAP_MS = 15 * 60 * 1000

export default function Chat() {
  const { convId } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const {
    conversations,
    messages,
    fetchMessages,
    sendMessage,
    subscribeToConversation,
    unsubscribeFromConversation,
    markRead,
  } = useChatStore()

  const listRef = useRef(null)

  // ── Typing indicator state ──────────────────────────────────────────────
  // isTyping: local user is currently typing (shows "escribiendo..." on own side)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef(null)   // debounce before showing bubble
  const clearTimerRef  = useRef(null)   // hide bubble 1.5s after last keystroke

  // ── Find this conversation ──────────────────────────────────────────────
  const conv = conversations.find((c) => c.id === convId)
  const isA = conv?.participant_a === user?.id || conv?.profile_a?.id === user?.id
  const partner = conv ? (isA ? conv.profile_b : conv.profile_a) : null
  const partnerEmoji = partner?.avatar_emoji ?? '👤'
  const partnerName  = partner?.display_name ?? partner?.username ?? 'Chat'

  const convMessages = messages[convId] ?? []

  // ── Fetch conversation from DB if it is not yet in local store ──────────
  useEffect(() => {
    if (!conv && convId) {
      supabase
        .from('conversations')
        .select(
          '*, profile_a:participant_a(id,username,display_name,avatar_emoji,avatar_url), profile_b:participant_b(id,username,display_name,avatar_emoji,avatar_url)'
        )
        .eq('id', convId)
        .single()
        .then(({ data }) => {
          if (data) {
            useChatStore.setState(s => ({
              conversations: [...s.conversations, data],
            }))
          }
        })
    }
  }, [convId, conv])

  useEffect(() => {
    if (!convId || !user?.id) return
    fetchMessages(convId)
    subscribeToConversation(convId)
    markRead(convId, user.id)

    return () => {
      unsubscribeFromConversation(convId)
    }
  }, [convId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll to bottom on new messages or typing bubble change ───────
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [convMessages.length, isTyping])

  // ── Clean up timers on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(typingTimerRef.current)
      clearTimeout(clearTimerRef.current)
    }
  }, [])

  // ── Typing handler: called by MessageInput on every keystroke ───────────
  const handleTyping = useCallback(() => {
    // Reset the "clear" timer on each keystroke
    clearTimeout(clearTimerRef.current)

    // Show bubble after 500ms of initial typing (debounced)
    if (!isTyping) {
      typingTimerRef.current = setTimeout(() => setIsTyping(true), 500)
    }

    // Hide bubble 1.5s after the last keystroke
    clearTimerRef.current = setTimeout(() => setIsTyping(false), 1500)
  }, [isTyping])

  // ── Send handler ────────────────────────────────────────────────────────
  // MessageInput already clears its own text field before calling onSend,
  // so we do NOT need to manage input state here.
  async function handleSend(text) {
    if (!text.trim() || !user?.id) return

    // Clear typing indicator immediately
    clearTimeout(typingTimerRef.current)
    clearTimeout(clearTimerRef.current)
    setIsTyping(false)

    // sendMessage performs the optimistic update internally;
    // errors are logged by the store and reflected via _failed flag on the bubble.
    const ok = await sendMessage(convId, user.id, text)
    if (!ok) {
      console.error('[Chat] Message failed to deliver — see bubble for retry cue')
    }
  }

  // ── Build augmented message list with time separators ──────────────────
  const renderedItems = convMessages.reduce((acc, msg, i) => {
    const prev = convMessages[i - 1]
    const gap  = prev
      ? new Date(msg.created_at) - new Date(prev.created_at)
      : Infinity

    if (gap > TIME_GAP_MS) {
      acc.push({
        _type: 'separator',
        id: `sep-${msg.id}`,
        label: `HACE ${timeAgo(msg.created_at)}`,
      })
    }
    acc.push(msg)
    return acc
  }, [])

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => {
              unsubscribeFromConversation(convId)
              navigate('/messages')
            }}
            aria-label="Volver"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              fontSize: 20,
              padding: '4px 8px 4px 0',
              lineHeight: 1,
            }}
          >
            ←
          </button>

          <div
            className="orb-ring seen"
            style={{ width: 32, height: 32, flexShrink: 0 }}
          >
            <div className="orb-face">
              <span style={{ fontSize: 14 }}>{partnerEmoji}</span>
            </div>
          </div>

          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {partnerName}
          </span>
        </div>
      </div>

      {/* Messages list */}
      <div
        ref={listRef}
        className="vs-scroll"
        style={{
          flex: 1,
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflowY: 'auto',
        }}
      >
        {/* Empty state */}
        {convMessages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '40px 24px',
            }}
          >
            <span style={{ fontSize: 48, lineHeight: 1 }}>{partnerEmoji}</span>
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: 'rgba(255,255,255,.55)',
                margin: 0,
                textAlign: 'center',
              }}
            >
              Inicia la conversación
            </p>
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 12,
                color: 'rgba(255,255,255,.28)',
                margin: 0,
                textAlign: 'center',
              }}
            >
              Responde su historia o saluda 👋
            </p>
          </div>
        )}

        {/* Message rows + time separators */}
        {renderedItems.map((item) => {
          // Time separator
          if (item._type === 'separator') {
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '6px 0 2px',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Unbounded', sans-serif",
                    fontSize: 8,
                    color: 'rgba(255,255,255,.2)',
                    letterSpacing: '1.2px',
                    padding: '2px 10px',
                    border: '1px solid rgba(255,255,255,.06)',
                    borderRadius: 20,
                  }}
                >
                  {item.label}
                </span>
              </div>
            )
          }

          // Regular message
          const msg  = item
          const isMe = msg.sender_id === user?.id

          // Visual state derived from optimistic flags
          const isPending = msg._pending === true
          const isFailed  = msg._failed  === true

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.22 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                className={isMe ? 'bubble-me' : 'bubble-them'}
                style={{
                  // Pending: lower opacity + italic to signal "Enviando..."
                  opacity:    isPending ? 0.6 : 1,
                  fontStyle:  isPending ? 'italic' : 'normal',
                  // Failed: red tint on the bubble border as a visual error cue
                  outline:    isFailed  ? '1.5px solid rgba(232,0,10,0.7)' : undefined,
                  transition: 'opacity 0.2s',
                }}
                title={
                  isPending ? 'Enviando...' :
                  isFailed  ? 'No se pudo enviar. Comprueba tu conexión.' :
                  undefined
                }
              >
                {msg.text}
                {isFailed && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: 10,
                      color: 'rgba(232,0,10,0.85)',
                      marginTop: 4,
                    }}
                  >
                    No enviado
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}

        {/* Typing indicator — local "escribiendo..." shown while user is composing */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              key="typing-indicator"
              initial={{ opacity: 0, y: 6, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.18 }}
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 6,
                alignSelf: 'flex-end',
              }}
            >
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 11,
                  color: 'rgba(255,255,255,.35)',
                  fontStyle: 'italic',
                  paddingRight: 4,
                }}
              >
                escribiendo...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Message input */}
      <div
        style={{
          flexShrink: 0,
          padding: '10px 16px 14px',
          borderTop: '1px solid rgba(255,255,255,.05)',
          background: 'var(--k)',
        }}
      >
        <MessageInput onSend={handleSend} onTyping={handleTyping} />
      </div>
    </div>
  )
}
