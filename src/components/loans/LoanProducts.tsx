import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import {
  getLoanProducts, createLoanProduct, updateLoanProduct,
  activateLoanProduct, deactivateLoanProduct,
  getLoanProductRequirements, updateLoanProductRequirements
} from '../../api'
import type { LoanProduct, LoanProductPayload } from '../../api/types'

const fmt = (amount: number | undefined | null) =>
  amount == null ? '—' : `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

const EMPTY: LoanProductPayload = {
  code: '', name: '', description: '', minAmount: 0, maxAmount: 0,
  monthlyRatePercent: 0, minTenureMonths: 1, maxTenureMonths: 12,
  maxPreApprovedAmount: 0, minMonthlyIncome: 0, minAnnualIncome: 0,
  minAccountAgeDays: 0, adminId: '', allowedEmploymentTypes: '', active: true,
}

export function LoanProducts() {
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LoanProduct | null>(null)
  const [form, setForm] = useState<LoanProductPayload>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [reqProduct, setReqProduct] = useState<LoanProduct | null>(null)
  const [reqs, setReqs] = useState<any[]>([])

  const products = useApi<LoanProduct[]>(async () => {
    const res = await getLoanProducts()
    return res.data
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY, adminId: user?.adminId ?? '' })
    setSaveError('')
    setModalOpen(true)
  }

  const openEdit = (p: LoanProduct) => {
    setEditing(p)
    setForm({
      code: p.code ?? '',
      name: p.name,
      description: p.description ?? '',
      minAmount: p.minAmount ?? 0,
      maxAmount: p.maxAmount,
      monthlyRatePercent: p.monthlyRatePercent ?? 0,
      minTenureMonths: p.minTenureMonths ?? 1,
      maxTenureMonths: p.maxTenureMonths ?? 12,
      maxPreApprovedAmount: 0,
      minMonthlyIncome: 0,
      minAnnualIncome: 0,
      minAccountAgeDays: 0,
      adminId: user?.adminId ?? '',
      allowedEmploymentTypes: '',
      active: true,
    })
    setSaveError('')
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSaveError('')
    try {
      const payload = { ...form, adminId: user.adminId }
      if (editing) {
        await updateLoanProduct(editing.id, payload)
      } else {
        await createLoanProduct(payload)
      }
      setModalOpen(false)
      products.refetch()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (p: LoanProduct) => {
    if (!user) return
    try {
      const isActive = p.active ?? p.status === 'ACTIVE'
      if (isActive) {
        await deactivateLoanProduct(p.id, user.adminId)
      } else {
        await activateLoanProduct(p.id, user.adminId)
      }
      products.refetch()
    } catch {
      /* silently ignore */
    }
  }

  const openReqs = async (p: LoanProduct) => {
    try {
      setReqProduct(p)
      const res = await getLoanProductRequirements(p.id)
      setReqs(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setReqs([])
    }
  }

  const saveReqs = async () => {
    if (!reqProduct) return
    try {
      await updateLoanProductRequirements(reqProduct.id, reqs)
      setReqProduct(null)
      alert('Requirements updated')
    } catch (err) {
      alert('Failed to update')
    }
  }

  const addReq = () => setReqs([...reqs, { id: crypto.randomUUID(), name: '', type: 'STRING', required: true }])
  const updateReq = (i: number, k: string, v: any) => {
    const next = [...reqs]
    next[i] = { ...next[i], [k]: v }
    setReqs(next)
  }
  const removeReq = (i: number) => setReqs(reqs.filter((_, idx) => idx !== i))

  const set = (k: keyof LoanProductPayload, v: string | number | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const fieldClass = 'w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700'

  const columns: ColumnDef<LoanProduct>[] = [
    {
      header: 'Code',
      accessorKey: 'code',
      cell: (p) => <span className="text-xs font-mono text-slate-500">{p.code ?? '—'}</span>,
    },
    {
      header: 'Name',
      accessorKey: 'name',
      cell: (p) => (
        <>
          <p className="text-sm font-semibold text-slate-700">{p.name}</p>
          {p.description && <p className="text-xs text-slate-400 truncate max-w-[160px]">{p.description}</p>}
        </>
      ),
    },
    {
      header: 'Rate / mo',
      accessorKey: 'monthlyRatePercent',
      cell: (p) => <span className="text-sm font-semibold text-slate-700">{p.monthlyRatePercent ?? p.interestRate ?? '—'}%</span>,
    },
    {
      header: 'Min Amount',
      accessorKey: 'minAmount',
      cell: (p) => <span className="text-sm text-slate-600">{p.minAmount ? fmt(p.minAmount) : '—'}</span>,
    },
    {
      header: 'Max Amount',
      accessorKey: 'maxAmount',
      cell: (p) => <span className="text-sm text-slate-600">{fmt(p.maxAmount)}</span>,
    },
    {
      header: 'Tenure',
      sortable: false,
      cell: (p) => <span className="text-xs text-slate-500">{p.minTenureMonths ?? '?'}–{p.maxTenureMonths ?? '?'} mo</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (p) => {
        const isActive = p.active ?? p.status === 'ACTIVE'
        return <Badge label={isActive ? 'Active' : 'Inactive'} variant={isActive ? 'green' : 'gray'} />
      },
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (p) => {
        const isActive = p.active ?? p.status === 'ACTIVE'
        return (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil size={12} /></Button>
            <Button size="sm" variant="ghost" onClick={() => openReqs(p)}>Reqs</Button>
            <Button size="sm" variant={isActive ? 'danger' : 'success'} onClick={() => handleToggle(p)}>
              {isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{products.data?.length ?? 0} products</p>
        <Button onClick={openCreate}><Plus size={14} /> New Product</Button>
      </div>

      {products.loading ? (
        <p className="text-sm text-slate-400 py-12 text-center">Loading…</p>
      ) : products.error ? (
        <p className="text-sm text-red-500 py-12 text-center">{products.error}</p>
      ) : (
        <DataTable<LoanProduct>
          columns={columns}
          data={products.data ?? []}
          searchPlaceholder="Search products…"
          emptyMessage="No loan products yet."
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Loan Product' : 'New Loan Product'} width="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Code</label>
              <input value={form.code} onChange={e => set('code', e.target.value)} className={fieldClass} placeholder="e.g. PERSONAL_LOAN" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={fieldClass} placeholder="Product name" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={`${fieldClass} resize-none`} placeholder="Brief description" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Min Amount (₦)</label>
              <input type="number" value={form.minAmount} onChange={e => set('minAmount', +e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Max Amount (₦)</label>
              <input type="number" value={form.maxAmount} onChange={e => set('maxAmount', +e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Monthly Rate %</label>
              <input type="number" step="0.01" value={form.monthlyRatePercent} onChange={e => set('monthlyRatePercent', +e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Min Tenure (months)</label>
              <input type="number" value={form.minTenureMonths} onChange={e => set('minTenureMonths', +e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Max Tenure (months)</label>
              <input type="number" value={form.maxTenureMonths} onChange={e => set('maxTenureMonths', +e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Min Monthly Income (₦)</label>
              <input type="number" value={form.minMonthlyIncome} onChange={e => set('minMonthlyIncome', +e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Min Account Age (days)</label>
              <input type="number" value={form.minAccountAgeDays} onChange={e => set('minAccountAgeDays', +e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Max Pre Approved Amount (₦)</label>
              <input type="number" value={form.maxPreApprovedAmount} onChange={e => set('maxPreApprovedAmount', +e.target.value)} className={fieldClass} />
            </div> 
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Allowed Employment Types</label>
              <select
                multiple
                value={form.allowedEmploymentTypes ? form.allowedEmploymentTypes.split(',') : []}
                onChange={e => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value)
                  set('allowedEmploymentTypes', selected.join(','))
                }}
                className={fieldClass}
                style={{ height: '80px' }}
              >
                <option value="EMPLOYED">Employed</option>
                <option value="SELF_EMPLOYED">Self Employed</option>
                <option value="CONTRACT">Contract</option>
                <option value="UNEMPLOYED">Unemployed</option>
                <option value="STUDENT">Student</option>
              </select>
              <p className="text-[9px] text-slate-400 mt-1">Hold Cmd/Ctrl to select multiple</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-slate-700" />
            <label className="text-sm font-semibold text-slate-700">Active</label>
          </div>

          {saveError && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{saveError}</p>
          )}

          <div className="h-px bg-slate-100" />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!reqProduct} onClose={() => setReqProduct(null)} title="Product Requirements" width="max-w-3xl">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Configure requirements for {reqProduct?.name}</p>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {reqs.map((req, i) => (
              <div key={req.id || i} className="flex gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
                <input className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-300" placeholder="Field name (e.g. BVN)" value={req.name || ''} onChange={e => updateReq(i, 'name', e.target.value)} />
                <select className="w-32 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-300" value={req.type || 'STRING'} onChange={e => updateReq(i, 'type', e.target.value)}>
                  <option value="STRING">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="FILE">File</option>
                  <option value="BOOLEAN">Boolean</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 px-2 font-semibold">
                  <input type="checkbox" className="w-3.5 h-3.5 accent-slate-700" checked={req.required ?? true} onChange={e => updateReq(i, 'required', e.target.checked)} />
                  Required
                </label>
                <Button size="sm" variant="danger" onClick={() => removeReq(i)}>Remove</Button>
              </div>
            ))}
            {reqs.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No requirements configured yet.</p>}
          </div>
          <div className="flex gap-3">
            <Button size="sm" variant="secondary" onClick={addReq}><Plus size={14} /> Add Requirement</Button>
          </div>
          <div className="h-px bg-slate-100" />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setReqProduct(null)}>Cancel</Button>
            <Button className="flex-1" onClick={saveReqs}>Save Requirements</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
