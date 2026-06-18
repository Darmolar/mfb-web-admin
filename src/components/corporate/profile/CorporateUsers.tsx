import { useState } from 'react'
import { Plus, RefreshCw, Pencil, ShieldOff, ShieldCheck } from 'lucide-react'
import { Badge, statusBadge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { DataTable, type ColumnDef } from '../../ui/DataTable'
import { useApi } from '../../../hooks/useApi'
import { useAuth } from '../../../context/AuthContext'
import { getCorporateUsers, addCorporateUser, changeCorporateUserRole, updateCorporateUserStatus } from '../../../api'
import type { CorporateUser } from '../../../api'
import moment from 'moment'

interface Props { corporateId: string }

const ROLES = ['MAKER', 'CHECKER', 'APPROVER', 'VIEWER', 'ADMIN']

export function CorporateUsers({ corporateId }: Props) {
  const { user } = useAuth()
  const { data: users, loading, error, refetch } = useApi<CorporateUser[]>(
    () => getCorporateUsers(corporateId).then(r => r.data),
    [corporateId],
  )

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', role: ROLES[0] })
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const [editTarget, setEditTarget] = useState<CorporateUser | null>(null)
  const [newRole, setNewRole] = useState('')
  const [editing, setEditing] = useState(false)

  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setAdding(true); setAddError(null)
    try {
      await addCorporateUser(corporateId, { ...addForm, adminId: user.adminId })
      setShowAdd(false)
      setAddForm({ name: '', email: '', password: '', role: ROLES[0] })
      refetch()
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add user')
    } finally { setAdding(false) }
  }

  async function handleRoleChange(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget || !user) return
    setEditing(true)
    try {
      await changeCorporateUserRole(corporateId, editTarget.id, { role: newRole, adminId: user.adminId })
      setEditTarget(null)
      refetch()
    } finally { setEditing(false) }
  }

  async function handleToggle(u: CorporateUser) {
    if (!user) return
    setTogglingId(u.id)
    try {
      await updateCorporateUserStatus(corporateId, u.id, {
        status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
        adminId: user.adminId,
      })
      refetch()
    } finally { setTogglingId(null) }
  }

  const columns: ColumnDef<CorporateUser>[] = [
    {
      header: 'Name',
      accessorKey: 'name',
      cell: (u) => (
        <>
          <p className="text-sm font-semibold text-slate-700">{u.name}</p>
          <p className="text-xs text-slate-400">{u.email}</p>
        </>
      ),
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: (u) => <span className="text-xs font-semibold text-slate-600">{u.role}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (u) => <Badge label={u.status} variant={statusBadge(u.status)} />,
    },
    {
      header: 'MFA',
      accessorKey: 'mfaEnabled',
      cell: (u) => (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.mfaEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
          {u.mfaEnabled ? 'ON' : 'OFF'}
        </span>
      ),
    },
    {
      header: 'Last Login',
      accessorKey: 'lastLoginAt',
      cell: (u) => <span className="text-xs text-slate-400">{u.lastLoginAt ? moment(u.lastLoginAt).fromNow() : '—'}</span>,
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (u) => (
        <div className="flex items-center gap-1">
          <button onClick={() => { setEditTarget(u); setNewRole(u.role) }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer" title="Change role">
            <Pencil size={13} />
          </button>
          <button onClick={() => handleToggle(u)} disabled={togglingId === u.id} className={`w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer ${u.status === 'ACTIVE' ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-500' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-500'} disabled:opacity-40`} title={u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}>
            {u.status === 'ACTIVE' ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Corporate Users</h4>
          <div className="flex items-center gap-2">
            <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer"><RefreshCw size={13} /></button>
            <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={13} /> Add User</Button>
          </div>
        </div>

        {loading && <div className="px-6 py-10 text-center text-xs text-slate-400">Loading users…</div>}
        {error && <div className="px-6 py-6 text-center text-xs text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="px-6 py-4">
            <DataTable<CorporateUser>
              columns={columns}
              data={users ?? []}
              searchPlaceholder="Search users…"
              emptyMessage="No users found."
            />
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Corporate User" width="max-w-md">
        <form onSubmit={handleAdd} className="space-y-4">
          {[['name','Full Name','text'],['email','Email','email'],['password','Password','password']].map(([k, label, type]) => (
            <div key={k} className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label} *</label>
              <input className={inputCls} type={type} value={addForm[k as keyof typeof addForm]} onChange={e => setAddForm(p => ({...p, [k]: e.target.value}))} required />
            </div>
          ))}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Role *</label>
            <select className={inputCls} value={addForm.role} onChange={e => setAddForm(p => ({...p, role: e.target.value}))}>
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{addError}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={adding}>{adding ? 'Adding…' : 'Add User'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Change User Role" width="max-w-sm">
        {editTarget && (
          <form onSubmit={handleRoleChange} className="space-y-4">
            <p className="text-sm text-slate-600">Changing role for <span className="font-bold">{editTarget.name}</span></p>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New Role</label>
              <select className={inputCls} value={newRole} onChange={e => setNewRole(e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={editing}>{editing ? 'Saving…' : 'Save Role'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'
