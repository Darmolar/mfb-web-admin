import { useMemo, useState, type ReactNode } from 'react'
import { Loader2, Landmark, Receipt, Percent, ListTree, Save, RefreshCw, Pencil, X, Search, ChevronDown, ArrowRight, Info, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useApi } from '../../hooks/useApi'
import { getVasSettings, updateVasAccounts, updateVasCharges, updateVasCashback, setVasEntry } from '../../api'
import type { VasSettingsMap, VasSettingsResponse } from '../../api/types'
import { VAS_KEY_GROUPS, editorValue, formatVasValue, toStoredValue, vasKeyKind, vasKeyLabel, type VasKeyKind } from '../../api/vasKeys'
import { FormSkeleton } from '../ui/Skeleton'

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
  'w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm font-semibold text-slate-800 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'

const naira = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`

/** How a form value reads to a person: ₦50, Free, 5.5%, or the account number. */
function describe(section: Section, value: string) {
  if (value.trim() === '') return 'Not set'
  const n = Number(value)
  if (section.id === 'charges') return Number.isFinite(n) ? (n === 0 ? 'Free' : naira(n)) : value
  if (section.id === 'cashback') return Number.isFinite(n) ? `${n}%` : value
  return value
}

/** One-line hint under each field so the number's effect is obvious. */
function fieldHint(section: Section, value: string) {
  const n = Number(value)
  if (value.trim() === '' || !Number.isFinite(n)) return section.id === 'accounts' ? 'Digits only' : 'Not set on the server'
  if (section.id === 'charges') return n === 0 ? 'No fee charged' : `Customer pays ${naira(n)} per transaction`
  if (section.id === 'cashback') return n === 0 ? 'No cashback' : `₦1,000 purchase → ${naira(Number((n * 10).toFixed(2)))} back`
  return 'Internal account number'
}

type Change = { id: string; label: string; from: string; to: string }
type Review = { section: Section; payload: Record<string, string | number>; changes: Change[] }

export function VasSettings({ section = 'services' }: { section?: 'accounts' | 'services' }) {
  const { data, loading, error, refetch } = useApi(() => getVasSettings().then(r => r.data), [])
  const map = useMemo(() => toMap(data), [data])

  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [drafts, setDrafts] = useState<Record<SectionId, Record<string, string>>>({ accounts: {}, charges: {}, cashback: {} })
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [entryValue, setEntryValue] = useState('')
  const [keyFilter, setKeyFilter] = useState('')
  const [keysOpen, setKeysOpen] = useState(false)
  const [review, setReview] = useState<Review | null>(null)

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

  /** Fields whose draft differs from what the server holds. */
  const changedFields = (section: Section) =>
    section.fields.filter(field => {
      const v = drafts[section.id][field.id]
      return v !== undefined && v.trim() !== '' && v.trim() !== currentValue(section, field)
    })

  const reviewSection = (section: Section) => {
    const changed = changedFields(section)
    if (changed.length === 0) {
      setMessage({ ok: false, text: 'Nothing to save. Change at least one field.' })
      return
    }

    const payload: Record<string, string | number> = {}
    const changes: Change[] = []
    for (const field of changed) {
      const v = drafts[section.id][field.id].trim()
      if (section.id === 'accounts') {
        if (!/^\d+$/.test(v)) return setMessage({ ok: false, text: `${field.label} must contain digits only.` })
        payload[field.id] = v
      } else {
        const n = Number(v)
        if (!Number.isFinite(n) || n < 0) return setMessage({ ok: false, text: `${field.label} must be a number of 0 or more.` })
        if (section.id === 'cashback') {
          if (n > 100) return setMessage({ ok: false, text: `${field.label} cashback cannot exceed 100%.` })
          payload[field.id] = Number((n / 100).toFixed(6))
        } else {
          payload[field.id] = Number(n.toFixed(2))
        }
      }
      changes.push({ id: field.id, label: field.label, from: describe(section, currentValue(section, field)), to: describe(section, v) })
    }
    setMessage(null)
    setReview({ section, payload, changes })
  }

  const confirmReview = () => {
    if (!review) return
    const { section, payload, changes } = review
    const fn =
      section.id === 'accounts' ? () => updateVasAccounts(payload)
        : section.id === 'charges' ? () => updateVasCharges(payload)
          : () => updateVasCashback(payload)
    run(section.id, fn, `${section.title} updated (${changes.length} change${changes.length > 1 ? 's' : ''}).`, () => {
      setDrafts(d => ({ ...d, [section.id]: {} }))
      setReview(null)
    })
  }

  const resetSection = (section: Section) => setDrafts(d => ({ ...d, [section.id]: {} }))

  const saveEntry = (key: string, kind: VasKeyKind) => {
    const stored = toStoredValue(kind, entryValue)
    if ('error' in stored) {
      setMessage({ ok: false, text: `${vasKeyLabel(key)}: ${stored.error}` })
      return
    }
    run(`entry:${key}`, () => setVasEntry(key, stored.value), `${vasKeyLabel(key)} set to ${formatVasValue(kind, stored.value)}.`, () => setEditingKey(null))
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        {section === 'accounts'
          ? <FormSkeleton fields={5} columns={4} />
          : <><FormSkeleton fields={7} columns={4} /><FormSkeleton fields={4} columns={4} /></>}
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

  const term = keyFilter.trim().toLowerCase()
  const entries = Object.entries(map)
    .filter(([key]) => section === 'accounts' ? key.startsWith('vas.account.') : !key.startsWith('vas.account.'))
    .map(([key, value]) => ({ key, value, kind: vasKeyKind(key, value), label: vasKeyLabel(key) }))
    .filter(e => !term || `${e.key} ${e.label}`.toLowerCase().includes(term))
    .sort((a, b) => a.label.localeCompare(b.label))
  // Keys the forms above don't cover, so the collapsed header can say why it is worth opening.
  const formKeys = new Set(SECTIONS.flatMap(s => s.fields.map(f => f.key)))
  const extraCount = Object.keys(map).filter(key =>
    !formKeys.has(key) && (section === 'accounts' ? key.startsWith('vas.account.') : !key.startsWith('vas.account.'))).length
  const groups = VAS_KEY_GROUPS
    .map(group => ({ ...group, items: entries.filter(e => e.kind === group.id) }))
    .filter(group => group.items.length > 0)

  const visibleSections = SECTIONS.filter(item => section === 'accounts' ? item.id === 'accounts' : item.id !== 'accounts')
  const pending = visibleSections.map(sec => ({ sec, count: changedFields(sec).length })).filter(p => p.count > 0)

  return (
    <div className={`space-y-4 ${pending.length ? 'pb-24 sm:pb-0' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base sm:text-sm font-bold text-slate-800">{section === 'accounts' ? 'VAS Settlement Accounts' : 'VAS Configuration'}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {section === 'accounts' ? 'Where value-added service money is posted.' : 'What customers pay and earn back on airtime, data, bills and identity checks.'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch} disabled={!!saving || loading} aria-label="Refresh" className="shrink-0">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>Saved changes apply to live customer transactions straight away. You will see a summary to confirm before anything is saved.</span>
      </div>

      {message && (
        <div
          role="status"
          className={`flex items-start gap-2 text-xs font-semibold rounded-xl px-3 py-2.5 border ${message.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}
        >
          {message.ok ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100 cursor-pointer" aria-label="Dismiss"><X size={13} /></button>
        </div>
      )}

      {visibleSections.map(section => {
        const draft = drafts[section.id]
        const changedCount = changedFields(section).length
        const busy = saving === section.id
        return (
          <div key={section.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-start justify-between gap-4 px-4 sm:px-5 py-4 border-b border-slate-100">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">{section.icon}</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-2 flex-wrap">
                    {section.title}
                    {changedCount > 0 && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">{changedCount} unsaved</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{section.desc}</p>
                </div>
              </div>
              <div className="hidden sm:flex shrink-0 items-center gap-2">
                {changedCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => resetSection(section)} disabled={busy}>Reset</Button>
                )}
                <Button size="sm" onClick={() => reviewSection(section)} disabled={busy || changedCount === 0}>
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save changes
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-5 px-4 sm:px-5 py-5">
              {section.fields.map(field => {
                const current = currentValue(section, field)
                const value = draft[field.id] ?? current
                const changed = value.trim() !== '' && value.trim() !== current
                return (
                  <label key={field.id} className="block">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-600">{field.label}</span>
                      {changed && <span className="text-[10px] font-semibold text-amber-600">was {describe(section, current)}</span>}
                    </span>
                    <div className="relative mt-1.5">
                      {section.unit === '₦' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₦</span>}
                      <input
                        type="text"
                        inputMode={section.id === 'accounts' ? 'numeric' : 'decimal'}
                        value={value}
                        onChange={e => setDrafts(d => ({ ...d, [section.id]: { ...d[section.id], [field.id]: e.target.value } }))}
                        placeholder="Not set"
                        className={`${inputClass} ${section.unit === '₦' ? 'pl-7' : ''} ${section.unit === '%' ? 'pr-8' : ''} ${changed ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-200' : ''}`}
                      />
                      {section.unit === '%' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>}
                    </div>
                    <span className="block text-[11px] text-slate-400 mt-1">{fieldHint(section, value)}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <button
          type="button"
          onClick={() => setKeysOpen(o => !o)}
          className="w-full flex items-start gap-3 px-4 sm:px-5 py-4 text-left cursor-pointer"
          aria-expanded={keysOpen}
        >
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
            <ListTree size={16} className="text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              {section === 'accounts' ? 'All settlement account settings' : 'All VAS settings'}
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">Advanced</span>
              {extraCount > 0 && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                  {extraCount} not in the forms above
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
              {section === 'accounts'
                ? 'Every account setting the server holds, including any not shown in the form above. Edit one at a time.'
                : 'Every VAS setting the server holds, including ones not shown in the forms above, such as switching a service on or off. Edit one at a time; enter cashback as a normal percentage and it is converted for you.'}
            </p>
          </div>
          <ChevronDown size={16} className={`text-slate-400 mt-1 transition-transform ${keysOpen ? 'rotate-180' : ''}`} />
        </button>

        {keysOpen && (
          <div className="border-t border-slate-100">
            <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
              <div className="relative flex-1 sm:flex-none">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={keyFilter}
                  onChange={e => setKeyFilter(e.target.value)}
                  placeholder="Find a setting…"
                  className="pl-9 pr-3 py-2 sm:py-1.5 text-base sm:text-sm bg-white border border-slate-200 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400"
                />
              </div>
              <span className="text-xs text-slate-400">{entries.length} setting{entries.length === 1 ? '' : 's'}</span>
            </div>

            {groups.length === 0 ? (
              <p className="px-5 pb-6 text-xs text-slate-400">{term ? 'No settings match your search.' : 'The server returned no settings for this section.'}</p>
            ) : (
              <div className="pb-2">
                {groups.map(group => (
                  <div key={group.id}>
                    <div className="px-5 pt-4 pb-1.5 flex items-baseline gap-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group.title}</p>
                      <p className="text-[11px] text-slate-400">{group.hint}</p>
                    </div>
                    <ul className="divide-y divide-slate-50">
                      {group.items.map(({ key, value, kind, label }) => {
                        const editing = editingKey === key
                        const busy = saving === `entry:${key}`
                        const display = formatVasValue(kind, value)
                        return (
                          <li key={key} className={`px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 ${editing ? 'bg-slate-50' : 'hover:bg-slate-50/60'}`}>
                            <div className="min-w-0 flex-1 basis-full sm:basis-56">
                              <p className="text-sm font-semibold text-slate-700">{label}</p>
                              <p className="font-mono text-[11px] text-slate-400 truncate" title="Key stored on the server">{key}</p>
                            </div>

                            <div className="flex-1 sm:flex-none sm:basis-56 flex items-center sm:justify-end gap-2">
                              {editing ? (
                                <KeyEditor
                                  kind={kind}
                                  value={entryValue}
                                  onChange={setEntryValue}
                                  onSubmit={() => saveEntry(key, kind)}
                                  onCancel={() => setEditingKey(null)}
                                />
                              ) : kind === 'switch' && display !== 'Not set' ? (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${display === 'On' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${display === 'On' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                  {display}
                                </span>
                              ) : (
                                <span className={`text-sm ${display === 'Not set' ? 'text-slate-400' : 'font-semibold text-slate-800'}`}>{display}</span>
                              )}
                            </div>

                            <div className="sm:w-28 flex justify-end gap-1.5">
                              {editing ? (
                                <>
                                  <Button size="sm" onClick={() => saveEntry(key, kind)} disabled={busy}>
                                    {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setEditingKey(null)} disabled={busy} aria-label="Cancel">
                                    <X size={13} />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => { setEditingKey(key); setEntryValue(editorValue(kind, value)) }}
                                  disabled={!!saving}
                                >
                                  <Pencil size={13} /> Edit
                                </Button>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] px-4 py-3 space-y-2">
          {pending.map(({ sec, count }) => (
            <div key={sec.id} className="flex items-center gap-2">
              <p className="flex-1 min-w-0 text-xs text-slate-600 truncate">
                <span className="font-bold text-slate-800">{sec.title}</span> · {count} unsaved
              </p>
              <Button variant="ghost" size="sm" onClick={() => resetSection(sec)} disabled={saving === sec.id}>Reset</Button>
              <Button size="sm" onClick={() => reviewSection(sec)} disabled={saving === sec.id}>
                {saving === sec.id ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
              </Button>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!review} onClose={() => setReview(null)} title={`Confirm ${review?.section.title.toLowerCase() ?? ''} changes`} width="max-w-md">
        {review && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">These values take effect for customers as soon as you confirm.</p>
            <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
              {review.changes.map(c => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">{c.label}</span>
                  <span className="flex items-center gap-2 text-sm shrink-0">
                    <span className="text-slate-400 line-through">{c.from}</span>
                    <ArrowRight size={13} className="text-slate-300" />
                    <span className="font-bold text-slate-800">{c.to}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button variant="secondary" className="sm:flex-1 justify-center" onClick={() => setReview(null)} disabled={saving === review.section.id}>
                Keep editing
              </Button>
              <Button className="sm:flex-1 justify-center" onClick={confirmReview} disabled={saving === review.section.id}>
                {saving === review.section.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Confirm and save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function KeyEditor({ kind, value, onChange, onSubmit, onCancel }: {
  kind: VasKeyKind
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  if (kind === 'switch') {
    return (
      <div className="inline-flex gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
        {(['true', 'false'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 py-1 rounded-md text-xs font-bold cursor-pointer ${value === v ? (v === 'true' ? 'bg-emerald-600 text-white' : 'bg-slate-600 text-white') : 'text-slate-500 hover:bg-slate-50'}`}
          >
            {v === 'true' ? 'On' : 'Off'}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className="relative w-full sm:w-40">
      {kind === 'money' && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">₦</span>}
      <input
        autoFocus
        inputMode={kind === 'text' ? 'text' : kind === 'account' ? 'numeric' : 'decimal'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel() }}
        className={`${inputClass} bg-white ${kind === 'money' ? 'pl-6' : ''} ${kind === 'percent' ? 'pr-7' : ''}`}
      />
      {kind === 'percent' && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>}
    </div>
  )
}
