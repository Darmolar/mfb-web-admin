import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createKycProcess, createKycRequirement, updateKycProcess, updateKycRequirement, getKycProcesses, getKycRequirements, deleteKycRequirement, deleteKycProcess } from '../../api'
import type { CreateKycProcess, CreateKycRequirement } from '../../api/dynamicKycTypes'
import type { KycProcess, ConfiguredKycRequirement } from '../../api/kycConfiguration'
import { Button } from '../ui/Button'

const blankProcess: CreateKycProcess = { code: '', name: '', description: '', category: 'INFO_UPDATE' }
const blankRequirement: CreateKycRequirement = { requirementType: 'FIELD', fieldKey: '', label: '', description: '', required: true, sortOrder: 1 }
const inputClass = 'mt-1 block w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800'

export function KYCConfiguration() {
  const [process, setProcess] = useState(blankProcess)
  const [editProcess, setEditProcess] = useState(false)
  const [active, setActive] = useState(true)
  const [editRequirement, setEditRequirement] = useState(false)
  const [requirementId, setRequirementId] = useState('')
  const [processCode, setProcessCode] = useState('')
  const [requirement, setRequirement] = useState(blankRequirement)
  const [busy, setBusy] = useState(false)
  const locked = useRef(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [processes, setProcesses] = useState<KycProcess[]>([])
  const [selectedCode, setSelectedCode] = useState('')
  const [requirements, setRequirements] = useState<ConfiguredKycRequirement[]>([])
  const [refresh, setRefresh] = useState(0)
  // Requirement edits reload only the requirement list, not every process.
  const [requirementsRefresh, setRequirementsRefresh] = useState(0)
  const [listError, setListError] = useState('')
  const [requirementsError, setRequirementsError] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [loadingRequirements, setLoadingRequirements] = useState(false)
  useEffect(() => {
    let cancelled = false
    setLoadingList(true); setListError('')
    void getKycProcesses().then(items => { if (!cancelled) setProcesses(items) })
      .catch(e => { if (!cancelled) setListError(e.message || 'Could not load processes.') })
      .finally(() => { if (!cancelled) setLoadingList(false) })
    return () => { cancelled = true }
  }, [refresh])
  useEffect(() => {
    let cancelled = false
    setRequirements([]); setRequirementsError('')
    if (!selectedCode) { setLoadingRequirements(false); return }
    setLoadingRequirements(true)
    void getKycRequirements(selectedCode).then(items => { if (!cancelled) setRequirements(items) })
      .catch(e => { if (!cancelled) setRequirementsError(e.message || 'Could not load requirements.') })
      .finally(() => { if (!cancelled) setLoadingRequirements(false) })
    return () => { cancelled = true }
  }, [selectedCode, refresh, requirementsRefresh])

  function selectProcess(code: string) {
    setSelectedCode(code); setProcessCode(code); setRequirement(blankRequirement); setRequirementId(''); setEditRequirement(false)
    setMessage(''); setError('')
    const existing = processes.find(p => p.code === code)
    setEditProcess(!!existing)
    setProcess(existing ? { code, name: existing.name, description: existing.description, category: existing.category } : blankProcess)
    setActive(existing?.active ?? true)
  }
  async function removeRequirement(item: ConfiguredKycRequirement) {
    if (locked.current || !window.confirm(`Remove “${item.label}” from ${item.processCode}? Customers will no longer be asked for it in new submissions.`)) return
    locked.current = true; setBusy(true); setError(''); setMessage('')
    try {
      await deleteKycRequirement(item.id)
      setMessage(`Removed ${item.label}.`)
      if (requirementId === item.id) { setRequirementId(''); setEditRequirement(false); setRequirement(blankRequirement) }
      setRequirementsRefresh(n => n + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not remove the requirement.') }
    finally { locked.current = false; setBusy(false) }
  }

  async function removeProcess(code: string) {
    const name = processes.find(p => p.code === code)?.name || code
    if (locked.current || !window.confirm(`Delete the process “${name}”? Customers will no longer see it. Switching it to Inactive keeps it for later instead.`)) return
    locked.current = true; setBusy(true); setError(''); setMessage('')
    try {
      await deleteKycProcess(code)
      setMessage(`Deleted ${name}.`)
      setSelectedCode(''); setEditProcess(false); setProcess(blankProcess)
      setRefresh(n => n + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete the process.') }
    finally { locked.current = false; setBusy(false) }
  }

  async function save(event: FormEvent, kind: 'process' | 'requirement') {
    event.preventDefault()
    if (locked.current) return
    locked.current = true
    setBusy(true); setError(''); setMessage('')
    try {
      if (kind === 'process') {
        if (!process.code.trim() || !process.name.trim()) throw new Error('Enter a process code and name.')
        const code = process.code.trim()
        const payload = { name: process.name.trim(), description: process.description.trim(), category: process.category }
        if (editProcess) await updateKycProcess(code, { ...payload, active })
        else await createKycProcess({ ...payload, code })
        setProcessCode(code)
        setSelectedCode(code)
        setProcess(blankProcess)
        setMessage(editProcess ? `${code} updated.` : `${code} created. You can now add its requirements below.`)
      } else {
        if (!requirement.label.trim()) throw new Error('Enter a customer-facing label.')
        if (editRequirement && !requirementId.trim()) throw new Error('Enter the requirement ID.')
        if (!editRequirement && (!processCode.trim() || !requirement.fieldKey.trim())) throw new Error('Enter the process code and field key.')
        if (!editRequirement && requirement.fieldKey.trim() === 'fieldAnswers') throw new Error('fieldAnswers is reserved. Choose another field key.')
        if (!Number.isInteger(requirement.sortOrder) || requirement.sortOrder < 0) throw new Error('Display order must be a non-negative whole number.')
        const payload = { label: requirement.label.trim(), description: requirement.description.trim(), required: requirement.required, sortOrder: requirement.sortOrder }
        if (editRequirement) await updateKycRequirement(requirementId.trim(), payload)
        else await createKycRequirement(processCode.trim(), { ...payload, requirementType: requirement.requirementType, fieldKey: requirement.fieldKey.trim() })
        setMessage(editRequirement ? `Requirement ${requirementId.trim()} updated.` : `Requirement added to ${processCode.trim()}.`)
        if (!editRequirement) setRequirement({ ...blankRequirement, sortOrder: requirement.sortOrder + 1 })
        setSelectedCode(processCode.trim())
      }
      if (kind === 'process') setRefresh(n => n + 1); else setRequirementsRefresh(n => n + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save. Please try again.')
    } finally {
      locked.current = false; setBusy(false)
    }
  }

  return <div className="space-y-6">
    <div><h2 className="text-lg font-bold text-slate-800">KYC processes</h2><p className="mt-1 text-sm text-slate-500">Define the information and supporting documents customers need to submit.</p></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-end gap-3">
        <label className="block flex-1 text-sm">Existing processes<select aria-label="Existing processes" className={inputClass} value={selectedCode} disabled={busy || loadingList} onChange={e => selectProcess(e.target.value)}>
          <option value="">Create a new process</option>
          {processes.map(p => <option key={p.code} value={p.code}>{p.name} — {p.active ? 'Active' : 'Inactive'}</option>)}
        </select></label>
        <Button disabled={busy || loadingList || loadingRequirements} onClick={() => setRefresh(n => n + 1)}>Refresh configuration</Button>
        {selectedCode && <Button variant="danger" disabled={busy || loadingList} onClick={() => void removeProcess(selectedCode)}>Delete process</Button>}
      </div>
      {loadingList && <p role="status">Loading processes…</p>}
      {listError && <p role="alert" className="text-red-700">{listError}</p>}
      {selectedCode && <>
        <h3 className="font-semibold">Requirements for {selectedCode}</h3>
        {loadingRequirements ? <p role="status">Loading requirements…</p> : requirementsError ? <p role="alert" className="text-red-700">{requirementsError}</p> : requirements.length === 0 ? <p>No requirements configured yet.</p> :
          <ul className="divide-y divide-slate-100">{requirements.map(r => <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="font-medium">{r.label} <span className="text-sm text-slate-500">({r.required ? 'Required' : 'Optional'})</span></p><p className="text-sm text-slate-500">{r.requirementType === 'FIELD' ? 'Text field' : 'Document'} · {r.fieldKey} · Order {r.sortOrder}</p><p className="text-sm">{r.description}</p></div>
            <div className="flex gap-2"><Button disabled={busy} onClick={() => { setRequirement({ ...r, description: r.description || '' }); setRequirementId(r.id); setProcessCode(r.processCode); setEditRequirement(true); setMessage(''); setError('') }}>Edit {r.label}</Button>
              <Button variant="danger" disabled={busy} onClick={() => void removeRequirement(r)}>Remove {r.label}</Button></div>
          </li>)}</ul>}
      </>}
    </section>
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={e => void save(e, 'process')} className="rounded-xl border border-slate-200 bg-white p-5">
        <fieldset disabled={busy} className="space-y-4">
          <legend className="mb-4 font-semibold text-slate-800">{editProcess ? 'Update a process' : 'Create a process'}</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editProcess} onChange={e => { setEditProcess(e.target.checked); setProcess(blankProcess); setActive(true); setMessage(''); setError('') }} />Edit an existing process</label>
          {editProcess && <p className="text-sm text-slate-500">Select an existing process above to load its current details, or enter the process code and complete updated details.</p>}
          <label className="block text-sm">Process code<input required value={process.code} onChange={e => setProcess({ ...process, code: e.target.value })} placeholder="NEXT_OF_KIN_UPDATE" className={inputClass} /></label>
          <label className="block text-sm">Name<input required value={process.name} onChange={e => setProcess({ ...process, name: e.target.value })} className={inputClass} /></label>
          <label className="block text-sm">Description<textarea value={process.description} onChange={e => setProcess({ ...process, description: e.target.value })} className={inputClass} /></label>
          <label className="block text-sm">Category<select value={process.category} onChange={e => setProcess({ ...process, category: e.target.value as CreateKycProcess['category'] })} className={inputClass}>{!['INFO_UPDATE', 'TIER_UPGRADE'].includes(process.category) && <option value={process.category}>{process.category}</option>}<option value="INFO_UPDATE">Personal information update</option><option value="TIER_UPGRADE">Tier upgrade</option></select></label>
          {editProcess && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />Active — customers can submit this process</label>}
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : editProcess ? 'Save process changes' : 'Create process'}</Button>
        </fieldset>
      </form>
      <form onSubmit={e => void save(e, 'requirement')} className="rounded-xl border border-slate-200 bg-white p-5">
        <fieldset disabled={busy} className="space-y-4">
          <legend className="mb-4 font-semibold text-slate-800">{editRequirement ? 'Update a requirement' : 'Add a requirement'}</legend>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editRequirement} onChange={e => { setEditRequirement(e.target.checked); setRequirement(blankRequirement); setRequirementId(''); setMessage(''); setError('') }} />Edit an existing requirement</label>
          {editRequirement && <label className="block text-sm">Requirement ID<input required value={requirementId} onChange={e => setRequirementId(e.target.value)} className={inputClass} /></label>}
          {!editRequirement && <>
          <label className="block text-sm">Process code<input required value={processCode} onChange={e => setProcessCode(e.target.value)} className={inputClass} /></label>
          <label className="block text-sm">Requirement type<select value={requirement.requirementType} onChange={e => setRequirement({ ...requirement, requirementType: e.target.value as CreateKycRequirement['requirementType'] })} className={inputClass}><option value="FIELD">Text field</option><option value="DOCUMENT">Supporting document</option></select></label>
          <label className="block text-sm">Field key<input required value={requirement.fieldKey} onChange={e => setRequirement({ ...requirement, fieldKey: e.target.value })} placeholder={requirement.requirementType === 'FIELD' ? 'nok_name' : 'NOK_ID'} className={inputClass} /></label>
          </>}
          <label className="block text-sm">Customer-facing label<input required value={requirement.label} onChange={e => setRequirement({ ...requirement, label: e.target.value })} className={inputClass} /></label>
          <label className="block text-sm">Instructions<textarea value={requirement.description} onChange={e => setRequirement({ ...requirement, description: e.target.value })} className={inputClass} /></label>
          <label className="block text-sm">Display order<input type="number" min="0" step="1" required value={Number.isNaN(requirement.sortOrder) ? '' : requirement.sortOrder} onChange={e => setRequirement({ ...requirement, sortOrder: e.target.value === '' ? NaN : Number(e.target.value) })} className={inputClass} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={requirement.required} onChange={e => setRequirement({ ...requirement, required: e.target.checked })} />Required</label>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : editRequirement ? 'Save requirement changes' : 'Add requirement'}</Button>
        </fieldset>
      </form>
    </div>
  </div>
}
