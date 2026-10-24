import { useState } from 'react'
import { Loader2, Lock, Pencil, Plus, Power, PowerOff, RefreshCw, Unlock } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import {
  getSavingsProducts, createSavingsProduct, updateSavingsProduct, activateSavingsProduct, deactivateSavingsProduct,
} from '../../api'
import {
  CALCULATION, COMPOUNDING, EMPTY_SAVINGS_FORM, LOCKIN_UNITS, POSTING, interestEstimate, lockinLabel, optionLabel,
  readSavingsProducts, savingsProductPayload, savingsProductToForm, type SavingsProductForm, type SavingsProductRecord,
} from '../../api/savings'

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'
const naira = (n: number | null) => (n === null ? '—' : `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`)
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)
const days = (n: number | null) => (n === null ? 'no limit' : n % 365 === 0 ? `${n / 365} yr` : n % 30 === 0 && n >= 60 ? `${n / 30} mo` : `${n} day${n === 1 ? '' : 's'}`)

export function SavingsProducts() {
  const { user } = useAuth()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const { data, loading, error, refetch } = useApi(async () => readSavingsProducts((await getSavingsProducts()).data), [])
  const products = data ?? []

  const [editing, setEditing] = useState<SavingsProductRecord | 'new' | null>(null)
  const [form, setForm] = useState<SavingsProductForm>(EMPTY_SAVINGS_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<SavingsProductRecord | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)

  const set = <K extends keyof SavingsProductForm>(k: K, v: SavingsProductForm[K]) => setForm(f => ({ ...f, [k]: v }))

  function openForm(p: SavingsProductRecord | 'new') {
    setEditing(p)
    setForm(p === 'new' ? EMPTY_SAVINGS_FORM : savingsProductToForm(p))
    setFormError(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !editing) return
    const built = savingsProductPayload(form, user.adminId, editing === 'new' ? null : editing)
    if ('error' in built) { setFormError(built.error); return }
    setSaving(true)
    setFormError(null)
    try {
      if (editing === 'new') await createSavingsProduct(built.payload)
      else await updateSavingsProduct(editing.id, built.payload)
      setNotice({ ok: true, text: `${built.payload.name} ${editing === 'new' ? 'created' : 'updated'}.` })
      setEditing(null)
      refetch()
    } catch (err) {
      setFormError(errText(err, 'The product could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmToggle() {
    if (!toggling || !user) return
    setToggleBusy(true)
    try {
      if (toggling.active) await deactivateSavingsProduct(toggling.id, user.adminId)
      else await activateSavingsProduct(toggling.id, user.adminId)
      setNotice({ ok: true, text: `${toggling.name} ${toggling.active ? 'deactivated' : 'activated'}.` })
      refetch()
    } catch (err) {
      setNotice({ ok: false, text: errText(err, 'The status could not be changed.') })
    } finally {
      setToggling(null)
      setToggleBusy(false)
    }
  }

  const rate = Number(form.annualRatePercent)
  const example = form.annualRatePercent.trim() !== '' && Number.isFinite(rate) ? interestEstimate(100_000, rate, 365, form.compoundingPeriod) : null

  const columns: ColumnDef<SavingsProductRecord>[] = [
    {
      header: 'Product',
      accessorKey: 'name',
      cell: p => (
        <div className="min-w-[180px] max-w-[260px]">
          <p className="text-sm font-semibold text-slate-700">{p.name}</p>
          <p className="text-[11px] text-slate-400 font-mono">{p.code}</p>
          {p.description && <p className="text-[11px] text-slate-400 truncate" title={p.description}>{p.description}</p>}
        </div>
      ),
    },
    {
      header: 'Interest',
      accessorKey: 'annualRatePercent',
      cell: p => (
        <div className="whitespace-nowrap text-xs">
          <p className="text-sm font-bold text-slate-800">{p.annualRatePercent ?? '—'}% <span className="text-xs font-normal text-slate-400">p.a.</span></p>
          <p className="text-slate-400">Compounds {optionLabel(COMPOUNDING, p.compoundingPeriod).toLowerCase()}</p>
        </div>
      ),
    },
    {
      header: 'Deposits',
      accessorKey: 'minAmount',
      cell: p => (
        <div className="whitespace-nowrap text-xs">
          <p className="text-slate-700">From {naira(p.minAmount)}</p>
          <p className="text-slate-400">{p.maxAmount === null ? 'No maximum' : `Up to ${naira(p.maxAmount)}`}</p>
        </div>
      ),
    },
    {
      header: 'Duration',
      accessorKey: 'minDurationDays',
      cell: p => <span className="text-xs text-slate-600 whitespace-nowrap">{days(p.minDurationDays)} – {days(p.maxDurationDays)}</span>,
    },
    {
      header: 'Withdrawals',
      sortable: false,
      cell: p => (
        <div className="text-xs min-w-[150px]">
          <p className={`inline-flex items-center gap-1 font-semibold ${p.allowPartialWithdrawal ? 'text-emerald-700' : 'text-slate-600'}`}>
            {p.allowPartialWithdrawal ? <Unlock size={11} /> : <Lock size={11} />}
            {p.allowPartialWithdrawal ? 'Partial withdrawals allowed' : 'No partial withdrawals'}
          </p>
          <p className="text-slate-400">Lock-in: {lockinLabel(p)}</p>
        </div>
      ),
    },
    { header: 'Status', accessorKey: 'active', cell: p => <Badge label={p.active ? 'Active' : 'Inactive'} variant={p.active ? 'green' : 'gray'} /> },
    {
      header: 'Actions',
      sortable: false,
      cell: p => (
        <div className="flex gap-1">
          <button onClick={() => openForm(p)} title="Edit product" aria-label="Edit product" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"><Pencil size={14} /></button>
          <button onClick={() => setToggling(p)} title={p.active ? 'Deactivate' : 'Activate'} aria-label={p.active ? 'Deactivate' : 'Activate'}
            className={`p-1.5 rounded-lg text-slate-400 cursor-pointer ${p.active ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}`}>
            {p.active ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Savings products</h3>
          <p className="text-xs text-slate-500 mt-0.5">The savings plans customers can open in the app: interest, deposit limits and withdrawal rules.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer" title="Refresh"><RefreshCw size={13} /></button>
          <Button size="sm" onClick={() => openForm('new')}><Plus size={14} /> New product</Button>
        </div>
      </div>

      {notice && (
        <div className={`text-xs font-semibold rounded-xl px-4 py-3 border flex justify-between gap-4 ${notice.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 cursor-pointer">Dismiss</button>
        </div>
      )}

      {error && !loading ? (
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-red-500 mb-3">{error}</p>
          <Button size="sm" variant="secondary" onClick={refetch}>Retry</Button>
        </div>
      ) : (
        <DataTable<SavingsProductRecord>
          columns={columns}
          data={products}
          loading={loading && !data}
          loadingRows={5}
          searchPlaceholder="Search savings products…"
          searchFields={['name', 'code', 'description']}
          emptyMessage="No savings products yet. Create one to let customers save."
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New savings product' : `Edit ${editing?.name ?? ''}`} width="max-w-2xl">
        <form onSubmit={save} className="space-y-5">
          <Section title="Product">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Product name" required><input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. M-Purse" /></Field>
              <Field label="Code" required hint={editing === 'new' ? 'Used by the app; capitals, digits, _ or -.' : 'The code cannot change after creation.'}>
                <input className={`${inputCls} font-mono uppercase`} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="M_PURSE" disabled={editing !== 'new'} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description" hint="Shown to customers when they choose a plan.">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Interest">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Annual rate" required>
                <div className="relative"><input className={`${inputCls} pr-12`} inputMode="decimal" value={form.annualRatePercent} onChange={e => set('annualRatePercent', e.target.value)} placeholder="10" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">% p.a.</span></div>
              </Field>
              <Field label="Compounds">
                <select className={inputCls} value={form.compoundingPeriod} onChange={e => set('compoundingPeriod', e.target.value)}>
                  {Object.entries({ ...COMPOUNDING, ...(COMPOUNDING[form.compoundingPeriod] ? {} : { [form.compoundingPeriod]: optionLabel(COMPOUNDING, form.compoundingPeriod) }) }).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Interest paid">
                <select className={inputCls} value={form.interestPostingPeriodType} onChange={e => set('interestPostingPeriodType', e.target.value)}>
                  {Object.entries({ ...POSTING, ...(POSTING[form.interestPostingPeriodType] ? {} : { [form.interestPostingPeriodType]: optionLabel(POSTING, form.interestPostingPeriodType) }) }).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Calculated on">
                <select className={inputCls} value={form.interestCalculationType} onChange={e => set('interestCalculationType', e.target.value)}>
                  {Object.entries({ ...CALCULATION, ...(CALCULATION[form.interestCalculationType] ? {} : { [form.interestCalculationType]: optionLabel(CALCULATION, form.interestCalculationType) }) }).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Money label="Minimum balance to earn interest" value={form.minimumBalanceForInterestCalculation} onChange={v => set('minimumBalanceForInterestCalculation', v)} />
            </div>
            {example !== null && (
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                Example: ₦100,000 saved for a year earns about <strong>{naira(example)}</strong> interest.
              </p>
            )}
          </Section>

          <Section title="Deposits and duration">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Money label="Minimum deposit" value={form.minAmount} onChange={v => set('minAmount', v)} required />
              <Money label="Maximum deposit" value={form.maxAmount} onChange={v => set('maxAmount', v)} hint="Leave empty for no maximum." />
              <Field label="Minimum duration (days)" required><input className={inputCls} inputMode="numeric" value={form.minDurationDays} onChange={e => set('minDurationDays', e.target.value)} /></Field>
              <Field label="Maximum duration (days)" hint="Leave empty for no limit."><input className={inputCls} inputMode="numeric" value={form.maxDurationDays} onChange={e => set('maxDurationDays', e.target.value)} placeholder="No limit" /></Field>
            </div>
          </Section>

          <Section title="Withdrawals">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Lock-in period" hint="Savings can't be withdrawn during this time.">
                <div className="flex gap-2">
                  <input className={`${inputCls} w-24`} inputMode="numeric" value={form.lockinPeriod} onChange={e => set('lockinPeriod', e.target.value)} />
                  <select className={inputCls} value={form.lockinType} onChange={e => set('lockinType', e.target.value)}>
                    {Object.entries(LOCKIN_UNITS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              </Field>
              <Money label="Minimum balance" value={form.minimumBalance} onChange={v => set('minimumBalance', v)} hint="Must stay in the plan." />
              <Field label="Partial withdrawals">
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {[[true, 'Allowed'], [false, 'Not allowed']].map(([v, l]) => (
                    <button key={String(v)} type="button" onClick={() => set('allowPartialWithdrawal', v as boolean)}
                      className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${form.allowPartialWithdrawal === v ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}>
                      {l as string}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </Section>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="accent-slate-700" checked={form.active} onChange={e => set('active', e.target.checked)} />
            Active: customers can open this plan
          </label>

          {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{formError}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button type="button" variant="secondary" className="sm:flex-1 justify-center" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" className="sm:flex-1 justify-center" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />} {editing === 'new' ? 'Create product' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!toggling} onClose={() => setToggling(null)} title={toggling?.active ? 'Deactivate savings product' : 'Activate savings product'} width="max-w-sm">
        {toggling && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {toggling.active
                ? <>Customers will no longer be able to open <strong>{toggling.name}</strong>. Existing savings keep running.</>
                : <>Customers will be able to open <strong>{toggling.name}</strong> in the app straight away.</>}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button variant="secondary" className="sm:flex-1 justify-center" onClick={() => setToggling(null)}>Cancel</Button>
              <Button variant={toggling.active ? 'danger' : 'success'} className="sm:flex-1 justify-center" onClick={confirmToggle} disabled={toggleBusy}>
                {toggleBusy && <Loader2 size={14} className="animate-spin" />} {toggling.active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>{children}</div>
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </div>
  )
}

function Money({ label, value, onChange, hint, required }: { label: string; value: string; onChange: (v: string) => void; hint?: string; required?: boolean }) {
  return (
    <Field label={label} hint={hint} required={required}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₦</span>
        <input className={`${inputCls} pl-7`} inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder="0" />
      </div>
    </Field>
  )
}
