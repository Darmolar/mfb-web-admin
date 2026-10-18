import { useMemo, useState, type ReactNode } from 'react'
import { Loader2, Landmark, Receipt, Percent, ListTree, Save, RefreshCw, Pencil, X } from 'lucide-react'
import { Button } from '../ui/Button'
import { useApi } from '../../hooks/useApi'
import { getVasSettings, updateVasAccounts, updateVasCharges, updateVasCashback, setVasEntry } from '../../api'
import type { VasSettingsMap, VasSettingsResponse } from '../../api/types'

type Field = { id: string; label: string; key: string }
type SectionId = 'accounts' | 'charges' | 'cashback'
type Section = {
  id: SectionId
  title: string
  desc: string
  icon: ReactNode
  unit: string
  fields: Field[]
}

const SECTIONS: Section[] = [
  {
    id: 'accounts',
    title: 'Settlement accounts',
    desc: 'Internal account numbers VAS transactions post to.',
    icon: <Landmark size={16} className="text-slate-500" />,
    unit: '',
    fields: [
      { id: 'suspenseAccount', label: 'Suspense account', key: 'vas.account.suspense' },
      { id: 'prepaymentAccount', label: 'Prepayment account', key: 'vas.account.prepayment' },
      { id: 'cashbackAccount', label: 'Cashback pool account', key: 'vas.account.cashback' },
      { id: 'incomeAccount', label: 'Income account', key: 'vas.account.income' },
      { id: 'bvnExpensesAccount', label: 'BVN expenses account', key: 'vas.account.bvn_expenses' },
    ],
  },
  {
    id: 'charges',
    title: 'Charges',
    desc: 'Flat fee in NGN per transaction. Bill charge is the fallback for any category not set individually.',
    icon: <Receipt size={16} className="text-slate-500" />,
    unit: '₦',
    fields: [
      { id: 'bvnCharge', label: 'BVN lookup', key: 'vas.charge.bvn' },
      { id: 'ninCharge', label: 'NIN lookup', key: 'vas.charge.nin' },
      { id: 'billCharge', label: 'Bill (fallback)', key: 'vas.charge.bill' },
      { id: 'airtimeCharge', label: 'Airtime', key: 'vas.charge.airtime' },
      { id: 'dataCharge', label: 'Data', key: 'vas.charge.data' },
      { id: 'electricityCharge', label: 'Electricity', key: 'vas.charge.electricity' },
      { id: 'cableTvCharge', label: 'Cable TV', key: 'vas.charge.cable_tv' },
    ],
  },
  {
    id: 'cashback',
    title: 'Cashback rates',
    desc: 'Percentage of the transaction amount returned to the customer as cashback.',
    icon: <Percent size={16} className="text-slate-500" />,
    unit: '%',
    fields: [
      { id: 'airtime', label: 'Airtime', key: 'vas.cashback.airtime' },
      { id: 'data', label: 'Data', key: 'vas.cashback.data' },
      { id: 'electricity', label: 'Electricity', key: 'vas.cashback.electricity' },
      { id: 'cableTv', label: 'Cable TV', key: 'vas.cashback.cable_tv' },
    ],
  },
]

function toMap(res: VasSettingsResponse | null): VasSettingsMap {
  if (!res) return {}
  if (Array.isArray(res)) return Object.fromEntries(res.map(e => [e.key, e.value]))
  return res
}

/** Backend stores cashback as a fraction; the form edits it as a percentage. */
const fractionToPercent = (v: string) => (v === '' || isNaN(Number(v)) ? v : String(Number((Number(v) * 100).toFixed(4))))

const inputClass =
  'w-full px-2.5 py-1.5 text-sm font-semibold text-slate-800 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'

export function VasSettings({ section = 'services' }: { section?: 'accounts' | 'services' }) {
  const { data, loading, error, refetch } = useApi(() => getVasSettings().then(r => r.data), [])
  const map = useMemo(() => toMap(data), [data])

  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [drafts, setDrafts] = useState<Record<SectionId, Record<string, string>>>({ accounts: {}, charges: {}, cashback: {} })
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [entryValue, setEntryValue] = useState('')

  const currentValue = (section: Section, field: Field) => {
    const raw = map[field.key] === null || map[field.key] === undefined ? '' : String(map[field.key])
    return section.id === 'cashback' ? fractionToPercent(raw) : raw
  }

  const run = async (key: string, fn: () => Promise<unknown>, okText: string, after?: () => void) => {
    setSaving(key)
    setMessage(null)
    try {
      await fn()
      setMessage({ ok: true, text: okText })
      after?.()
      refetch()
    } catch (e: unknown) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Update failed' })
    } finally {
      setSaving(null)
    }
  }

  const saveSection = (section: Section) => {
    const changed = Object.entries(drafts[section.id]).filter(([id, v]) => {
      const field = section.fields.find(f => f.id === id)!
      return v.trim() !== '' && v.trim() !== currentValue(section, field)
    })
    if (changed.length === 0) {
      setMessage({ ok: false, text: 'Nothing to save — change at least one field.' })
      return
    }

    const payload: Record<string, string | number> = {}
    for (const [id, raw] of changed) {
      const label = section.fields.find(f => f.id === id)!.label
      const v = raw.trim()
      if (section.id === 'accounts') {
        if (!/^\d+$/.test(v)) return setMessage({ ok: false, text: `${label} must contain digits only.` })
        payload[id] = v
      } else {
        const n = Number(v)
        if (!Number.isFinite(n) || n < 0) return setMessage({ ok: false, text: `${label} must be a number of 0 or more.` })
        if (section.id === 'cashback') {
          if (n > 100) return setMessage({ ok: false, text: `${label} cashback cannot exceed 100%.` })
          payload[id] = Number((n / 100).toFixed(6))
        } else {
          payload[id] = Number(n.toFixed(2))
        }
      }
    }

    const fn =
      section.id === 'accounts' ? () => updateVasAccounts(payload)
        : section.id === 'charges' ? () => updateVasCharges(payload)
          : () => updateVasCashback(payload)
    run(section.id, fn, `${section.title} updated (${changed.length} field${changed.length > 1 ? 's' : ''}).`, () =>
      setDrafts(d => ({ ...d, [section.id]: {} })),
    )
  }

  const saveEntry = (key: string) => {
    if (entryValue.trim() === '') {
      setMessage({ ok: false, text: 'Value cannot be empty.' })
      return
    }
    run(`entry:${key}`, () => setVasEntry(key, entryValue.trim()), `${key} set to ${entryValue.trim()}.`, () => setEditingKey(null))
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
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

  const entries = Object.entries(map).filter(([key]) => section === 'accounts' ? key.startsWith('vas.account.') : !key.startsWith('vas.account.')).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{section === 'accounts' ? 'VAS Settlement Accounts' : 'VAS Configuration'}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{section === 'accounts' ? 'Settlement accounts for value-added services.' : 'Fees and cashback for value-added services.'} Changes take effect immediately.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch} disabled={!!saving || loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      {message && (
        <div className={`text-xs font-semibold rounded-xl px-3 py-2 border ${message.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {SECTIONS.filter(item => section === 'accounts' ? item.id === 'accounts' : item.id !== 'accounts').map(section => {
        const draft = drafts[section.id]
        const dirty = Object.keys(draft).length > 0
        return (
          <div key={section.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-100">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">{section.icon}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{section.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{section.desc}</p>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {dirty && (
                  <Button variant="ghost" size="sm" onClick={() => setDrafts(d => ({ ...d, [section.id]: {} }))} disabled={saving === section.id}>
                    Reset
                  </Button>
                )}
                <Button size="sm" onClick={() => saveSection(section)} disabled={saving === section.id || !dirty}>
                  {saving === section.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-5 py-4">
              {section.fields.map(field => {
                const current = currentValue(section, field)
                return (
                  <label key={field.id} className="block">
                    <span className="text-xs font-semibold text-slate-600">{field.label}</span>
                    <div className="relative mt-1">
                      {section.unit === '₦' && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">₦</span>}
                      <input
                        type="text"
                        inputMode={section.id === 'accounts' ? 'numeric' : 'decimal'}
                        value={draft[field.id] ?? current}
                        onChange={e => setDrafts(d => ({ ...d, [section.id]: { ...d[section.id], [field.id]: e.target.value } }))}
                        placeholder="Not set"
                        className={`${inputClass} ${section.unit === '₦' ? 'pl-6' : ''} ${section.unit === '%' ? 'pr-7' : ''}`}
                      />
                      {section.unit === '%' && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
            <ListTree size={16} className="text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{section === 'accounts' ? 'VAS settlement account keys' : 'VAS service keys'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{section === 'accounts' ? 'Settlement account values stored on the server. Edit any single key directly.' : 'Service values stored on the server. Edit any single key directly. Cashback keys are fractions here (0.055 = 5.5%).'}</p>
          </div>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-6 text-xs text-slate-400">No keys returned for this section.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-5 py-2 font-semibold">Key</th>
                  <th className="px-5 py-2 font-semibold">Value</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map(([key, value]) => (
                  <tr key={key}>
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">{key}</td>
                    <td className="px-5 py-2.5">
                      {editingKey === key ? (
                        <input
                          autoFocus
                          value={entryValue}
                          onChange={e => setEntryValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEntry(key); if (e.key === 'Escape') setEditingKey(null) }}
                          className={`${inputClass} max-w-xs`}
                        />
                      ) : (
                        <span className="font-semibold text-slate-800">{value === null || value === '' ? <span className="text-slate-400 font-normal">Not set</span> : String(value)}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      {editingKey === key ? (
                        <div className="inline-flex gap-1.5">
                          <Button size="sm" onClick={() => saveEntry(key)} disabled={saving === `entry:${key}`}>
                            {saving === `entry:${key}` ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setEditingKey(null)} disabled={saving === `entry:${key}`}>
                            <X size={13} />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => { setEditingKey(key); setEntryValue(value === null ? '' : String(value)) }} disabled={!!saving}>
                          <Pencil size={13} /> Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
