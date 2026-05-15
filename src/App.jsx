import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useNotifStore } from '@/stores/notifStore'
import TabBar from '@/components/layout/TabBar'
import ErrorBoundary from '@/components/ui/ErrorBoundary'
import LogoVS from '@/components/ui/LogoVS'

/* ─── Global toast renderer ─────────────────────────────── */
function GlobalToasts() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    const handler = (e) => {
      const { msg, type = '', duration = 3000 } = e.detail
      const id = Date.now()
      setToasts(t => [...t, { id, msg, type }])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
    }
    window.addEventListener('vs-toast', handler)
    return () => window.removeEventListener('vs-toast', handler)
  }, [])

  if (!toasts.length) return null
  return (
    <div className="toast-stack" style={{ zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast-item${t.type === 'ok' || t.type === 'success' ? ' ok' : ''}`}>
          {t.msg}
        </div>
      ))}
    </div>
  )
}

import Feed        from '@/pages/Feed'
import Explore     from '@/pages/Explore'
import Record      from '@/pages/Record'
import Activity    from '@/pages/Activity'
import Profile     from '@/pages/Profile'
import Messages    from '@/pages/Messages'
import Chat        from '@/pages/Chat'
import UserProfile from '@/pages/UserProfile'
import Login       from '@/pages/Login'
import Onboarding  from '@/pages/Onboarding'

const TAB_ROUTES = ['/', '/explore', '/activity', '/profile']

function ProtectedRoute({ children }) {
  const user    = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  if (loading) return (
    <div style={{ position: 'absolute', inset: 0, background: 'var(--k)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="vs-diamond" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppShell() {
  const location   = useLocation()
  const showTabBar = TAB_ROUTES.includes(location.pathname)

  return (
    <div className="app-shell">
      <GlobalToasts />
      <ErrorBoundary>
        <Routes>
          <Route path="/"           element={<ProtectedRoute><Feed /></ProtectedRoute>} />
          <Route path="/explore"    element={<ProtectedRoute><Explore /></ProtectedRoute>} />
          <Route path="/record"     element={<ProtectedRoute><Record /></ProtectedRoute>} />
          <Route path="/activity"   element={<ProtectedRoute><Activity /></ProtectedRoute>} />
          <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/messages"   element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/chat/:convId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/u/:username" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/login"      element={<Login />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
        {showTabBar && <TabBar />}
      </ErrorBoundary>
    </div>
  )
}

export default function App() {
  const init    = useAuthStore((s) => s.init)
  const loading = useAuthStore((s) => s.loading)

  const notifSubscribe   = useNotifStore(s => s.subscribe)
  const notifUnsubscribe = useNotifStore(s => s.unsubscribe)
  const notifFetch       = useNotifStore(s => s.fetch)

  useEffect(() => {
    const saved = localStorage.getItem('vs-theme') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)

    let cleanup = () => {}
    init().then(unsub => { if (typeof unsub === 'function') cleanup = unsub })
    return () => cleanup()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to notifications ONCE when user is known
  const userId = useAuthStore(s => s.user?.id)
  useEffect(() => {
    if (!userId) return
    notifFetch(userId)
    notifSubscribe(userId)
    return () => notifUnsubscribe()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="app-shell">
        <div className="vs-loader">
          <LogoVS size="splash" />
        </div>
      </div>
    )
  }

  return <AppShell />
}
