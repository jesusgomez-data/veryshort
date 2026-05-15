export function timeAgo(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1)  return 'AHORA'
  if (m < 60) return `${m}M`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}H`
  return `${Math.floor(h / 24)}D`
}

export function fmtCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function clsx(...args) {
  return args.filter(Boolean).join(' ')
}

export function getOrCreateConvId(uidA, uidB) {
  return [uidA, uidB].sort().join('_')
}

export function sortedParticipants(uidA, uidB) {
  return uidA < uidB ? [uidA, uidB] : [uidB, uidA]
}
