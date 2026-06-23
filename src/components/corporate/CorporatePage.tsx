import { useState } from 'react'
import { ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { getCorporates, createCorporate, getStates, getTowns, getSectors } from '../../api'
import type { CorporateListItem, CreateCorporateRequest } from '../../api'
import { EntityProfile } from './profile/EntityProfile'
import { useAuth } from '../../context/AuthContext'
import moment from 'moment'

const EMPTY_FORM: Omit<CreateCorporateRequest, 'adminId'> = {
  companyName: '', rcNumber: '', tin: '', sector: '', sectorCode: '',
  address: '', stateCode: '', townCode: '', phone: '', email: '',
  incorporationDate: '', bvn: '', acctOfficer: '',
}

const DEMO_STATES = [
  { code: 'LAG', name: 'Lagos' },
  { code: 'ABJ', name: 'Abuja' },
  { code: 'KNO', name: 'Kano' },
]

const DEMO_TOWNS = [
  { code: 'IKE', name: 'Ikeja', stateCode: 'LAG' },
  { code: 'VI', name: 'Victoria Island', stateCode: 'LAG' },
  { code: 'WUS', name: 'Wuse', stateCode: 'ABJ' },
  { code: 'GAR', name: 'Garki', stateCode: 'ABJ' },
  { code: 'KMC', name: 'Kano Municipal', stateCode: 'KNO' },
]

const DEMO_SECTORS = [
  { code: 'FIN', name: 'Finance' },
  { code: 'TECH', name: 'Technology' },
  { code: 'AGR', name: 'Agriculture' },
  { code: 'EDU', name: 'Education' },
  { code: 'HLT', name: 'Healthcare' },
]

const DEMO_ADMINS = [
  { id: 'ADM001', name: 'John Doe' },
  { id: 'ADM002', name: 'Jane Smith' },
  { id: 'ADM003', name: 'Mike Johnson' },
]

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

  const { data: statesRes } = useApi(() => getStates(), [])
  const { data: townsRes } = useApi(() => getTowns(), [])
  const { data: sectorsRes } = useApi(() => getSectors(), [])

  const apiStates = statesRes?.data?.content ?? []
  const apiTowns = townsRes?.data?.content ?? []
  const apiSectors = sectorsRes?.data?.content ?? []

  const states = apiStates.length > 0 ? apiStates : DEMO_STATES
  const towns = apiTowns.length > 0 ? apiTowns : DEMO_TOWNS
  const sectors = apiSectors.length > 0 ? apiSectors : DEMO_SECTORS
  const admins = DEMO_ADMINS


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
      const msg = err instanceof Error ? err.message : 'Failed to create corporate profile'
      try {
        const jsonStart = msg.indexOf('{')
        if (jsonStart !== -1) {
          const jsonStr = msg.substring(jsonStart)
          const parsed = JSON.parse(jsonStr)
          
          if (parsed.responseCode === '20' || parsed.responseCode === '00') {
            setShowCreate(false)
            setForm(EMPTY_FORM)
            refetch()
            alert(parsed.responseDescription || 'Creation successful. Pending authorization.')
            return
          } else {
            setCreateError(parsed.responseDescription || 'Failed to create corporate profile')
            return
          }
        }
      } catch (e) {
        // Fallback to original message if JSON parsing fails
      }
      setCreateError(msg)
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Company Name <span className="text-red-400">*</span></label>
              <input className={inputCls} value={form.companyName} onChange={e => handleField('companyName', e.target.value)} placeholder="e.g. Acme Holdings Ltd" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">RC Number <span className="text-red-400">*</span></label>
              <input className={inputCls} value={form.rcNumber} onChange={e => handleField('rcNumber', e.target.value)} placeholder="e.g. RC1234567" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tax Identification Number (TIN) <span className="text-red-400">*</span></label>
              <input className={inputCls} value={form.tin} onChange={e => handleField('tin', e.target.value)} placeholder="e.g. 12345678-0001" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">BVN (Signatory) <span className="text-red-400">*</span></label>
              <input className={inputCls} value={form.bvn} onChange={e => handleField('bvn', e.target.value)} placeholder="11-digit BVN" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Phone <span className="text-red-400">*</span></label>
              <input className={inputCls} value={form.phone} onChange={e => handleField('phone', e.target.value)} placeholder="e.g. 08012345678" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email <span className="text-red-400">*</span></label>
              <input className={inputCls} type="email" value={form.email} onChange={e => handleField('email', e.target.value)} placeholder="info@company.com" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Account Officer / Admin <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.acctOfficer} onChange={e => handleField('acctOfficer', e.target.value)} required>
                <option value="">Select Account Officer</option>
                {admins.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sector <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.sectorCode} onChange={e => {
                const s = sectors.find((x: any) => x.code === e.target.value)
                setForm(p => ({ ...p, sectorCode: e.target.value, sector: s?.name || '' }))
              }} required>
                <option value="">Select Sector</option>
                {sectors.map((s: any) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">State <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.stateCode} onChange={e => {
                handleField('stateCode', e.target.value)
                handleField('townCode', '')
              }} required>
                <option value="">Select State</option>
                {states.map((s: any) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Town <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.townCode} onChange={e => handleField('townCode', e.target.value)} required disabled={!form.stateCode}>
                <option value="">Select Town</option>
                {towns.filter((t: any) => t.stateCode === form.stateCode).map((t: any) => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
            </div>

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
