import { useState } from 'react'
import { Plus, Pencil, Trash2, ShieldCheck, ShieldOff, RefreshCw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { SearchInput } from '../ui/SearchInput'
import { useApi } from '../../hooks/useApi'
import {
  getAdminUsers, createAdminUser, updateAdminUser,
  updateAdminUserStatus, deleteAdminUser,
} from '../../api'
import type { AdminUser } from '../../api'
import { useAuth } from '../../context/AuthContext'

const ROLES = [
  'SUPER_ADMIN',
  'COMPLIANCE_OFFICER',
  'KYC_OFFICER',
  'RISK_ANALYST',
  'TRANSACTION_OFFICER',
  'SUPPORT_OFFICER',
  'AUDIT_OFFICER',
]

const DEPARTMENTS = [
  'Risk & Compliance',
  'KYC & Onboarding',
  'Transaction Monitoring',
  'Customer Support',
  'Internal Audit',
  'IT & Security',
  'Operations',
]

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED']

const EMPTY_CREATE = { name: '', email: '', password: '', role: ROLES[1], department: DEPARTMENTS[0] }
const EMPTY_EDIT = { name: '', role: ROLES[1], department: DEPARTMENTS[0] }

function adminCode(id: string) {
  return `ADM-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

function statusVariant(status: string) {
  if (status === 'ACTIVE') return 'green'
  if (status === 'SUSPENDED') return 'red'
  return 'slate'
}

export function AdminsPage() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const { data, loading, error, refetch } = useApi(
    () => getAdminUsers(statusFilter !== 'ALL' ? { status: statusFilter } : {}).then(r => r.data),
    [statusFilter],
  )

  const admins: AdminUser[] = data?.content ?? []
  const filtered = admins.filter(a =>
    !search ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    adminCode(a.id).toLowerCase().includes(search.toLowerCase())
  )

  // ── Create ──────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      await createAdminUser(createForm)
      setShowCreate(false)
      setCreateForm(EMPTY_CREATE)
      refetch()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setCreating(false)
    }
  }

  // ── Edit ────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [editing, setEditing] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function openEdit(admin: AdminUser) {
    setEditTarget(admin)
    setEditForm({ name: admin.name, role: admin.role, department: admin.department })
    setEditError(null)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editTarget || !user) return
    setEditing(true)
    setEditError(null)
    try {
      await updateAdminUser(editTarget.id, { ...editForm, adminId: user.adminId })
      setEditTarget(null)
      refetch()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update admin')
    } finally {
      setEditing(false)
    }
  }

  // ── Status toggle ────────────────────────────────
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function handleToggleStatus(admin: AdminUser) {
    if (!user) return
    const next = admin.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    setTogglingId(admin.id)
    try {
      await updateAdminUserStatus(admin.id, { status: next, adminId: user.adminId })
      refetch()
    } finally {
      setTogglingId(null)
    }
  }

  // ── Delete ───────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteAdminUser(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete admin')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-600">Admin Directory</h3>
            <p className="text-xs text-slate-400 mt-0.5">Manage super-admin portal users and their access roles.</p>
          </div>
          <div className="flex items-center gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search admins or code…" />
            <Button size="sm" onClick={() => { setShowCreate(true); setCreateError(null); setCreateForm(EMPTY_CREATE) }}>
              <Plus size={13} /> New Admin
            </Button>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === f ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {f === 'ALL' ? 'All Admins' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ADMIN USERS</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{filtered.length} admins</span>
              <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer" title="Refresh">
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {loading && (
            <div className="px-6 py-12 text-center text-xs text-slate-400">Loading admins…</div>
          )}

          {error && (
            <div className="px-6 py-10 text-center">
              <p className="text-xs text-red-500 mb-3">{error}</p>
              <Button size="sm" variant="secondary" onClick={refetch}>Retry</Button>
            </div>
          )}

          {!loading && !error && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Admin', 'Code', 'Role', 'Department', 'Status', 'MFA', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-xs text-slate-400">No admins found.</td>
                  </tr>
                )}
                {filtered.map(admin => (
                  <tr key={admin.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-black text-white">{admin.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">{admin.name}</p>
                          <p className="text-[11px] text-slate-400">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        {adminCode(admin.id)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-600 font-medium">{admin.role.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">{admin.department}</td>
                    <td className="px-5 py-4">
                      <Badge label={admin.status} variant={statusVariant(admin.status)} />
                    </td>
                    <td className="px-5 py-4">
                      {admin.mfaEnabled
                        ? <span className="text-emerald-500"><ShieldCheck size={15} /></span>
                        : <span className="text-slate-300"><ShieldOff size={15} /></span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {new Date(admin.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(admin)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(admin)}
                          disabled={togglingId === admin.id}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${
                            admin.status === 'ACTIVE'
                              ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-500'
                              : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-500'
                          } disabled:opacity-40`}
                          title={admin.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        >
                          {admin.status === 'ACTIVE' ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(admin); setDeleteError(null) }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create Admin Modal ── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Admin User" width="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <AdminField label="Full Name" required>
            <input className={inputCls} value={createForm.name} onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Michael Ibe" required />
          </AdminField>
          <AdminField label="Email Address" required>
            <input className={inputCls} type="email" value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} placeholder="m.ibe@memphisbank.com" required />
          </AdminField>
          <AdminField label="Password" required>
            <input className={inputCls} type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="Minimum 8 characters" minLength={8} required />
          </AdminField>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="Role" required>
              <select className={inputCls} value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value }))} required>
                {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </AdminField>
            <AdminField label="Department" required>
              <select className={inputCls} value={createForm.department} onChange={e => setCreateForm(p => ({ ...p, department: e.target.value }))} required>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </AdminField>
          </div>
          {createError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{createError}</p>}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={creating}>{creating ? 'Creating…' : 'Create Admin'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Admin Modal ── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Admin User" width="max-w-lg">
        {editTarget && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-2">
              <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center">
                <span className="text-sm font-black text-white">{editTarget.name.charAt(0)}</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">{editTarget.name}</p>
                <p className="text-[11px] font-mono text-slate-400">{adminCode(editTarget.id)}</p>
              </div>
            </div>
            <AdminField label="Full Name" required>
              <input className={inputCls} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required />
            </AdminField>
            <div className="grid grid-cols-2 gap-4">
              <AdminField label="Role" required>
                <select className={inputCls} value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} required>
                  {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </AdminField>
              <AdminField label="Department" required>
                <select className={inputCls} value={editForm.department} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} required>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </AdminField>
            </div>
            {editError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{editError}</p>}
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={editing}>{editing ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Admin User" width="max-w-sm">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently remove <span className="font-bold text-slate-800">{deleteTarget.name}</span>
              {' '}(<span className="font-mono text-xs">{adminCode(deleteTarget.id)}</span>) from the admin portal?
            </p>
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              This action cannot be undone. The admin will immediately lose all access.
            </p>
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button variant="danger" className="flex-1" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Removing…' : 'Remove Admin'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'

function AdminField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
