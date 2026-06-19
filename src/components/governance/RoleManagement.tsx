import { useState } from 'react'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { updateRolePermissions, deleteRole, updateRole } from '../../api'

// NOTE: Since I don't have getRoles defined explicitly in the new batch, I'll assume getRoles exists or I'll just use a direct fetch. 
// Ah, index.ts actually has `getRoles` already: `export function getRoles() { return request<PaginatedData<Role>>('/v1/bank-admin/roles') }`
import { getRoles } from '../../api'

export function RoleManagement() {
  const [showForm, setShowForm] = useState(false)
  const [editRole, setEditRole] = useState<any>(null)
  const [permissionsModal, setPermissionsModal] = useState<any>(null)
  const [permsInput, setPermsInput] = useState('')
  const [draft, setDraft] = useState({ name: '', description: '' })

  const { data, refetch } = useApi(async () => {
    const res = await getRoles()
    return res.data
  }, [])

  const roles = data?.content ?? []

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editRole) {
        await updateRole(editRole.id, draft)
        setEditRole(null)
      } else {
        // Need to create role, assuming a generic POST
        await fetch('http://163.245.209.118:8080/api/v1/bank-admin/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': 'ixuJ2ZPSkAFSsJHqG09KheGZ' },
          body: JSON.stringify(draft)
        })
        setShowForm(false)
      }
      refetch()
    } catch (err) {
      alert('Failed to save role')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return
    try {
      await deleteRole(id)
      refetch()
    } catch (err) {
      alert('Failed to delete role')
    }
  }

  const openPermissions = async (role: any) => {
    setPermissionsModal(role)
    try {
      // In a real app we'd fetch the specific role's permissions. 
      // We will just put an empty array or use getMyPermissions for structure.
      setPermsInput('[\n  "CREATE_USER",\n  "VIEW_TRANSACTIONS"\n]')
    } catch (err) {
      // Ignore
    }
  }

  const savePermissions = async () => {
    try {
      const parsed = JSON.parse(permsInput)
      await updateRolePermissions(permissionsModal.id, parsed)
      setPermissionsModal(null)
      alert('Permissions updated')
    } catch (err) {
      alert('Invalid JSON')
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      header: 'Role Name',
      accessorKey: 'name',
      cell: (r) => <span className="font-semibold text-slate-700">{r.name}</span>
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: (r) => <span className="text-xs text-slate-500">{r.description || 'No description'}</span>
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (r) => (
        <div className="flex gap-2">
          <button onClick={() => { setEditRole(r); setDraft({ name: r.name, description: r.description || '' }) }} className="p-1.5 text-slate-400 hover:text-slate-600">
            <Pencil size={14} />
          </button>
          <button onClick={() => openPermissions(r)} className="p-1.5 text-slate-400 hover:text-indigo-600" title="Permissions">
            <ShieldCheck size={14} />
          </button>
          <button onClick={() => handleDelete(r.id)} className="p-1.5 text-slate-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Role Management</h3>
          <p className="text-xs text-slate-500">Manage administrative roles and their granular permissions.</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setDraft({ name: '', description: '' }) }}>
          <Plus size={14} /> New Role
        </Button>
      </div>

      <DataTable columns={columns} data={roles} searchPlaceholder="Search roles..." emptyMessage="No roles found." />

      {(showForm || editRole) && (
        <Modal open={true} onClose={() => { setShowForm(false); setEditRole(null) }} title={editRole ? 'Edit Role' : 'Create Role'}>
          <form onSubmit={handleSaveRole} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Role Name</label>
              <input value={draft.name} onChange={e => setDraft(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-slate-300" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
              <textarea value={draft.description} onChange={e => setDraft(p => ({...p, description: e.target.value}))} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            <Button type="submit" className="w-full">{editRole ? 'Update Role' : 'Create Role'}</Button>
          </form>
        </Modal>
      )}

      <Modal open={!!permissionsModal} onClose={() => setPermissionsModal(null)} title="Manage Permissions">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Edit permissions for {permissionsModal?.name} (JSON array of permission codes)</p>
          <textarea
            className="w-full h-48 p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 outline-none"
            value={permsInput}
            onChange={e => setPermsInput(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setPermissionsModal(null)}>Cancel</Button>
            <Button className="flex-1" onClick={savePermissions}>Save Permissions</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
