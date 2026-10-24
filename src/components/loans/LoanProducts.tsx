import { useState } from 'react'
import { ListChecks, Loader2, Pencil, Plus, Power, PowerOff, RefreshCw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { RequirementsEditor } from '../ui/RequirementsEditor'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import {
  getLoanProducts, createLoanProduct, updateLoanProduct, activateLoanProduct, deactivateLoanProduct,
  getLoanProductRequirements, updateLoanProductRequirements,
} from '../../api'
import {
  EMPLOYMENT_TYPES, EMPTY_LOAN_PRODUCT_FORM, employmentLabel, loanProductPayload, loanProductToForm, readLoanProducts, repaymentEstimate,
  type LoanProductForm, type LoanProductRecord,
} from '../../api/loans'

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'
const naira = (n: number | null) => (n === null ? '—' : `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`)
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

export function LoanProducts() {
  const { user } = useAuth()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const { data, loading, error, refetch } = useApi(async () => readLoanProducts((await getLoanProducts()).data), [])
  const products = data ?? []

  const [editing, setEditing] = useState<LoanProductRecord | 'new' | null>(null)
  const [form, setForm] = useState<LoanProductForm>(EMPTY_LOAN_PRODUCT_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<LoanProductRecord | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)
  const [reqProduct, setReqProduct] = useState<LoanProductRecord | null>(null)

  const set = <K extends keyof LoanProductForm>(k: K, v: LoanProductForm[K]) => setForm(f => ({ ...f, [k]: v }))

  function openForm(p: LoanProductRecord | 'new') {
    setEditing(p)
    setForm(p === 'new' ? EMPTY_LOAN_PRODUCT_FORM : loanProductToForm(p))
    setFormError(null)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !editing) return
    const built = loanProductPayload(form, user.adminId)
    if ('error' in built) { setFormError(built.error); return }
    setSaving(true)
    setFormError(null)
    try {
      if (editing === 'new') await createLoanProduct(built.payload)
      else await updateLoanProduct(editing.id, built.payload)
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
      if (toggling.active) await deactivateLoanProduct(toggling.id, user.adminId)
      else await activateLoanProduct(toggling.id, user.adminId)
      setNotice({ ok: true, text: `${toggling.name} ${toggling.active ? 'deactivated' : 'activated'}.` })
      refetch()
    } catch (err) {
      setNotice({ ok: false, text: errText(err, 'The status could not be changed.') })
    } finally {
      setToggling(null)
      setToggleBusy(false)
    }
  }

  // Example shown in the form so the rate's effect is obvious.
  const exampleAmount = Number(form.maxAmount) > 0 ? Math.min(100_000, Number(form.maxAmount)) : 100_000
  const exampleTenure = Number(form.maxTenureMonths) > 0 ? Math.min(6, Number(form.maxTenureMonths)) : 6
  const example = form.monthlyRatePercent.trim() !== '' && Number.isFinite(Number(form.monthlyRatePercent))
    ? repaymentEstimate(exampleAmount, Number(form.monthlyRatePercent), exampleTenure) : null

  const columns: ColumnDef<LoanProductRecord>[] = [
    {
      header: 'Product',
      accessorKey: 'name',
      cell: p => (
        <div className="min-w-[180px] max-w-[240px]">
          <p className="text-sm font-semibold text-slate-700">{p.name}</p>
          <p className="text-[11px] text-slate-400 font-mono">{p.code}</p>
          {p.description && <p className="text-[11px] text-slate-400 truncate" title={p.description}>{p.description}</p>}
        </div>
      ),
    },
    {
      header: 'Amount',
      accessorKey: 'maxAmount',
      cell: p => (
        <div className="text-xs whitespace-nowrap">
          <p className="text-slate-700 font-semibold">{naira(p.minAmount)} – {naira(p.maxAmount)}</p>
          {!!p.maxPreApprovedAmount && <p className="text-slate-400">Pre-approved up to {naira(p.maxPreApprovedAmount)}</p>}
        </div>
      ),
    },
    {
      header: 'Pricing',
      accessorKey: 'monthlyRatePercent',
      cell: p => (
        <div className="text-xs whitespace-nowrap">
          <p className="text-slate-700 font-semibold">{p.monthlyRatePercent ?? '—'}% / month</p>
          <p className="text-slate-400">{p.minTenureMonths ?? '?'}–{p.maxTenureMonths ?? '?'} months</p>
        </div>
      ),
    },
    {
      header: 'Eligibility',
      sortable: false,
      cell: p => (
        <div className="text-[11px] text-slate-500 space-y-0.5 min-w-[160px]">
          <p>Income ≥ {p.minMonthlyIncome ? `${naira(p.minMonthlyIncome)}/mo` : 'any'}</p>
          <p>Account age ≥ {p.minAccountAgeDays ? `${p.minAccountAgeDays} days` : 'any'}</p>
          <p className="truncate max-w-[200px]" title={p.employmentTypes.map(employmentLabel).join(', ')}>
            {p.employmentTypes.length ? p.employmentTypes.map(employmentLabel).join(', ') : 'Any employment'}
          </p>
        </div>
      ),
    },
    { header: 'Status', accessorKey: 'active', cell: p => <Badge label={p.active ? 'Active' : 'Inactive'} variant={p.active ? 'green' : 'gray'} /> },
    {
      header: 'Actions',
      sortable: false,
      cell: p => (
        <div className="flex gap-1">
          <IconButton title="Edit product" onClick={() => openForm(p)}><Pencil size={14} /></IconButton>
          <IconButton title="Application requirements" onClick={() => setReqProduct(p)}><ListChecks size={14} /></IconButton>
          <IconButton title={p.active ? 'Deactivate' : 'Activate'} onClick={() => setToggling(p)} tone={p.active ? 'amber' : 'green'}>
            {p.active ? <PowerOff size={14} /> : <Power size={14} />}
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Loan products</h3>
          <p className="text-xs text-slate-500 mt-0.5">The loans customers can apply for in the app, with their pricing and eligibility rules.</p>
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
        <DataTable<LoanProductRecord>
          columns={columns}
          data={products}
          loading={loading && !data}
          loadingRows={4}
          searchPlaceholder="Search loan products…"
          searchFields={['name', 'code', 'description']}
          emptyMessage="No loan products yet. Create one to let customers apply."
        />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New loan product' : `Edit ${editing?.name ?? ''}`} width="max-w-2xl">
        <form onSubmit={save} className="space-y-5">
          <Section title="Product">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Product name" required><input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Personal Loan" /></Field>
              <Field label="Code" required hint={editing === 'new' ? 'Used by the app; capitals, digits and _ only.' : 'The code cannot change after creation.'}>
                <input className={`${inputCls} font-mono uppercase`} value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="PERSONAL_001" disabled={editing !== 'new'} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description" hint="Shown to customers when they choose a loan.">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Amount, pricing and tenure">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Money label="Minimum amount" value={form.minAmount} onChange={v => set('minAmount', v)} required />
              <Money label="Maximum amount" value={form.maxAmount} onChange={v => set('maxAmount', v)} required />
              <Field label="Monthly interest rate" required>
                <div className="relative"><input className={`${inputCls} pr-8`} inputMode="decimal" value={form.monthlyRatePercent} onChange={e => set('monthlyRatePercent', e.target.value)} placeholder="4" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span></div>
              </Field>
              <Field label="Minimum tenure (months)" required><input className={inputCls} inputMode="numeric" value={form.minTenureMonths} onChange={e => set('minTenureMonths', e.target.value)} /></Field>
              <Field label="Maximum tenure (months)" required><input className={inputCls} inputMode="numeric" value={form.maxTenureMonths} onChange={e => set('maxTenureMonths', e.target.value)} /></Field>
              <Money label="Pre-approved up to" value={form.maxPreApprovedAmount} onChange={v => set('maxPreApprovedAmount', v)} hint="Above this needs closer review." />
            </div>
            {example && (
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                Example: {naira(exampleAmount)} over {exampleTenure} months repays <strong>{naira(example.total)}</strong> ({naira(example.monthly)}/month, {naira(example.interest)} interest).
              </p>
            )}
          </Section>

          <Section title="Who can apply">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Money label="Minimum monthly income" value={form.minMonthlyIncome} onChange={v => set('minMonthlyIncome', v)} />
              <Money label="Minimum annual income" value={form.minAnnualIncome} onChange={v => set('minAnnualIncome', v)} />
              <Field label="Minimum account age (days)"><input className={inputCls} inputMode="numeric" value={form.minAccountAgeDays} onChange={e => set('minAccountAgeDays', e.target.value)} /></Field>
            </div>
            <Field label="Employment types allowed" hint="Leave all unticked to allow any.">
              <div className="flex flex-wrap gap-2">
                {[...new Set([...Object.keys(EMPLOYMENT_TYPES), ...form.employmentTypes])].map(t => {
                  const on = form.employmentTypes.includes(t)
                  return (
                    <label key={t} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer ${on ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={e => set('employmentTypes', e.target.checked ? [...form.employmentTypes, t] : form.employmentTypes.filter(x => x !== t))} />
                      {employmentLabel(t)}
                    </label>
                  )
                })}
              </div>
            </Field>
          </Section>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="accent-slate-700" checked={form.active} onChange={e => set('active', e.target.checked)} />
            Active: customers can apply for this loan
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

      <Modal open={!!toggling} onClose={() => setToggling(null)} title={toggling?.active ? 'Deactivate loan product' : 'Activate loan product'} width="max-w-sm">
        {toggling && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {toggling.active
                ? <>Customers will no longer be able to apply for <strong>{toggling.name}</strong>. Existing loans are not affected.</>
                : <>Customers will be able to apply for <strong>{toggling.name}</strong> in the app straight away.</>}
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

      <RequirementsEditor
        target={reqProduct}
        intro="Extra information or documents customers must provide when applying for this loan, in the order shown."
        emptyText="No extra requirements. Customers only provide the standard application details."
        load={getLoanProductRequirements}
        save={(id, requirements) => updateLoanProductRequirements(id, requirements, user!.adminId)}
        onClose={() => setReqProduct(null)}
        onSaved={text => setNotice({ ok: true, text })}
      />
    </div>
  )
}

function IconButton({ title, onClick, tone, children }: { title: string; onClick: () => void; tone?: 'amber' | 'green'; children: React.ReactNode }) {
  const hover = tone === 'amber' ? 'hover:text-amber-600 hover:bg-amber-50' : tone === 'green' ? 'hover:text-emerald-600 hover:bg-emerald-50' : 'hover:text-slate-700 hover:bg-slate-100'
  return <button type="button" onClick={onClick} title={title} aria-label={title} className={`p-1.5 rounded-lg text-slate-400 cursor-pointer ${hover}`}>{children}</button>
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
