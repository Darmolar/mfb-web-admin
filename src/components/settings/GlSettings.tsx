import { useState } from 'react'
import { Loader2, Landmark, Save, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { useApi } from '../../hooks/useApi'
import { getGlAccounts, updateGlAccounts, setGlEntry, NIP_FEE_KEYS, type NipFeeKey } from '../../api'
import type { GlAccounts } from '../../api/types'
import { FormSkeleton } from '../ui/Skeleton'

const FIELDS: { id: keyof GlAccounts; label: string; desc: string }[] = [
  { id: 'loanGlAccount', label: 'Loan GL account', desc: 'Ledger account loan disbursements and repayments post to.' },
  { id: 'savingsGlAccount', label: 'Savings GL account', desc: 'Credited when customers top up a savings plan. If empty, top-ups go to the savings pool account.' },
  { id: 'savingsPoolAccount', label: 'Savings pool account', desc: 'Source account debited when savings interest is credited to customers.' },
  { id: 'cardFeeAccount', label: 'Card fee account', desc: 'Receives card issuance and maintenance fees.' },
  { id: 'nipFeeAccount', label: 'NIP fee account', desc: 'Receives NIP transfer fees.' },
]

const NIP_FIELDS: Record<NipFeeKey, { label: string; desc: string }> = {
  'nip.fee.threshold': { label: 'Threshold (₦)', desc: 'Transfer amount that splits the two fee tiers.' },
  'nip.fee.below_threshold': { label: 'Fee at or below threshold (₦)', desc: 'NIP fee for transfers up to and including the threshold.' },
  'nip.fee.above_threshold': { label: 'Fee above threshold (₦)', desc: 'NIP fee for transfers above the threshold.' },
}

const inputClass =
  'w-full px-2.5 py-1.5 text-sm font-semibold text-slate-800 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'

export function GlSettings() {
  const { data: loaded, loading, error, refetch } = useApi(() => getGlAccounts(), [])
  const data = loaded?.data
  const nipFees = loaded?.nipFees
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

  const [nipDraft, setNipDraft] = useState<Partial<Record<NipFeeKey, string>>>({})
  const [nipSaving, setNipSaving] = useState(false)
  const nipCurrent = (key: NipFeeKey) => nipFees?.[key] ?? ''
  const nipDirty = Object.keys(nipDraft).length > 0

  const saveNip = async () => {
    const changed = NIP_FEE_KEYS
      .map(key => [key, (nipDraft[key] ?? '').trim()] as const)
      .filter(([key, v]) => key in nipDraft && v !== nipCurrent(key))
    if (changed.length === 0) {
      setMessage({ ok: false, text: 'Nothing to save — change at least one NIP fee.' })
      return
    }
    for (const [key, v] of changed) {
      if (!/^\d+(\.\d{1,2})?$/.test(v)) {
        setMessage({ ok: false, text: `${NIP_FIELDS[key].label} must be an amount like 10.75.` })
        return
      }
    }
    setNipSaving(true)
    setMessage(null)
    const done: string[] = []
    try {
      for (const [key, v] of changed) {
        await setGlEntry(key, v)
        done.push(NIP_FIELDS[key].label)
      }
      setMessage({ ok: true, text: `NIP fees updated (${done.length} changed).` })
      setNipDraft({})
    } catch (e: unknown) {
      const reason = e instanceof Error ? e.message : 'Update failed'
      setMessage({ ok: false, text: done.length ? `Saved ${done.join(', ')}; then failed: ${reason}` : reason })
    } finally {
      setNipSaving(false)
      refetch()
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
          <p className="text-xs text-slate-500 mt-0.5">Ledger accounts loans, savings, card fees and NIP fees post to, and the NIP transfer fee tiers. Changes take effect immediately.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch} disabled={saving || nipSaving || loading}>
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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">NIP transfer fees</p>
            <p className="text-xs text-slate-400 mt-0.5">Two fee tiers split by a transfer amount. Only the values you change are sent.</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {nipDirty && (
              <Button variant="ghost" size="sm" onClick={() => setNipDraft({})} disabled={nipSaving}>Reset</Button>
            )}
            <Button size="sm" onClick={saveNip} disabled={nipSaving || !nipDirty}>
              {nipSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
            </Button>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {NIP_FEE_KEYS.map(key => (
            <div key={key} className="flex items-center justify-between gap-6 px-5 py-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">{NIP_FIELDS[key].label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{NIP_FIELDS[key].desc}</p>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={nipDraft[key] ?? nipCurrent(key)}
                onChange={e => setNipDraft(d => ({ ...d, [key]: e.target.value }))}
                placeholder="Not set"
                disabled={nipSaving}
                className={`${inputClass} max-w-[200px] shrink-0`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
