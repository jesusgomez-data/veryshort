import { useNavigate, useLocation } from 'react-router-dom'
import { useNotifs } from '@/hooks/useNotifs'
import { useAuthStore } from '@/stores/authStore'

const TABS = [
  { path: '/',         icon: '🏠', label: 'Inicio'    },
  { path: '/explore',  icon: '🔍', label: 'Explorar'  },
  null,
  { path: '/activity', icon: '🔔', label: 'Actividad' },
  { path: '/profile',  icon: '👤', label: 'Perfil'    },
]

export default function TabBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user }   = useAuthStore()
  const { unread } = useNotifs(user?.id)

  return (
    <nav className="tabbar">
      {TABS.map((tab, i) => {
        if (tab === null) {
          return (
            <button
              key="diamond"
              className="tab-diamond"
              aria-label="Grabar"
              onClick={() => navigate('/record')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                style={{ position: 'relative', zIndex: 1 }}>
                <polygon points="6,4 13,8 6,12" fill="#fff" />
              </svg>
            </button>
          )
        }

        const isActive   = location.pathname === tab.path
        const isActivity = tab.path === '/activity'

        return (
          <button
            key={tab.path}
            className={`tab-btn${isActive ? ' on' : ''}`}
            onClick={() => navigate(tab.path)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="tab-mark" />
            <span className="tab-icon" style={{ position: 'relative' }}>
              {tab.icon}
              {isActivity && unread > 0 && (
                <span style={{
                  position: 'absolute', top: 0, right: -2,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--r)', border: '1.5px solid var(--k)',
                  display: 'block',
                }} />
              )}
            </span>
            <span className="tab-lbl">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
