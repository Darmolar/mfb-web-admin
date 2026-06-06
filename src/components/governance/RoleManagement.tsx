import { useMemo, useState } from 'react'
import { Check, Edit2, Plus, Trash2, X, Loader2 } from 'lucide-react'
import { createAdminUser, updateAdminUser, deleteAdminUser, getAdminUsers } from '../../api'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import type { AdminUser } from '../../api/types'

type DraftUser = {
  name: string
  email: string
  password: string
  role: string
  department: string
}

const emptyDraft: DraftUser = {
  name: '',
  email: '',
  password: '',
  role: 'COMPLIANCE_OFFICER',
  department: '',
}

const roles = ['SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'FINANCE_MANAGER', 'AUDITOR', 'CUSTOMER_SUPPORT']
const departments = ['Platform Operations', 'Compliance', 'Finance', 'Audit', 'Customer Support']

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function RoleManagement() {
  const { user } = useAuth()
  const [draft, setDraft] = useState<DraftUser>(emptyDraft)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const { data, loading, error, refetch } = useApi(
    () => getAdminUsers({ size: 100 }).then(r => r.data),
    [],
  )

  const admins: AdminUser[] = data?.content ?? []

  const roleCounts = useMemo(() => {
    return roles.map(role => ({ role, count: admins.filter(a => a.role === role).length }))
  }, [admins])

  const showNotice = (text: string, ok = true) => {
    setNotice({ ok, text })
    window.setTimeout(() => setNotice(null), 3200)
  }

  const resetForm = () => {
    setDraft(emptyDraft)
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (admin: AdminUser) => {
    setDraft({ name: admin.name, email: admin.email, password: '', role: admin.role, department: admin.department })
    setEditingId(admin.id)
    setShowForm(true)
  }

  const saveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.name || !draft.email || !draft.role || !draft.department) {
      showNotice('Fill in all required fields.', false)
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        if (!user) return
        await updateAdminUser(editingId, { name: draft.name, role: draft.role, department: draft.department, adminId: user.adminId })
        showNotice('Admin user updated.')
      } else {
        if (!draft.password) {
          showNotice('Enter a temporary password for the new admin user.', false)
          return
        }
        await createAdminUser({ name: draft.name, email: draft.email, password: draft.password, role: draft.role, department: draft.department })
        showNotice('Admin user created.')
      }
      resetForm()
      refetch()
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Operation failed.', false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (adminId: string) => {
    try {
      await deleteAdminUser(adminId)
      showNotice('Admin user deleted.')
      refetch()
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Delete failed.', false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Admin User Management</h4>
          <p className="text-xs text-slate-500">Create, edit, and remove admin users.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setDraft(emptyDraft) }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-800"
        >
          <Plus size={14} /> New Admin
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {roleCounts.map(item => (
          <div key={item.role} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{item.role.replaceAll('_', ' ')}</p>
            <p className="mt-2 text-2xl font-black text-slate-800">{item.count}</p>
          </div>
        ))}
      </div>

      {notice && (
        <div className={`rounded-2xl border px-4 py-3 text-xs font-bold ${notice.ok ? 'border-green-100 bg-green-50 text-green-700' : 'border-red-100 bg-red-50 text-red-600'}`}>
          {notice.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={saveUser} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-black text-slate-800">{editingId ? 'Edit Admin User' : 'Create Admin User'}</p>
            <button type="button" onClick={resetForm} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Name</span>
              <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300" />
            </label>
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email</span>
              <input type="email" value={draft.email} disabled={!!editingId} onChange={e => setDraft({ ...draft, email: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-60" />
            </label>
            {!editingId && (
              <label className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Temporary Password</span>
                <input type="password" value={draft.password} onChange={e => setDraft({ ...draft, password: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300" />
              </label>
            )}
            <label className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Role</span>
              <select value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300">
                {roles.map(role => <option key={role}>{role}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 md:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</span>
              <select value={draft.department} onChange={e => setDraft({ ...draft, department: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-slate-300">
                <option value="">Select department</option>
                {departments.map(department => <option key={department}>{department}</option>)}
              </select>
            </label>
          </div>

          <button disabled={saving} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-60">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
          </button>
        </form>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-slate-400" />
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Admin User', 'Role', 'Department', 'MFA', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No admin users found.</td>
                  </tr>
                ) : admins.map(admin => (
                  <tr key={admin.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-700">{admin.name}</p>
                      <p className="text-xs text-slate-400">{admin.email}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">{admin.role.replaceAll('_', ' ')}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{admin.department}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-widest ${admin.mfaEnabled ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {admin.mfaEnabled ? 'Enabled' : 'Off'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700">{admin.status}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{formatDate(admin.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => startEdit(admin)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(admin.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
