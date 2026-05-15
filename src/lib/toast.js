/**
 * Sistema de toasts global — sin Context ni Provider.
 * Usa un event emitter simple sobre window.
 *
 * Uso:
 *   import { toast } from '@/lib/toast'
 *   toast('Guardado ✓', 'ok')
 *   toast('Error al guardar', 'error')
 *   toast('Cargando...')
 */

const CHANNEL = 'vs-toast'

export function toast(msg, type = '', duration = 3000) {
  window.dispatchEvent(new CustomEvent(CHANNEL, { detail: { msg, type, duration } }))
}

export function useToastListener(onToast) {
  // Call this in a component useEffect
  return () => {
    const handler = e => onToast(e.detail)
    window.addEventListener(CHANNEL, handler)
    return () => window.removeEventListener(CHANNEL, handler)
  }
}
