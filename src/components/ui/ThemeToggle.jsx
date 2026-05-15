import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('vs-theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vs-theme', theme)
  }, [theme])

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  return { theme, toggle, isDark: theme === 'dark' }
}

export default function ThemeToggle({ style = {} }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
      style={{
        background: 'transparent', border: '1px solid var(--border)',
        borderRadius: 10, width: 38, height: 38,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, cursor: 'pointer', transition: 'all .15s',
        color: 'var(--text-primary)',
        ...style,
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
