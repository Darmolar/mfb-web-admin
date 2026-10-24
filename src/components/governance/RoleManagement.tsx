import { useMemo, useState } from 'react'
import { Lock, Pencil, Plus, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { createRole, deleteRole, getPermissions, getRole, getRoles, updateRole, updateRolePermissions } from '../../api'
import {
  readPermissions, readRole, readRoles, selectedPermissionCodes, type PermissionRecord, type RoleRecord,
} from '../../api/roles'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { LoadingRegion, Skeleton } from '../ui/Skeleton'

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback)

export function RoleManagement() {
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [editRole, setEditRole] = useState<RoleRecord | null>(null)
  const [draft, setDraft] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [permRole, setPermRole] = useState<RoleRecord | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [permLoading, setPermLoading] = useState(false)
  const [permSaving, setPermSaving] = useState(false)
  const [permError, setPermError] = useState<string | null>(null)
  const [permFilter, setPermFilter] = useState('')
  const [notice, setNotice] = useState<string | null>(null)

  const { data: roles, loading, error, refetch } = useApi(async () => readRoles((await getRoles()).data), [])
  const permissionsApi = useApi(async () => readPermissions((await getPermissions()).data), [])
  const permissions = useMemo(() => permissionsApi.data ?? [], [permissionsApi.data])

  const groups = useMemo(() => {
    const term = permFilter.trim().toLowerCase()
    const map = new Map<string, PermissionRecord[]>()
    for (const p of permissions) {
      if (term && !`${p.code} ${p.description} ${p.group}`.toLowerCase().includes(term)) continue
      map.set(p.group, [...(map.get(p.group) ?? []), p])
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [permissions, permFilter])

  function openForm(role: RoleRecord | null) {
    setEditRole(role)
    setShowForm(true)
    setDraft({ name: role?.name ?? '', description: role?.description ?? '' })
    setFormError(null)
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setFormError(null)
    try {
      const payload = { name: draft.name.trim(), description: draft.description.trim(), adminId: user.adminId }
      if (editRole) await updateRole(editRole.id, payload)
      else await createRole(payload)
      setShowForm(false)
      setNotice(editRole ? `Role ${payload.name} updated.` : `Role ${payload.name} created. Set its permissions next.`)
      refetch()
    } catch (err) {
      setFormError(errorText(err, 'The role could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(role: RoleRecord) {
    if (!user || !confirm(`Delete the role ${role.name}? Admins holding it will lose its permissions.`)) return
    try {
      await deleteRole(role.id)
      setNotice(`Role ${role.name} deleted.`)
      refetch()
    } catch (err) {
      setNotice(errorText(err, 'The role could not be deleted.'))
    }
  }

  // Load the role fresh so the ticked boxes are what the server holds, not a stale list row.
  async function openPermissions(role: RoleRecord) {
    setPermRole(role)
    setPermError(null)
    setPermFilter('')
    setSelected(new Set(selectedPermissionCodes(role, permissions)))
    setPermLoading(true)
    try {
      const fresh = readRole((await getRole(role.id)).data)
      if (fresh) setSelected(new Set(selectedPermissionCodes(fresh, permissions)))
    } catch (err) {
      setPermError(`Could not load this role's current permissions: ${errorText(err, 'unknown error')}. Saving would overwrite them.`)
    } finally {
      setPermLoading(false)
    }
  }

  function toggle(ids: string[], on: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => (on ? next.add(id) : next.delete(id)))
      return next
    })
  }

  async function savePermissions() {
    if (!permRole || !user) return
    setPermSaving(true)
    setPermError(null)
    try {
      await updateRolePermissions(permRole.id, { permissionCodes: [...selected], adminId: user.adminId })
      setNotice(`Permissions for ${permRole.name} saved (${selected.size} granted).`)
      setPermRole(null)
      refetch()
    } catch (err) {
      setPermError(errorText(err, 'The permissions could not be saved.'))
    } finally {
      setPermSaving(false)
    }
  }

  const columns: ColumnDef<RoleRecord>[] = [
    {
      header: 'Role Name',
      accessorKey: 'name',
      cell: r => (
        <span className="font-semibold text-slate-700">
          {r.name.replace(/_/g, ' ')}
          {r.system && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">Built-in</span>}
        </span>
      ),
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: r => <span className="text-xs text-slate-500">{r.description || 'No description'}</span>,
    },
    {
      header: 'Permissions',
      sortable: false,
      cell: r => <span className="text-xs text-slate-500">{r.permissionKeys.length || '—'}</span>,
    },
    {
      header: 'Actions',
      sortable: false,
      cell: r => (
        <div className="flex gap-2">
          <button onClick={() => openForm(r)} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer" title="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={() => openPermissions(r)} className="p-1.5 text-slate-400 hover:text-indigo-600 cursor-pointer" title="Permissions">
            <ShieldCheck size={14} />
          </button>
          {r.system ? (
            <span className="p-1.5 text-slate-300" title="Built-in role: cannot be deleted">
              <Lock size={14} />
            </span>
          ) : (
            <button onClick={() => handleDelete(r)} className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer" title="Delete">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Role Management</h3>
          <p className="text-xs text-slate-500">Manage administrative roles and their granular permissions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer" title="Refresh">
            <RefreshCw size={13} />
          </button>
          <Button size="sm" onClick={() => openForm(null)}>
            <Plus size={14} /> New Role
          </Button>
        </div>
      </div>

      {notice && (
        <div className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex justify-between gap-4">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-red-500 mb-3">{error}</p>
          <Button size="sm" variant="secondary" onClick={refetch}>Retry</Button>
        </div>
      )}
      {!error && (
        <DataTable columns={columns} data={roles ?? []} loading={loading && !roles} searchPlaceholder="Search roles..." searchFields={['name', 'description']} emptyMessage="No roles found." />
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editRole ? 'Edit Role' : 'Create Role'} width="max-w-lg">
        <form onSubmit={handleSaveRole} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Role Name</label>
            <input value={draft.name} onChange={e => setDraft(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-slate-300" placeholder="e.g. LOAN_OFFICER" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
            <textarea value={draft.description} onChange={e => setDraft(p => ({ ...p, description: e.target.value }))} className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{formError}</p>}
          <Button type="submit" fullWidth disabled={saving}>{saving ? 'Saving…' : editRole ? 'Update Role' : 'Create Role'}</Button>
        </form>
      </Modal>

      <Modal open={!!permRole} onClose={() => setPermRole(null)} title={`Permissions · ${permRole?.name.replace(/_/g, ' ') ?? ''}`} width="max-w-3xl">
        <div className="space-y-4">
          {permissionsApi.error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">Could not load the permission list: {permissionsApi.error}</p>}
          <div className="flex items-center justify-between gap-3">
            <input
              value={permFilter}
              onChange={e => setPermFilter(e.target.value)}
              placeholder="Filter permissions…"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <span className="text-xs text-slate-500">{selected.size} of {permissions.length} granted</span>
          </div>

          {(permLoading || permissionsApi.loading) && (
            <LoadingRegion label="Loading permissions…" className="space-y-4">
              {[0, 1].map(i => (
                <div key={i} className="border border-slate-100 rounded-xl">
                  <div className="px-4 py-3 bg-slate-50 rounded-t-xl"><Skeleton className="h-3 w-28" /></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-4">
                    {[0, 1, 2, 3].map(j => <Skeleton key={j} className={`h-3.5 ${j % 2 ? 'w-1/2' : 'w-2/3'}`} />)}
                  </div>
                </div>
              ))}
            </LoadingRegion>
          )}

          {!permLoading && !permissionsApi.loading && (
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {groups.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No permissions found.</p>}
              {groups.map(([group, items]) => {
                const codes = items.map(p => p.code)
                const all = codes.every(code => selected.has(code))
                return (
                  <div key={group} className="border border-slate-100 rounded-xl">
                    <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 rounded-t-xl text-xs font-bold text-slate-600 uppercase tracking-wider cursor-pointer">
                      <input type="checkbox" className="accent-slate-700" checked={all} onChange={e => toggle(codes, e.target.checked)} />
                      {group.replace(/_/g, ' ')}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 p-4">
                      {items.map(p => (
                        <label key={p.id} className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
                          <input type="checkbox" className="mt-1 accent-slate-700" checked={selected.has(p.code)} onChange={e => toggle([p.code], e.target.checked)} />
                          <span>
                            <span className="font-mono text-xs">{p.code}</span>
                            {p.description && <span className="block text-[11px] text-slate-400">{p.description}</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {permError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{permError}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setPermRole(null)}>Cancel</Button>
            <Button className="flex-1 justify-center" disabled={permSaving || permLoading || !!permissionsApi.error || !permissions.length} onClick={savePermissions}>
              {permSaving ? 'Saving…' : 'Save Permissions'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
