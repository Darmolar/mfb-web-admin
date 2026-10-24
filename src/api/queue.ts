// Turns RabbitMQ-style queue stats (memphis.bills, memphis.bills.dlq, …) into services an operator understands.
// A ".dlq" queue is where a service's jobs land after their retries are used up.

import type { QueueInfo } from './types'

export type ServiceHealth = 'healthy' | 'processing' | 'backlog' | 'stopped' | 'failures'

export type QueueService = {
  key: string
  label: string
  description: string
  waiting: number
  workers: number
  failedHeld: number
  health: ServiceHealth
}

const KNOWN: Record<string, { label: string; description: string }> = {
  'memphis.bills': { label: 'Bill payments', description: 'Airtime, data, electricity and TV payments sent to the biller.' },
  'memphis.savings.interest': { label: 'Savings interest', description: 'Interest calculated and paid into savings goals.' },
  'memphis.notifications': { label: 'Notifications', description: 'SMS, email and push messages to customers.' },
  'memphis.transfers': { label: 'Transfers', description: 'Outgoing transfers sent to other banks.' },
}

/** Above this many waiting jobs a service is falling behind rather than just busy. */
export const BACKLOG_THRESHOLD = 50

const titleCase = (s: string) => s.replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

export function queueLabel(name: string) {
  const base = name.replace(/\.dlq$/, '')
  return KNOWN[base]?.label ?? titleCase(base.replace(/^memphis\./, ''))
}

export function groupQueues(queues: Record<string, QueueInfo> | undefined): QueueService[] {
  const services = new Map<string, QueueService>()
  for (const [name, info] of Object.entries(queues ?? {})) {
    const dlq = name.endsWith('.dlq')
    const key = name.replace(/\.dlq$/, '')
    const s = services.get(key) ?? {
      key, label: queueLabel(key), description: KNOWN[key]?.description ?? '', waiting: 0, workers: 0, failedHeld: 0, health: 'healthy' as ServiceHealth,
    }
    if (dlq) s.failedHeld += Number(info?.messagesReady) || 0
    else { s.waiting += Number(info?.messagesReady) || 0; s.workers += Number(info?.consumers) || 0 }
    services.set(key, s)
  }
  for (const s of services.values()) {
    const hasMain = Object.prototype.hasOwnProperty.call(queues ?? {}, s.key)
    s.health = hasMain && s.workers === 0 ? 'stopped'
      : s.failedHeld > 0 ? 'failures'
        : s.waiting > BACKLOG_THRESHOLD ? 'backlog'
          : s.waiting > 0 ? 'processing'
            : 'healthy'
  }
  const rank: Record<ServiceHealth, number> = { stopped: 0, failures: 1, backlog: 2, processing: 3, healthy: 4 }
  return [...services.values()].sort((a, b) => rank[a.health] - rank[b.health] || a.label.localeCompare(b.label))
}

export type OverallStatus = { tone: 'green' | 'amber' | 'red'; title: string; detail: string }

export function overallStatus(services: QueueService[], failedCount: number): OverallStatus {
  const stopped = services.filter(s => s.health === 'stopped')
  if (stopped.length) {
    return { tone: 'red', title: `${stopped.map(s => s.label).join(', ')} ${stopped.length > 1 ? 'have' : 'has'} stopped`, detail: 'No worker is processing jobs. Contact the technical team.' }
  }
  const backlog = services.filter(s => s.health === 'backlog')
  if (failedCount > 0 || backlog.length) {
    const parts = [
      failedCount > 0 ? `${failedCount} failed job${failedCount > 1 ? 's' : ''} need${failedCount > 1 ? '' : 's'} a decision` : '',
      backlog.length ? `${backlog.map(s => s.label).join(', ')} ${backlog.length > 1 ? 'are' : 'is'} falling behind` : '',
    ].filter(Boolean)
    return { tone: 'amber', title: 'Needs attention', detail: `${parts.join('; ')}.` }
  }
  return { tone: 'green', title: 'Everything is running normally', detail: `${services.length} service${services.length === 1 ? '' : 's'} running, nothing has failed.` }
}

export const jobTypeLabel = (t: string) => (t ? t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' ') : 'Job')

const MONEY_KEY = /amount|fee|balance|naira/i

/** Job payloads arrive as a JSON string or object; show them as readable rows, amounts in naira. */
export function payloadRows(payload: unknown): [string, string][] {
  let data: unknown = payload
  if (typeof payload === 'string') {
    try { data = JSON.parse(payload) } catch { return payload.trim() ? [['Data', payload]] : [] }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return []
  return Object.entries(data as Record<string, unknown>).map(([k, v]) => {
    const label = k.replace(/Naira$/, '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase())
    if (typeof v === 'number' && MONEY_KEY.test(k)) return [label, `₦${v.toLocaleString('en-NG', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`]
    if (typeof v === 'string' && /^[A-Z_]+$/.test(v)) return [label, jobTypeLabel(v)]
    return [label, v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)]
  })
}

export function timeAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const s = Math.max(0, Math.round((now - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d < 30 ? `${d} day${d > 1 ? 's' : ''} ago` : new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
