import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getKycSubmissions, getKycSubmission, getKycSubmissionFiles, reviewKycSubmission, type KycSubmissionPage, type KycSubmissionRecord } from '../../api'
import type { ReviewKycSubmission } from '../../api/dynamicKycTypes'
import { Button } from '../ui/Button'

const inputClass = 'mt-1 block w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800'
const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value) : '—'

// The API currently publishes no populated submission/file response schema.
// Preserve every returned field instead of silently discarding unknown answers.
export function SubmissionValues({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (depth > 12) return <pre className="overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
  if (value == null) return <span className="text-slate-500">—</span>
  if (typeof value === 'string') {
    if (/^[\[{]/.test(value.trim())) {
      try { return <SubmissionValues value={JSON.parse(value)} depth={depth + 1} /> } catch { /* plain text answer */ }
    }
    if (/^https?:\/\//i.test(value)) {
      try {
        const url = new URL(value)
        if (!url.username && !url.password) return <a className="break-all text-blue-700 underline" href={url.href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{value}</a>
      } catch { /* display malformed links as text */ }
    }
    return <span className="whitespace-pre-wrap break-words">{value || '—'}</span>
  }
  if (Array.isArray(value)) return value.length ? <ul className="space-y-3">{value.map((item, index) => <li key={index} className="rounded border border-slate-100 p-3"><SubmissionValues value={item} depth={depth + 1} /></li>)}</ul> : <span>No records.</span>
  if (typeof value === 'object') return <dl className="space-y-3">{Object.entries(value).map(([key, item]) => <div key={key}><dt className="text-sm font-semibold text-slate-600">{key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ')}</dt><dd className="mt-1 text-sm"><SubmissionValues value={item} depth={depth + 1} /></dd></div>)}</dl>
  return <span>{String(value)}</span>
}

export function KYCSubmissionReview() {
  const [status, setStatus] = useState('PENDING')
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [list, setList] = useState<KycSubmissionPage | null>(null)
  const [listError, setListError] = useState('')
  const [selected, setSelected] = useState<KycSubmissionRecord | null>(null)
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [files, setFiles] = useState<unknown>(null)
  const [filesLoaded, setFilesLoaded] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailAttempt, setDetailAttempt] = useState(0)
  const [decision, setDecision] = useState<ReviewKycSubmission['decision']>('APPROVED')
  const [notes, setNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    setList(null); setListError('')
    void getKycSubmissions(status, page).then(data => { if (!cancelled) setList(data) })
      .catch(e => { if (!cancelled) setListError(e.message || 'Could not load submissions.') })
    return () => { cancelled = true }
  }, [status, page, refresh])
  useEffect(() => {
    let cancelled = false
    setDetail(null); setFiles(null); setFilesLoaded(false); setError(''); setConfirmed(false); setNotes(''); setMessage('')
    if (!selected) { setDetailLoading(false); return }
    setDetailLoading(true)
    void Promise.all([getKycSubmission(selected.id), getKycSubmissionFiles(selected.id)]).then(([record, attachments]) => {
      if (cancelled) return
      if (record.id != null && record.id !== selected.id) throw new Error('The returned submission does not match your selection. Please retry.')
      setDetail(record); setFiles(attachments); setFilesLoaded(true)
    }).catch(e => { if (!cancelled) setError(e.message || 'Could not load this submission and its documents.') })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [selected, detailAttempt])

  const reviewable = detail !== null && filesLoaded && (detail.status ?? selected?.status) === 'PENDING'
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (lock.current || !selected || !reviewable) return
    setError(''); setMessage('')
    if (!notes.trim() || !confirmed) { setError('Enter review notes and confirm you have checked the submitted information.'); return }
    lock.current = true; setBusy(true)
    try {
      await reviewKycSubmission(selected.id, { decision, notes: notes.trim() })
      setDetail(previous => previous ? { ...previous, status: decision, notes: notes.trim() } : previous)
      setMessage(`Submission ${decision === 'APPROVED' ? 'approved' : 'rejected'}.`)
      setConfirmed(false); setRefresh(n => n + 1)
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save the review. Please try again.') }
    finally { lock.current = false; setBusy(false) }
  }

  return <div className="space-y-6">
    <div><h2 className="text-lg font-bold text-slate-800">Process submissions</h2><p className="mt-1 text-sm text-slate-500">Open a submission to inspect the customer's information and supporting documents before reviewing it.</p></div>
    <div className="flex items-end gap-3"><label className="text-sm">Submission status<select className={inputClass} value={status} disabled={busy} onChange={e => { setStatus(e.target.value); setPage(0); setSelected(null) }}>
      <option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
    </select></label><Button disabled={busy || (!list && !listError)} onClick={() => setRefresh(n => n + 1)}>Refresh submissions</Button></div>
    {listError ? <p role="alert" className="text-red-700">{listError}</p> : !list ? <p role="status">Loading submissions…</p> : <>
      {list.content.length === 0 ? <p className="rounded-xl border bg-white p-6">No submissions found for this filter.</p> : <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead><tr>{['Process', 'Customer', 'Status', 'Submitted', 'Action'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{list.content.map(row => <tr key={row.id} className="border-t">
        <td className="p-3">{text(row.processName ?? row.processCode)}<p className="text-xs text-slate-500">{row.id}</p></td><td className="p-3">{text(row.customerName ?? row.customerId)}</td><td className="p-3">{text(row.status)}</td><td className="p-3">{text(row.submittedAt ?? row.createdAt)}</td>
        <td className="p-3"><Button disabled={busy} onClick={() => setSelected(row)}>View submission</Button></td>
      </tr>)}</tbody></table></div>}
      <div className="flex items-center gap-3"><Button disabled={busy || page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button><span>Page {page + 1} of {Math.max(1, list.totalPages)} · {list.totalElements} submissions</span><Button disabled={busy || page + 1 >= list.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button></div>
    </>}
    {selected && <section className="space-y-4 rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Submission {selected.id}</h3><Button disabled={busy || detailLoading} onClick={() => setDetailAttempt(n => n + 1)}>Reload submission</Button></div>
      {detailLoading && <p role="status">Loading information and documents…</p>}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-800">{message}</p>}
      {detail && <div className="grid gap-6 lg:grid-cols-2"><div><h4 className="mb-3 font-semibold">Submitted information</h4><SubmissionValues value={detail} /></div><div><h4 className="mb-3 font-semibold">Supporting documents</h4><SubmissionValues value={files} /></div></div>}
      {reviewable && <form onSubmit={e => void submit(e)} className="max-w-2xl border-t pt-4"><fieldset disabled={busy} className="space-y-4">
        <label className="block text-sm">Decision<select value={decision} onChange={e => { setDecision(e.target.value as ReviewKycSubmission['decision']); setConfirmed(false) }} className={inputClass}><option value="APPROVED">Approve</option><option value="REJECTED">Reject</option></select></label>
        <label className="block text-sm">Review notes<textarea required value={notes} onChange={e => setNotes(e.target.value)} rows={4} className={inputClass} /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I have checked this submission’s answers and supporting documents.</label>
        <Button type="submit" disabled={busy} variant={decision === 'APPROVED' ? 'success' : 'danger'}>{busy ? 'Saving…' : decision === 'APPROVED' ? 'Approve submission' : 'Reject submission'}</Button>
      </fieldset></form>}
    </section>}
  </div>
}
