import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import {
  getSavingsProducts, createSavingsProduct, updateSavingsProduct,
  activateSavingsProduct, deactivateSavingsProduct,
} from '../../api'
import type { SavingsProduct, SavingsProductPayload } from '../../api/types'

const fmt = (amount: number | undefined | null) =>
  amount == null ? '—' : `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

const EMPTY: SavingsProductPayload = {
  code: '', name: '', description: '', minAmount: 0, maxAmount: 0,
  annualRatePercent: 0, minDurationDays: 30, maxDurationDays: 365,
  active: true, adminId: '',
}

export function SavingsProducts() {
  const { user } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SavingsProduct | null>(null)
  const [form, setForm] = useState<SavingsProductPayload>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const products = useApi<SavingsProduct[]>(async () => {
    const res = await getSavingsProducts()
    return res.data
  })

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY, adminId: user?.adminId ?? '' })
    setSaveError('')
    setModalOpen(true)
  }

  const openEdit = (p: SavingsProduct) => {
    setEditing(p)
    setForm({
      code: p.code ?? '',
      name: p.name,
      description: p.description ?? '',
      minAmount: p.minAmount ?? 0,
      maxAmount: p.maxAmount ?? 0,
      annualRatePercent: p.annualRatePercent ?? p.interestRate ?? 0,
      minDurationDays: p.minDurationDays ?? 30,
      maxDurationDays: p.maxDurationDays ?? 365,
      active: p.active ?? p.status === 'ACTIVE',
      adminId: user?.adminId ?? '',
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
        await updateSavingsProduct(editing.id, payload)
      } else {
        await createSavingsProduct(payload)
      }
      setModalOpen(false)
      products.refetch()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (p: SavingsProduct) => {
    if (!user) return
    try {
      const isActive = p.active ?? p.status === 'ACTIVE'
      if (isActive) {
        await deactivateSavingsProduct(p.id, user.adminId)
      } else {
        await activateSavingsProduct(p.id, user.adminId)
      }
      products.refetch()
    } catch {
      /* silently ignore */
    }
  }

  const set = (k: keyof SavingsProductPayload, v: string | number | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const fieldClass = 'w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700'

  const columns: ColumnDef<SavingsProduct>[] = [
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
          {p.description && <p className="text-xs text-slate-400 truncate max-w-[150px]">{p.description}</p>}
        </>
      ),
    },
    {
      header: 'Annual Rate',
      accessorKey: 'annualRatePercent',
      cell: (p) => <span className="text-sm font-semibold text-slate-700">{p.annualRatePercent ?? p.interestRate ?? '—'}%</span>,
    },
    {
      header: 'Min Amount',
      accessorKey: 'minAmount',
      cell: (p) => <span className="text-sm text-slate-600">{p.minAmount ? fmt(p.minAmount) : '—'}</span>,
    },
    {
      header: 'Max Amount',
      accessorKey: 'maxAmount',
      cell: (p) => <span className="text-sm text-slate-600">{p.maxAmount ? fmt(p.maxAmount) : '—'}</span>,
    },
    {
      header: 'Duration',
      sortable: false,
      cell: (p) => <span className="text-xs text-slate-500">{p.minDurationDays ?? '?'}–{p.maxDurationDays ?? '?'} days</span>,
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
        <DataTable<SavingsProduct>
          columns={columns}
          data={products.data ?? []}
          searchPlaceholder="Search products…"
          emptyMessage="No savings products yet."
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Savings Product' : 'New Savings Product'} width="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Code</label>
              <input value={form.code} onChange={e => set('code', e.target.value)} className={fieldClass} placeholder="e.g. M_HOMEPLUS" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className={fieldClass} placeholder="Product name" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={`${fieldClass} resize-none`} />
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Annual Rate %</label>
              <input type="number" step="0.1" value={form.annualRatePercent} onChange={e => set('annualRatePercent', +e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Min Duration (days)</label>
              <input type="number" value={form.minDurationDays} onChange={e => set('minDurationDays', +e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Max Duration (days)</label>
              <input type="number" value={form.maxDurationDays} onChange={e => set('maxDurationDays', +e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="active-toggle"
              checked={form.active}
              onChange={e => set('active', e.target.checked)}
              className="w-4 h-4 accent-slate-700"
            />
            <label htmlFor="active-toggle" className="text-sm font-semibold text-slate-700">Active on creation</label>
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
    </>
  )
}
