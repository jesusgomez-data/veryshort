/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        k:    '#000000',
        k2:   '#0f0f0f',
        k3:   '#1c1c1c',
        k4:   '#2a2a2a',
        w:    '#ffffff',
        w2:   '#f0f0f0',
        r:    '#e8000a',
        r2:   '#ff1a23',
      },
      fontFamily: {
        display: ['Unbounded', 'sans-serif'],
        body:    ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        'reel-spin':     'reel-spin 3s linear infinite',
        'reel-fast':     'reel-spin 1.2s linear infinite',
        'diamond-pulse': 'diamond-pulse 2s ease-in-out infinite',
        'dot-blink':     'dot-blink 1.4s ease-in-out infinite',
        'sheet-up':      'sheet-up 0.32s cubic-bezier(0.22,1,0.36,1)',
        'fade-in':       'fade-in 0.2s ease',
        'toast-in':      'toast-in 0.28s ease',
      },
      keyframes: {
        'reel-spin':     { to: { transform: 'rotate(360deg)' } },
        'diamond-pulse': {
          '0%,100%': { boxShadow: '0 0 8px rgba(232,0,10,0.3)' },
          '50%':     { boxShadow: '0 0 22px rgba(232,0,10,0.7)' }
        },
        'dot-blink': {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.15' }
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to:   { transform: 'translateY(0)' }
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' }
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}
