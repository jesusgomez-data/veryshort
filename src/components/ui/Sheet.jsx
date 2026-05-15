export default function Sheet({ open, onClose, children, maxHeight = '80%', title }) {
  if (!open) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? 'Panel'}
    >
      <div
        className="modal-sheet"
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" />

        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px 0',
              flexShrink: 0,
            }}
          >
            <p
              style={{
                fontFamily: "'Unbounded', sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '-0.3px',
              }}
            >
              {title}
            </p>
            <button
              onClick={onClose}
              aria-label="Cerrar panel"
              style={{
                background: 'var(--k3)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.5)',
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}

        <div
          className="vs-scroll"
          style={{ flex: 1, overflowY: 'auto' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
