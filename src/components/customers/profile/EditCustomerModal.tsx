import { useEffect, useMemo, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Modal } from '../../ui/Modal'
import { Button } from '../../ui/Button'
import { useApi } from '../../../hooks/useApi'
import { allPages } from '../../../api/pagination'
import { getStates, updateCustomer } from '../../../api'
import type { CustomerDetail, CustomerUpdateRequest } from '../../../api/types'

type Field = keyof CustomerUpdateRequest
type FormState = Record<Field, string>

const FIELDS: Field[] = [
  'firstName', 'middleName', 'lastName', 'email', 'phoneNumber', 'dateOfBirth',
  'residentialAddress', 'stateOfOrigin', 'lgaOfOrigin', 'occupation', 'employer',
  'nextOfKin', 'accountOfficerCode',
]

/** Fields the customer must always have — they can be changed but not blanked. */
const REQUIRED: Field[] = ['firstName', 'lastName', 'email', 'phoneNumber']

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NG_PHONE_RE = /^0\d{10}$/

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white disabled:opacity-60'
const labelCls = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest'

function toForm(c: CustomerDetail): FormState {
  const form = {} as FormState
  for (const f of FIELDS) {
    const v = c[f]
    form[f] = typeof v === 'string' ? v : ''
  }
  // Backend may return a full ISO timestamp; the date input needs YYYY-MM-DD.
  form.dateOfBirth = form.dateOfBirth.slice(0, 10)
  return form
}

function diff(original: FormState, current: FormState): CustomerUpdateRequest {
  const changes: CustomerUpdateRequest = {}
  for (const f of FIELDS) {
    const next = current[f].trim()
    if (next !== original[f].trim()) changes[f] = next
  }
  return changes
}

function validate(changes: CustomerUpdateRequest): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {}
  for (const f of REQUIRED) {
    if (changes[f] === '') errors[f] = 'Required'
  }
  if (changes.email && !EMAIL_RE.test(changes.email)) errors.email = 'Enter a valid email address'
  if (changes.phoneNumber && !NG_PHONE_RE.test(changes.phoneNumber)) errors.phoneNumber = 'Enter an 11-digit Nigerian number, e.g. 08012345678'
  if (changes.dateOfBirth && changes.dateOfBirth > new Date().toISOString().slice(0, 10)) errors.dateOfBirth = 'Date of birth cannot be in the future'
  return errors
}

type Props = {
  open: boolean
  onClose: () => void
  customer: CustomerDetail
  onSaved: () => void
}

export function EditCustomerModal({ open, onClose, customer, onSaved }: Props) {
  const original = useMemo(() => toForm(customer), [customer])
  const [form, setForm] = useState<FormState>(original)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // State names are suggestions only; the field stays free text. Loaded on first open.
  const states = useApi(() => allPages(page => getStates(page)), null)
  const loadStates = states.refetch
  const statesLoaded = states.data !== null || states.loading || states.error !== null

  // Re-seed from the latest customer each time the modal opens.
  useEffect(() => {
    if (!open) return
    setForm(original)
    setError(null)
  }, [open, original])

  useEffect(() => {
    if (open && !statesLoaded) loadStates()
  }, [open, statesLoaded, loadStates])
  const stateNames = useMemo(
    () => [...new Set((states.data?.content ?? []).map(s => s.name))].sort(),
    [states.data],
  )

  const changes = useMemo(() => diff(original, form), [original, form])
  const errors = useMemo(() => validate(changes), [changes])
  const changedCount = Object.keys(changes).length
  const canSave = changedCount > 0 && Object.keys(errors).length === 0 && !saving

  const set = (f: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }))

  const close = () => { if (!saving) onClose() }

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      await updateCustomer(customer.id, changes)
      onSaved()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update customer')
    } finally {
      setSaving(false)
    }
  }

  const input = (f: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-1">
      <label htmlFor={`edit-${f}`} className={labelCls}>
        {label}{REQUIRED.includes(f) && <span className="text-red-400"> *</span>}
      </label>
      <input
        id={`edit-${f}`}
        className={inputCls}
        value={form[f]}
        onChange={set(f)}
        disabled={saving}
        aria-invalid={!!errors[f]}
        {...props}
      />
      {errors[f] && <p className="text-[11px] font-semibold text-red-600">{errors[f]}</p>}
    </div>
  )

  return (
    <Modal open={open} onClose={close} title="Edit Customer Details" width="max-w-2xl">
      <form className="space-y-5" onSubmit={e => { e.preventDefault(); save() }} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {input('firstName', 'First Name', { autoComplete: 'off' })}
          {input('middleName', 'Middle Name', { autoComplete: 'off' })}
          {input('lastName', 'Last Name', { autoComplete: 'off' })}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {input('email', 'Email', { type: 'email', autoComplete: 'off' })}
          {input('phoneNumber', 'Phone Number', { type: 'tel', inputMode: 'numeric', maxLength: 11, placeholder: '08012345678' })}
          {input('dateOfBirth', 'Date of Birth', { type: 'date', max: new Date().toISOString().slice(0, 10) })}
          {input('accountOfficerCode', 'Account Officer Code')}
          {input('stateOfOrigin', 'State of Origin', { list: 'edit-customer-states' })}
          {input('lgaOfOrigin', 'LGA of Origin')}
          {input('occupation', 'Occupation')}
          {input('employer', 'Employer')}
        </div>
        <datalist id="edit-customer-states">
          {stateNames.map(n => <option key={n} value={n} />)}
        </datalist>
        <div className="space-y-1">
          <label htmlFor="edit-residentialAddress" className={labelCls}>Residential Address</label>
          <textarea
            id="edit-residentialAddress"
            className={inputCls}
            rows={2}
            value={form.residentialAddress}
            onChange={set('residentialAddress')}
            disabled={saving}
          />
        </div>
        {input('nextOfKin', 'Next of Kin')}

        {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <p className="text-xs text-slate-400 flex-1">
            {changedCount === 0 ? 'No changes yet' : `${changedCount} field${changedCount === 1 ? '' : 's'} changed`}
          </p>
          <Button type="button" variant="secondary" onClick={close} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={!canSave}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
