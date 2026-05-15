import { useState } from 'react'

export default function MessageInput({ onSend, onTyping, placeholder = 'Escribe un mensaje...' }) {
  const [text, setText] = useState('')

  function handleSend() {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend?.(trimmed)
    setText('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleChange(e) {
    setText(e.target.value)
    onTyping?.()
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'var(--k)',
        flexShrink: 0,
      }}
    >
      <input
        className="vs-input"
        style={{ flex: 1 }}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Mensaje"
        autoComplete="off"
        enterKeyHint="send"
      />

      <button
        onClick={handleSend}
        disabled={!text.trim()}
        aria-label="Enviar mensaje"
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: text.trim() ? 'var(--r)' : 'var(--k3)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: text.trim() ? 'pointer' : 'not-allowed',
          flexShrink: 0,
          transition: 'background 0.15s, transform 0.12s',
          boxShadow: text.trim() ? '0 4px 14px rgba(232,0,10,0.32)' : 'none',
        }}
        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <polygon
            points="4,3 14,8 4,13 6,8"
            fill={text.trim() ? '#fff' : 'rgba(255,255,255,0.25)'}
          />
        </svg>
      </button>
    </div>
  )
}
