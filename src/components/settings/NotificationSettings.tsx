import { useState } from 'react'
import { Loader2, RefreshCw, MessageSquare, Mail } from 'lucide-react'
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

const CHANNELS: { id: NotificationChannel; title: string; desc: string; icon: typeof Mail }[] = [
  { id: 'sms', title: 'SMS', desc: 'Text messages sent to the customer’s registered phone number.', icon: MessageSquare },
  { id: 'email', title: 'Email', desc: 'Emails sent to the customer’s registered email address.', icon: Mail },
]

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
  const [rows, setRows] = useState<NotificationSettingsData | null>(null)
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // Editable copy of the server settings, re-synced whenever a fresh response arrives.
  const [syncedData, setSyncedData] = useState(data)
  if (data !== syncedData) {
    setSyncedData(data)
    if (data) setRows(data)
  }

  const setEnabled = (channel: NotificationChannel, type: string, enabled: boolean) =>
    setRows(prev => prev && { ...prev, [channel]: prev[channel].map(r => (r.type === type ? { ...r, enabled } : r)) })

  const toggle = async (channel: NotificationChannel, row: NotificationSetting, next: boolean) => {
    const key = `${channel}:${row.type}`
    if (saving.has(key)) return
    setMessage(null)
    setEnabled(channel, row.type, next) // optimistic
    setSaving(prev => new Set(prev).add(key))
    try {
      await setNotificationEnabled(channel, row.type, next)
      setMessage({ ok: true, text: `${channel.toUpperCase()} · ${humanize(row.type)} ${next ? 'enabled' : 'disabled'}.` })
    } catch (e: unknown) {
      setEnabled(channel, row.type, !next) // revert
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Update failed' })
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  if (loading && !rows) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <ListSkeleton rows={6} action />
      </div>
    )
  }

  if (error && !rows) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
          <p className="text-xs text-slate-500 mt-0.5">Turn individual customer notifications on or off. Changes take effect immediately. Message templates are read-only.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch} disabled={saving.size > 0}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {message && (
        <div className={`text-xs font-semibold rounded-xl px-3 py-2 border ${message.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {CHANNELS.map(channel => {
        const list = rows?.[channel.id] ?? []
        const Icon = channel.icon
        return (
          <div key={channel.id} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon size={14} className="text-slate-500" />
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{channel.title}</p>
              <p className="text-xs text-slate-400">· {channel.desc}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
              {list.length === 0 && <p className="px-5 py-4 text-xs text-slate-400">No {channel.title} notification types returned by the server.</p>}
              {list.map(row => {
                const key = `${channel.id}:${row.type}`
                const busy = saving.has(key)
                return (
                  <div key={row.type} className="flex items-start justify-between gap-6 px-5 py-4">
                    <div className="min-w-0 space-y-1.5">
                      <p className="text-sm font-semibold text-slate-700">{humanize(row.type)}</p>
                      {row.description && <p className="text-xs text-slate-400">{row.description}</p>}
                      {row.template && (
                        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">{row.template}</p>
                      )}
                      {row.placeholders.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {row.placeholders.map(p => (
                            <span key={p} className="text-[11px] font-mono text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2 pt-0.5">
                      {busy && <Loader2 size={13} className="animate-spin text-slate-400" />}
                      <span className={`text-xs font-semibold ${row.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>{row.enabled ? 'On' : 'Off'}</span>
                      <Toggle
                        checked={row.enabled}
                        disabled={busy}
                        label={`${channel.title} ${humanize(row.type)}`}
                        onChange={next => void toggle(channel.id, row, next)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
