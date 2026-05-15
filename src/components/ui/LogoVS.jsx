import { useEffect, useState } from 'react'

let _cachedSrc = null

export default function LogoVS({ size = 'topbar', style = {} }) {
  const [src, setSrc] = useState(_cachedSrc)
  const w = { splash: 240, topbar: 80, icon: 36 }[size] ?? 80

  useEffect(() => {
    if (_cachedSrc) { setSrc(_cachedSrc); return }

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const px = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const d  = px.data
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2]
        if (r < 45 && g < 45 && b < 45) {
          d[i + 3] = Math.round((Math.max(r, g, b) / 45) * 255)
        }
      }
      ctx.putImageData(px, 0, 0)
      _cachedSrc = canvas.toDataURL('image/png')
      setSrc(_cachedSrc)
    }
    img.src = '/logoooo.jpeg'
  }, [])

  if (!src) return <div style={{ width: w, flexShrink: 0 }} />

  return (
    <>
      <style>{`
        @keyframes vsGlowLogo {
          0%,100% { filter: drop-shadow(0 0 6px rgba(232,0,10,.6)); }
          50%      { filter: drop-shadow(0 0 18px rgba(232,0,10,1)) drop-shadow(0 0 40px rgba(232,0,10,.5)); }
        }
        @keyframes vsGlowLogoSm {
          0%,100% { filter: drop-shadow(0 0 3px rgba(232,0,10,.5)); }
          50%      { filter: drop-shadow(0 0 9px rgba(232,0,10,.9)); }
        }
      `}</style>
      <img
        src={src}
        alt="VS · Very Short"
        width={w}
        style={{
          display: 'block', flexShrink: 0,
          userSelect: 'none', pointerEvents: 'none',
          animation: size === 'splash'
            ? 'vsGlowLogo 2.4s ease-in-out infinite'
            : 'vsGlowLogoSm 2.4s ease-in-out infinite',
          ...style,
        }}
      />
    </>
  )
}
