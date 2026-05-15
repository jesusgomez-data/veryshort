export default function Spinner({ size = 40, color = 'var(--r)' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `3px solid rgba(255,255,255,.1)`,
      borderTopColor: color,
      animation: 'reel-spin .8s linear infinite',
    }} />
  )
}
