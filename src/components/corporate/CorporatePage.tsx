import { useState } from 'react'
import { ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { getCorporates, createCorporate } from '../../api'
import type { CorporateListItem, CreateCorporateRequest } from '../../api'
import { EntityProfile } from './profile/EntityProfile'
import { useAuth } from '../../context/AuthContext'
import moment from 'moment'

const EMPTY_FORM: Omit<CreateCorporateRequest, 'adminId'> = {
  companyName: '', rcNumber: '', tin: '', sector: '', sectorCode: '',
  address: '', stateCode: '', townCode: '', phone: '', email: '',
  incorporationDate: '', bvn: '', acctOfficer: '',
}

export function CorporatePage() {
  const { user } = useAuth()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { data, loading, error, refetch } = useApi(
    () => getCorporates({ size: 100 }).then(r => r.data),
    [],
  )

  if (selectedId) return <EntityProfile corporateId={selectedId} onBack={() => setSelectedId(null)} />

  const list: CorporateListItem[] = data?.content ?? []

  function handleField(key: keyof typeof EMPTY_FORM, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setCreating(true)
    setCreateError(null)
    try {
      const { data: created } = await createCorporate({ ...form, adminId: user.adminId })
      setShowCreate(false)
      setForm(EMPTY_FORM)
      refetch()
      setSelectedId(created.id)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create corporate profile')
    } finally {
      setCreating(false)
    }
  }

  const columns: ColumnDef<CorporateListItem>[] = [
    {
      header: 'Entity Details',
      accessorKey: 'companyName',
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <span className="text-xs font-black text-slate-600">{c.companyName.charAt(0)}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{c.companyName}</p>
            <p className="text-xs text-slate-400">{c.sector}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (c) => <Badge label={c.status} variant={statusBadge(c.status)} />,
    },
    {
      header: 'RC Number',
      accessorKey: 'rcNumber',
      cell: (c) => <span className="text-xs font-mono text-slate-500">{c.rcNumber}</span>,
    },
    {
      header: 'TIN',
      accessorKey: 'tin',
      cell: (c) => <span className="text-xs font-mono text-slate-500">{c.tin}</span>,
    },
    {
      header: 'Primary Account',
      accessorKey: 'primaryAccountNumber',
      cell: (c) => <span className="text-xs font-mono text-slate-500">{c.primaryAccountNumber ?? '—'}</span>,
    },
    {
      header: 'Onboarded',
      accessorKey: 'createdAt',
      cell: (c) => <span className="text-xs text-slate-400">{c.createdAt ? moment(c.createdAt).fromNow() : ''}</span>,
    },
    {
      header: '',
      sortable: false,
      cell: () => <ChevronRight size={16} className="text-slate-300" />,
    },
  ]

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-600">Corporate Directory</h3>
          <div className="flex items-center gap-3">
            <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer"><RefreshCw size={13} /></button>
            <Button size="sm" onClick={() => { setShowCreate(true); setCreateError(null); setForm(EMPTY_FORM) }}>
              <Plus size={13} /> New Corporate Profile
            </Button>
          </div>
        </div>

        {loading && <div className="px-6 py-12 text-center text-xs text-slate-400">Loading corporates…</div>}
        {error && <div className="px-6 py-10 text-center text-xs text-red-500">{error}</div>}

        {!loading && !error && (
          <DataTable<CorporateListItem>
            columns={columns}
            data={list}
            searchPlaceholder="Search entities…"
            searchFields={['companyName', 'rcNumber', 'tin', 'status']}
            onRowClick={(c) => setSelectedId(c.id)}
            emptyMessage="No entities found."
          />
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Corporate Profile" width="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {([
              ['companyName', 'Company Name', 'e.g. Acme Holdings Ltd'],
              ['rcNumber', 'RC Number', 'e.g. RC1234567'],
              ['tin', 'Tax Identification Number (TIN)', 'e.g. 12345678-0001'],
              ['bvn', 'BVN (Signatory)', '11-digit BVN'],
              ['sector', 'Sector', 'e.g. Manufacturing'],
              ['sectorCode', 'Sector Code', 'e.g. 42'],
              ['phone', 'Phone', 'e.g. 08012345678'],
              ['email', 'Email', 'info@company.com'],
              ['acctOfficer', 'Account Officer', 'Officer name or ID'],
              ['stateCode', 'State Code', 'e.g. LA'],
              ['townCode', 'Town Code', 'e.g. LAG'],
            ] as [keyof typeof EMPTY_FORM, string, string][]).map(([key, label, placeholder]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[10px] font-bold text-slateate-500 uppercase tracking-widest">{label} <span className="text-red-400">*</span></label>
                <input className={inputCls} value={form[key]} onChange={e => handleField(key, e.target.value)} placeholder={placeholder} required />
              </div>
            ))}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Incorporation Date <span className="text-red-400">*</span></label>
              <input className={inputCls} type="date" value={form.incorporationDate} onChange={e => handleField('incorporationDate', e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registered Address <span className="text-red-400">*</span></label>
            <input className={inputCls} value={form.address} onChange={e => handleField('address', e.target.value)} placeholder="Full registered business address" required />
          </div>
          {createError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{createError}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={creating}>{creating ? 'Creating…' : 'Create Corporate Profile'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'
