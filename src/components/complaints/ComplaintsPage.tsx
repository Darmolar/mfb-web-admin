import { useEffect, useRef, useState } from 'react'
import { getComplaints, getComplaint, respondToComplaint } from '../../api'
import type { Complaint, ComplaintStatus } from '../../api/types'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { LoadingRegion, Skeleton, SkeletonText } from '../ui/Skeleton'

const inputClass = 'w-full rounded-lg border border-slate-200 p-3 text-sm'
export function ComplaintsPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<ComplaintStatus | ''>('')
  const [page, setPage] = useState(0)
  const { data, loading, error, refetch } = useApi(() => getComplaints({ status: filter || undefined, page }).then(r => r.data), [filter, page])
  const [selected, setSelected] = useState<Complaint | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState<Exclude<ComplaintStatus, 'OPEN'>>('RESOLVED')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const detailRequest = useRef(0)
  const savingRef = useRef(false)
  useEffect(() => () => { detailRequest.current++ }, [])
  const open = async (id: string) => {
    const request = ++detailRequest.current
    setSelected(null); setDetailError(''); setDetailLoading(true); setNotice(''); setResponse(''); setStatus('RESOLVED')
    try {
      const res = await getComplaint(id)
      if (request === detailRequest.current) setSelected(res.data)
    } catch (e) {
      if (request === detailRequest.current) setDetailError(e instanceof Error ? e.message : 'Unable to load complaint.')
    } finally { if (request === detailRequest.current) setDetailLoading(false) }
  }
  const send = async () => {
    if (!selected || !user?.adminId || !response.trim() || savingRef.current) return
    savingRef.current = true; setSaving(true); setDetailError(''); setNotice('')
    try {
      const res = await respondToComplaint(selected.id, { adminId: user.adminId, response: response.trim(), status })
      setSelected(current => current?.id === res.data.id ? { ...current, ...res.data } : current)
      setResponse(''); setNotice(res.message || 'Response sent to customer.'); refetch()
    } catch (e) { setDetailError(e instanceof Error ? e.message : 'Response failed. Please retry.') }
    finally { savingRef.current = false; setSaving(false) }
  }
  return <div className="space-y-5">
    <h1 className="text-2xl font-bold text-slate-800">Customer complaints</h1>
    <div className="flex gap-3 items-center">
      <label htmlFor="complaint-filter">Status</label>
      <select id="complaint-filter" className="rounded-lg border p-2" value={filter} disabled={saving} onChange={e => { setFilter(e.target.value as ComplaintStatus | ''); setPage(0) }}>
        <option value="">All statuses</option>
        {(['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'] as const).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
      <Button variant="secondary" disabled={loading} onClick={refetch}>Refresh</Button>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="grid lg:grid-cols-2 gap-5">
      <div className="bg-white rounded-xl p-4 space-y-3">
        {loading && !data ? (
          // Shaped like the complaint buttons below.
          <LoadingRegion label="Loading complaints…" className="space-y-3">
            <Skeleton className="h-3 w-24" />
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <Skeleton className="h-3.5 w-3/5" /><Skeleton className="h-3 w-2/5" /><Skeleton className="h-2.5 w-1/3" />
              </div>
            ))}
          </LoadingRegion>
        ) : !error && <div className={`space-y-3 ${loading ? 'opacity-60' : ''}`} aria-busy={loading || undefined}>
          <p className="text-sm text-slate-500">{data?.totalElements ?? 0} complaints</p>
          {data?.content.length === 0 && <p>No complaints found.</p>}
          {data?.content.map(item => <button key={item.id} disabled={saving} onClick={() => open(item.id)} className="block w-full text-left border rounded-lg p-3 hover:bg-slate-50 disabled:opacity-50">
            <p className="font-semibold">{item.subject}</p>
            <p className="text-sm text-slate-600">{item.submitterName} · {item.submitterEmail}</p>
            <p className="text-xs text-slate-500">{item.status.replace('_', ' ')} · {item.createdAt.replace('T', ' ')}</p>
          </button>)}
        </div>}
        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={loading || saving || page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span>Page {page + 1}</span>
          <Button variant="secondary" disabled={loading || saving || !data || page + 1 >= data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 space-y-4">
        {detailLoading && (
          <LoadingRegion label="Loading complaint…" className="space-y-4">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/3" />
            <SkeletonText lines={4} />
            <Skeleton className="h-24 w-full rounded-lg" />
          </LoadingRegion>
        )}
        {!!detailError && <p role="alert" className="text-red-700">{detailError}</p>}
        {!!notice && <p role="status" className="text-green-700">{notice}</p>}
        {!selected && !detailLoading && <p>Select a complaint to view it and respond.</p>}
        {selected && <>
          <h2 className="text-xl font-bold">{selected.subject}</h2>
          <p>{selected.submitterName} · {selected.submitterEmail}</p>
          <p className="text-sm text-slate-500">{selected.status.replace('_', ' ')} · {selected.createdAt.replace('T', ' ')}</p>
          <p className="whitespace-pre-wrap break-words">{selected.message || 'No message provided.'}</p>
          {selected.adminResponse && <div className="bg-slate-50 rounded-lg p-3">
            <h3 className="font-semibold">Latest response</h3>
            <p className="whitespace-pre-wrap break-words">{selected.adminResponse}</p>
            <p className="text-xs text-slate-500">{selected.respondedAt?.replace('T', ' ')}</p>
          </div>}
          <form onSubmit={e => { e.preventDefault(); void send() }} className="space-y-3">
            <label htmlFor="complaint-response" className="block font-semibold">Response</label>
            <textarea id="complaint-response" className={inputClass} rows={5} value={response} onChange={e => setResponse(e.target.value)} disabled={saving} required />
            <label htmlFor="response-status" className="block">New status</label>
            <select id="response-status" className={inputClass} value={status} disabled={saving} onChange={e => setStatus(e.target.value as typeof status)}>
              <option value="IN_REVIEW">In review</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option>
            </select>
            <p className="text-sm text-slate-500">The customer will receive your response by email.</p>
            <Button type="submit" disabled={saving || !response.trim() || !user?.adminId}>{saving ? 'Sending…' : 'Send response'}</Button>
          </form>
        </>}
      </div>
    </div>
  </div>
}
