import { useState } from 'react'
import { Loader2, RefreshCw, UserPlus } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { createCardFusionStaff, getCardFusionStaff } from '../../api'
import { readCreatedStaff, readStaffPage, type CardFusionStaff as Staff } from '../../api/cardfusion'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Field, Notice, OneTimeSecret, inputClass } from './shared'
import { errorMessage, formatWhen } from './format'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const emptyForm = { name: '', email: '', staffCode: '' }

export function CardFusionStaff() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState<{ name: string; password: string } | null>(null)

  const { data, loading, error, refetch } = useApi(async () => readStaffPage((await getCardFusionStaff()).data), [])
  const staff = data?.items ?? []

  function close() {
    if (saving) return
    setOpen(false); setForm(emptyForm); setFormError(''); setCreated(null)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return
    const payload = { name: form.name.trim(), email: form.email.trim().toLowerCase(), staffCode: form.staffCode.trim().toUpperCase() }
    if (!payload.name || !payload.email || !payload.staffCode) { setFormError('Enter the staff name, email and staff code.'); return }
    if (!EMAIL.test(payload.email)) { setFormError('Enter a valid email address.'); return }
    if (!user?.adminId) { setFormError('Your admin session is missing an admin ID. Sign in again.'); return }
    setSaving(true); setFormError('')
    try {
      const result = readCreatedStaff((await createCardFusionStaff({ ...payload, adminId: user.adminId })).data)
      setCreated({ name: result.staff?.name ?? payload.name, password: result.temporaryPassword })
      void refetch()
    } catch (cause) {
      setFormError(errorMessage(cause, 'The staff account could not be created.'))
      void refetch()
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnDef<Staff>[] = [
    { header: 'Name', accessorKey: 'name', cell: s => <span className="font-semibold text-slate-700">{s.name}</span> },
    { header: 'Staff Code', accessorKey: 'staffCode', cell: s => <span className="font-mono text-slate-600">{s.staffCode}</span> },
    { header: 'Email', accessorKey: 'email', cell: s => <span className="text-slate-500">{s.email}</span> },
    { header: 'Status', accessorKey: 'active', cell: s => <Badge label={s.active ? 'Active' : 'Inactive'} variant={s.active ? 'green' : 'gray'} /> },
    { header: 'Last Login', accessorKey: 'lastLoginAt', cell: s => <span className="text-slate-500">{s.lastLoginAt ? formatWhen(s.lastLoginAt) : 'Never'}</span> },
    { header: 'Created', accessorKey: 'createdAt', cell: s => <span className="text-slate-500">{formatWhen(s.createdAt)}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Staff Users</h3>
          <p className="text-xs text-slate-400">Branch staff who sign in to CardFusion devices with their staff code.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}><UserPlus size={14} /> Add Staff</Button>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {data && data.totalElements > staff.length && (
        <p className="text-xs text-slate-400">Showing the latest {staff.length} of {data.totalElements} staff users.</p>
      )}

      <DataTable
        columns={columns}
        data={staff}
        searchPlaceholder="Search by name, code or email..."
        searchFields={['name', 'staffCode', 'email']}
        emptyMessage={loading ? 'Loading staff users...' : 'No CardFusion staff yet.'}
      />

      <Modal open={open} onClose={close} title={created ? 'Staff Account Created' : 'Add CardFusion Staff'} width="max-w-md">
        {created ? (
          <OneTimeSecret
            label="Temporary Password"
            value={created.password}
            warning={`Give this temporary password to ${created.name} through a secure channel. It is shown only once and cannot be retrieved later.`}
            onDone={close}
          />
        ) : (
          <form className="space-y-4" onSubmit={submit} noValidate>
            {formError && <Notice tone="error">{formError}</Notice>}
            <Field label="Full Name">
              <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Okafor" autoFocus />
            </Field>
            <Field label="Email">
              <input type="email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@memphismfb.com" />
            </Field>
            <Field label="Staff Code" hint="Used as the staff ID when signing in on a CardFusion device.">
              <input className={`${inputClass} font-mono uppercase`} value={form.staffCode} onChange={e => setForm({ ...form, staffCode: e.target.value })} placeholder="STAFF003" />
            </Field>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={close} disabled={saving}>Cancel</Button>
              <Button type="submit" className="flex-1 justify-center" disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Create Account
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
