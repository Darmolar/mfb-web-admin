import { Fragment, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Search, ChevronRight, MessageSquare, Mail } from 'lucide-react'
import { Button } from '../ui/Button'
import { useApi } from '../../hooks/useApi'
import { getNotificationSettings, setNotificationEnabled } from '../../api'
import type { NotificationChannel, NotificationSetting, NotificationSettings as NotificationSettingsData } from '../../api/types'
import { ListSkeleton } from '../ui/Skeleton'

const ACRONYMS = new Set(['kyc', 'otp', 'sms', 'bvn', 'nin', 'pin'])

/** kyc_submitted → "KYC Submitted", card_dispatched → "Card Dispatched". */
function humanize(type: string) {
  return type
    .split(/[_\-.\s]+/)
    .filter(Boolean)
    .map(w => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ')
}

/** Groups shown in this order; an event goes in the first group whose pattern matches its type. */
const GROUPS: { title: string; match: RegExp }[] = [
  { title: 'Security', match: /otp|lock|password|pin|login|device|security/i },
  { title: 'Account', match: /welcome|account|profile|onboard|signup|registration/i },
  { title: 'KYC', match: /kyc|tier|bvn|nin|identity/i },
  { title: 'Payments', match: /transaction|transfer|debit|credit|bill|airtime|vas|payment/i },
  { title: 'Cards', match: /card/i },
  { title: 'Loans', match: /loan|repayment/i },
  { title: 'Savings', match: /saving|deposit|withdraw/i },
]
const OTHER = 'Other'

function groupOf(type: string) {
  // KYC before Account/Security: "kyc_account_locked" style names belong with KYC.
  if (/kyc/i.test(type)) return 'KYC'
  return GROUPS.find(g => g.match.test(type))?.title ?? OTHER
}

const CHANNELS: { id: NotificationChannel; title: string; icon: typeof Mail }[] = [
  { id: 'sms', title: 'SMS', icon: MessageSquare },
  { id: 'email', title: 'Email', icon: Mail },
]

type EventRow = { type: string; label: string; group: string; byChannel: Partial<Record<NotificationChannel, NotificationSetting>> }

/** One row per event type across channels, grouped and ordered for display. */
function buildEventRows(data: NotificationSettingsData | null): EventRow[] {
  if (!data) return []
  const rows = new Map<string, EventRow>()
  for (const { id } of CHANNELS) {
    for (const setting of data[id] ?? []) {
      const row = rows.get(setting.type) ?? { type: setting.type, label: humanize(setting.type), group: groupOf(setting.type), byChannel: {} }
      row.byChannel[id] = setting
      rows.set(setting.type, row)
    }
  }
  const order = [...GROUPS.map(g => g.title), OTHER]
  return [...rows.values()].sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group))
}

function Toggle({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

export function NotificationSettings() {
  const { data, loading, error, refetch } = useApi(getNotificationSettings, [])
  const [settings, setSettings] = useState<NotificationSettingsData | null>(null)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<string>>(new Set())

  // Editable copy of the server settings, re-synced whenever a fresh response arrives.
  const [syncedData, setSyncedData] = useState(data)
  if (data !== syncedData) {
    setSyncedData(data)
    if (data) setSettings(data)
  }

  const rows = useMemo(() => buildEventRows(settings), [settings])
  const q = query.trim().toLowerCase()
  const visible = q ? rows.filter(r => r.label.toLowerCase().includes(q) || r.group.toLowerCase().includes(q)) : rows

  const setEnabled = (channel: NotificationChannel, type: string, enabled: boolean) =>
    setSettings(prev => prev && { ...prev, [channel]: prev[channel].map(r => (r.type === type ? { ...r, enabled } : r)) })

  const toggle = async (channel: NotificationChannel, row: NotificationSetting, next: boolean) => {
    const key = `${channel}:${row.type}`
    if (saving.has(key)) return
    setMessage(null)
    setEnabled(channel, row.type, next) // optimistic
    setSaving(prev => new Set(prev).add(key))
    try {
      await setNotificationEnabled(channel, row.type, next)
      setMessage({ ok: true, text: `${channel.toUpperCase()} · ${humanize(row.type)} ${next ? 'turned on' : 'turned off'}.` })
    } catch (e: unknown) {
      setEnabled(channel, row.type, !next) // revert
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Update failed' })
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  const toggleOpen = (type: string) =>
    setOpen(prev => { const s = new Set(prev); if (s.has(type)) s.delete(type); else s.add(type); return s })

  if (loading && !settings) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <ListSkeleton rows={6} action />
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
      </div>
    )
  }

  const counts = CHANNELS.map(c => {
    const list = settings?.[c.id] ?? []
    return { ...c, on: list.filter(r => r.enabled).length, total: list.length }
  })

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Turn customer notifications on or off per channel. Changes take effect immediately.{' '}
            {counts.filter(c => c.total > 0).map((c, i) => (
              <span key={c.id} className="font-semibold text-slate-600">{i > 0 && ' · '}{c.title} {c.on} of {c.total} on</span>
            ))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Search notifications</span>
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search events…"
              className="h-8 w-48 rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <Button variant="secondary" size="sm" onClick={refetch} disabled={saving.size > 0}>
            <RefreshCw size={13} /> Refresh
          </Button>
        </div>
      </div>

      {message && (
        <div role="status" className={`text-xs font-semibold rounded-xl px-3 py-2 border ${message.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th scope="col" className="text-left px-5 py-3">Event</th>
              {CHANNELS.map(c => (
                <th key={c.id} scope="col" className="w-28 px-3 py-3 text-left">
                  <span className="inline-flex items-center gap-1.5"><c.icon size={13} /> {c.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={1 + CHANNELS.length} className="px-5 py-6 text-xs text-slate-400">
                {rows.length === 0 ? 'No notification types returned by the server.' : `No events match “${query}”.`}
              </td></tr>
            )}
            {visible.map((row, i) => {
              const newGroup = i === 0 || visible[i - 1].group !== row.group
              const expanded = open.has(row.type)
              const messages = CHANNELS.filter(c => row.byChannel[c.id]?.template || row.byChannel[c.id]?.description)
              return (
                <Fragment key={row.type}>
                  {newGroup && (
                    <tr className="bg-slate-50/70">
                      <th scope="colgroup" colSpan={1 + CHANNELS.length} className="text-left px-5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{row.group}</th>
                    </tr>
                  )}
                  <tr className="border-t border-slate-100 align-middle">
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700">{row.label}</span>
                        {messages.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleOpen(row.type)}
                            aria-expanded={expanded}
                            className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
                            {expanded ? 'Hide message' : 'View message'}
                          </button>
                        )}
                      </div>
                    </td>
                    {CHANNELS.map(c => {
                      const setting = row.byChannel[c.id]
                      if (!setting) return <td key={c.id} className="px-3 py-2.5 text-slate-300" aria-label={`No ${c.title}`}>—</td>
                      const busy = saving.has(`${c.id}:${row.type}`)
                      return (
                        <td key={c.id} className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Toggle checked={setting.enabled} disabled={busy} label={`${c.title} ${row.label}`} onChange={next => void toggle(c.id, setting, next)} />
                            <span className={`text-xs font-semibold w-6 ${setting.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>{setting.enabled ? 'On' : 'Off'}</span>
                            {busy && <Loader2 size={12} className="animate-spin text-slate-400" />}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={1 + CHANNELS.length} className="px-5 pb-3">
                        <div className="space-y-2">
                          {messages.map(c => {
                            const s = row.byChannel[c.id]!
                            return (
                              <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">{c.title} · read-only</p>
                                {s.template && <p className="text-xs text-slate-600 whitespace-pre-wrap break-words">{s.template}</p>}
                                {s.description && <p className="text-xs text-slate-500">{s.description}</p>}
                                {s.placeholders.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {s.placeholders.map(p => <span key={p} className="text-[11px] font-mono text-slate-500 bg-white border border-slate-100 rounded px-1.5 py-0.5">{p}</span>)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
