import { useState } from 'react'
import { Loader2, Landmark, Save, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { useApi } from '../../hooks/useApi'
import { getGlAccounts, updateGlAccounts } from '../../api'
import type { GlAccounts } from '../../api/types'
import { FormSkeleton } from '../ui/Skeleton'

const FIELDS: { id: keyof GlAccounts; label: string; desc: string }[] = [
  { id: 'loanGlAccount', label: 'Loan GL account', desc: 'Ledger account loan disbursements and repayments post to.' },
  { id: 'cardFeeAccount', label: 'Card fee account', desc: 'Receives card issuance and maintenance fees.' },
  { id: 'nipFeeAccount', label: 'NIP fee account', desc: 'Receives NIP transfer fees.' },
]

const inputClass =
  'w-full px-2.5 py-1.5 text-sm font-semibold text-slate-800 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'

export function GlSettings() {
  const { data, loading, error, refetch } = useApi(() => getGlAccounts().then(r => r.data), [])
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const current = (id: keyof GlAccounts) => (data?.[id] == null ? '' : String(data[id]))
  const dirty = Object.keys(draft).length > 0

  const save = async () => {
    const changed = Object.entries(draft).filter(([id, v]) => v.trim() !== '' && v.trim() !== current(id as keyof GlAccounts))
    if (changed.length === 0) {
      setMessage({ ok: false, text: 'Nothing to save — change at least one account.' })
      return
    }

    const payload: GlAccounts = {}
    for (const [id, raw] of changed) {
      const v = raw.trim()
      if (!/^\d+$/.test(v)) {
        const label = FIELDS.find(f => f.id === id)!.label
        setMessage({ ok: false, text: `${label} must contain digits only.` })
        return
      }
      payload[id as keyof GlAccounts] = v
    }

    setSaving(true)
    setMessage(null)
    try {
      await updateGlAccounts(payload)
      setMessage({ ok: true, text: `GL accounts updated (${changed.length} changed).` })
      setDraft({})
      refetch()
    } catch (e: unknown) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Update failed' })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) {
    return (
      <FormSkeleton fields={6} />
    )
  }

  if (error && !data) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">GL Accounts</h3>
          <p className="text-xs text-slate-500 mt-0.5">Ledger accounts loans, card fees and NIP fees post to. Changes take effect immediately.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch} disabled={saving || loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {message && (
        <div className={`text-xs font-semibold rounded-xl px-3 py-2 border ${message.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
              <Landmark size={16} className="text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">Ledger accounts</p>
              <p className="text-xs text-slate-400 mt-0.5">Only the accounts you change are sent.</p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {dirty && (
              <Button variant="ghost" size="sm" onClick={() => setDraft({})} disabled={saving}>Reset</Button>
            )}
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
            </Button>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {FIELDS.map(f => (
            <div key={f.id} className="flex items-center justify-between gap-6 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">{f.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={draft[f.id] ?? current(f.id)}
                onChange={e => setDraft(d => ({ ...d, [f.id]: e.target.value }))}
                placeholder="Not set"
                className={`${inputClass} max-w-[200px] shrink-0`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
