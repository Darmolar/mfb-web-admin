import { useState } from 'react'
import { Check, ExternalLink, ImageOff, Loader2, RefreshCw, X as XIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import moment from 'moment'
import {
  approveIdentityImageRequest, getIdentityImageRequests, getIdentityVerification, rejectIdentityImageRequest,
} from '../../api'
import { isOwnRequest, readImageRequests, usernameFromToken, type ImageRequest } from '../../api/approvals'
import { maskIdNumber, readIdentityRecord } from '../../api/identityVerification'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Skeleton } from '../ui/Skeleton'

// The backend lists PENDING by default and has no "all" filter.
const STATUS_FILTERS = ['PENDING', 'APPROVED', 'REJECTED']

export function ApprovalManagement() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const me = { username: usernameFromToken(user?.accessToken), email: user?.email, adminId: user?.adminId }
  const [status, setStatus] = useState('PENDING')
  const [review, setReview] = useState<ImageRequest | null>(null)
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, loading, error, refetch } = useApi(
    async () => readImageRequests((await getIdentityImageRequests({ status })).data).requests,
    [status],
  )

  // The request list carries no images, so load the live record to show the photo being replaced.
  const current = useApi(async () => {
    if (!review?.identityRecordId) return null
    return readIdentityRecord((await getIdentityVerification(review.identityRecordId)).data)
  }, [review?.identityRecordId])

  function openReview(request: ImageRequest) {
    setReview(request)
    setDecision('approve')
    setNotes('')
    setReviewError(null)
  }

  async function submitDecision() {
    if (!review || !notes.trim()) return
    setSubmitting(true)
    setReviewError(null)
    try {
      await (decision === 'approve'
        ? approveIdentityImageRequest(review.id, notes.trim())
        : rejectIdentityImageRequest(review.id, notes.trim()))
      setNotice(decision === 'approve'
        ? `Approved. ${review.fullName}'s new photo is now used for face verification.`
        : `Rejected. ${review.fullName}'s existing photo is unchanged.`)
      setReview(null)
      refetch()
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'The decision could not be saved.')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnDef<ImageRequest>[] = [
    {
      header: 'Customer',
      accessorKey: 'fullName',
      cell: r => (
        <div>
          <p className="text-sm font-semibold text-slate-700">{r.fullName}</p>
          <p className="text-[11px] text-slate-400 font-mono">{r.idType} {maskIdNumber(r.idNumber)}</p>
        </div>
      ),
    },
    {
      header: 'Reason',
      accessorKey: 'requestNotes',
      cell: r => <span className="text-xs text-slate-500 line-clamp-2">{r.requestNotes || '—'}</span>,
    },
    {
      header: 'Requested by',
      accessorKey: 'requestedBy',
      cell: r => (
        <div>
          <p className="text-xs font-semibold text-slate-600">{r.requestedBy || '—'}</p>
          <p className="text-[11px] text-slate-400">{r.createdAt ? moment(r.createdAt).format('DD MMM YYYY, HH:mm') : ''}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: r => (
        <div>
          <Badge label={r.status} variant={statusBadge(r.status)} />
          {r.reviewedBy && <p className="text-[11px] text-slate-400 mt-1">by {r.reviewedBy}</p>}
        </div>
      ),
    },
    {
      header: 'Actions',
      sortable: false,
      cell: r => {
        if (r.status !== 'PENDING') return <span className="text-xs text-slate-300">—</span>
        if (isOwnRequest(r, me)) return <span className="text-[11px] text-slate-400">Your request: needs another admin</span>
        return <Button size="sm" variant="secondary" onClick={() => openReview(r)}>Review</Button>
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Approval Management</h3>
          <p className="text-xs text-slate-500">
            Identity photo updates wait here until a different admin approves or rejects them. Approved photos are used for customers' face verification.
          </p>
        </div>
        <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer" title="Refresh">
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              status === f ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {notice && (
        <div className="text-xs text-slate-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex justify-between gap-4">
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
        <DataTable<ImageRequest>
          columns={columns}
          data={data ?? []}
          loading={loading && !data}
          searchPlaceholder="Search requests…"
          searchFields={['fullName', 'idNumber', 'requestedBy', 'requestNotes']}
          emptyMessage={status === 'PENDING' ? 'Nothing waiting for approval.' : 'No requests found.'}
        />
      )}

      <Modal open={!!review} onClose={() => setReview(null)} title="Review photo update" width="max-w-2xl">
        {review && (
          <div className="space-y-5">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-[11px] text-slate-400">Customer</dt><dd className="font-medium text-slate-700">{review.fullName}</dd></div>
              <div><dt className="text-[11px] text-slate-400">Identity</dt><dd className="font-medium text-slate-700 font-mono">{review.idType} {review.idNumber}</dd></div>
              <div><dt className="text-[11px] text-slate-400">Requested by</dt><dd className="font-medium text-slate-700">{review.requestedBy || '—'}</dd></div>
              <div><dt className="text-[11px] text-slate-400">Requested on</dt><dd className="font-medium text-slate-700">{review.createdAt ? moment(review.createdAt).format('DD MMM YYYY, HH:mm') : '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[11px] text-slate-400">Maker's reason</dt><dd className="font-medium text-slate-700">{review.requestNotes || '—'}</dd></div>
            </dl>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current photo</p>
                {current.loading
                  ? <Skeleton className="w-full h-56 rounded-xl" />
                  : current.data?.imageUrl
                    ? <img src={current.data.imageUrl} alt="Current" className="w-full h-56 object-cover rounded-xl border border-slate-200" />
                    : <div className="w-full h-56 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-300">{current.error ? 'Could not load' : 'No photo on record'}</div>}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">New photo</p>
                <div className="w-full h-56 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 flex flex-col items-center justify-center gap-2 px-4 text-center">
                  <ImageOff size={20} className="text-amber-400" />
                  <p className="text-[11px] text-amber-700">The server does not yet let reviewers view the submitted photo. Confirm it with the requester before approving.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/identity/${encodeURIComponent(review.identityRecordId)}`)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 cursor-pointer"
            >
              Open full identity record <ExternalLink size={12} />
            </button>

            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
              {(['approve', 'reject'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDecision(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${decision === d ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}
                >
                  {d === 'approve' ? 'Approve' : 'Reject'}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Notes <span className="text-red-400">*</span></label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={decision === 'approve' ? 'e.g. Verified in person; new photo matches ID documents.' : 'e.g. Photo quality too low; please resubmit.'}
              />
              <p className="text-[11px] text-slate-400 mt-1">Stored with the request for audit.</p>
            </div>
            {reviewError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{reviewError}</p>}
            <Button fullWidth variant={decision === 'approve' ? 'success' : 'danger'} disabled={!notes.trim() || submitting} onClick={submitDecision}>
              {submitting ? <Loader2 size={14} className="animate-spin" /> : decision === 'approve' ? <Check size={14} /> : <XIcon size={14} />}
              {decision === 'approve' ? 'Approve and apply photo' : 'Reject request'}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
