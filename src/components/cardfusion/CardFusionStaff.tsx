import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { createCardFusionStaff, getCardFusionStaff } from '../../api'
import { readCreatedStaff, readStaffPage, type CardFusionStaff as Staff } from '../../api/cardfusion'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Avatar, Field, Notice, OneTimeSecret, RefreshButton, SectionHeader, Tile, inputClass } from './shared'
import { errorMessage, formatWhen, timeAgo } from './format'
import { StatCardsSkeleton } from '../ui/Skeleton'

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

  const activeCount = staff.filter(s => s.active).length
  const signedIn = staff.filter(s => s.lastLoginAt).length
  const lastLogin = (s: Staff) => (
    <div className="whitespace-nowrap">
      <p className={s.lastLoginAt ? 'text-slate-700' : 'text-amber-700 font-semibold'}>{s.lastLoginAt ? timeAgo(s.lastLoginAt) : 'Never signed in'}</p>
      {s.lastLoginAt && <p className="text-[11px] text-slate-400">{formatWhen(s.lastLoginAt)}</p>}
    </div>
  )

  const columns: ColumnDef<Staff>[] = [
    {
      header: 'Staff member',
      accessorKey: 'name',
      cell: s => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <Avatar name={s.name} />
          <div className="min-w-0">
            <p className="font-semibold text-slate-700 truncate">{s.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{s.email}</p>
          </div>
        </div>
      ),
    },
    { header: 'Staff code', accessorKey: 'staffCode', cell: s => <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-md px-2 py-0.5">{s.staffCode}</span> },
    { header: 'Status', accessorKey: 'active', cell: s => <Badge label={s.active ? 'Active' : 'Inactive'} variant={s.active ? 'green' : 'gray'} /> },
    { header: 'Last sign-in', accessorKey: 'lastLoginAt', cell: lastLogin },
    { header: 'Added', accessorKey: 'createdAt', cell: s => <span className="text-xs text-slate-500 whitespace-nowrap">{formatWhen(s.createdAt)}</span> },
  ]

  return (
    <div className="space-y-4">
      <SectionHeader title="Staff users" text="Branch staff who sign in to CardFusion devices with their staff code.">
        <RefreshButton loading={loading} onClick={() => void refetch()} />
        <Button size="sm" onClick={() => setOpen(true)}><UserPlus size={14} /> Add staff</Button>
      </SectionHeader>

      {error && <Notice tone="error">{error}</Notice>}
      {loading && !data && <StatCardsSkeleton count={3} className="grid grid-cols-3 gap-2 sm:gap-3" />}
      {data && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Tile label="Staff users" value={staff.length} sub={`${activeCount} active`} />
          <Tile label="Signed in" value={signedIn} sub="Used a device at least once" />
          <Tile label="Never signed in" value={staff.length - signedIn} sub="Temporary password not yet used" tone={staff.length - signedIn ? 'amber' : undefined} />
        </div>
      )}
      {data && data.totalElements > staff.length && (
        <p className="text-xs text-slate-400">Showing the latest {staff.length} of {data.totalElements} staff users.</p>
      )}

      {data && (
        // Phones get stacked cards so every field stays readable without sideways scrolling.
        <div className="sm:hidden space-y-3">
          {staff.length === 0 && <p className="text-center text-xs text-slate-400 py-8">No CardFusion staff yet.</p>}
          {staff.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar name={s.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{s.name}</p>
                  <p className="text-xs text-slate-400 truncate">{s.email}</p>
                </div>
                <Badge label={s.active ? 'Active' : 'Inactive'} variant={s.active ? 'green' : 'gray'} />
              </div>
              <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
                <dt className="text-slate-400">Staff code</dt><dd className="text-right font-mono text-slate-700">{s.staffCode}</dd>
                <dt className="text-slate-400">Last sign-in</dt><dd className={`text-right ${s.lastLoginAt ? 'text-slate-700' : 'text-amber-700 font-semibold'}`}>{s.lastLoginAt ? timeAgo(s.lastLoginAt) : 'Never'}</dd>
                <dt className="text-slate-400">Added</dt><dd className="text-right text-slate-700">{formatWhen(s.createdAt)}</dd>
              </dl>
            </div>
          ))}
        </div>
      )}
      <div className={data ? 'hidden sm:block' : ''}>
        <DataTable
          columns={columns}
          data={staff}
          searchPlaceholder="Search by name, code or email…"
          searchFields={['name', 'staffCode', 'email']}
          loading={loading && !data}
          emptyMessage="No CardFusion staff yet."
        />
      </div>

      <Modal open={open} onClose={close} title={created ? 'Staff account created' : 'Add CardFusion staff'} width="max-w-md">
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
            <Field label="Full name">
              <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Okafor" autoFocus />
            </Field>
            <Field label="Email">
              <input type="email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="name@memphismfb.com" />
            </Field>
            <Field label="Staff code" hint="Used as the staff ID when signing in on a CardFusion device.">
              <input className={`${inputClass} font-mono uppercase`} value={form.staffCode} onChange={e => setForm({ ...form, staffCode: e.target.value })} placeholder="STAFF003" />
            </Field>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={close} disabled={saving}>Cancel</Button>
              <Button type="submit" className="flex-1 justify-center" disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Create account
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
