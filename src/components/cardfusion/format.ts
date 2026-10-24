// The backend sends local date-times without a zone, so show the wall-clock value as sent.
export function formatWhen(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-NG', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** "3 days ago" style text for recent times; null when there is no usable date. */
export function timeAgo(value: string | null, now = Date.now()) {
  if (!value) return null
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return null
  const mins = Math.max(0, Math.round((now - t) / 60_000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** STAFF_LOGIN → Staff login. */
export const readable = (value: string) => {
  const s = value.replace(/_/g, ' ').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback
}
