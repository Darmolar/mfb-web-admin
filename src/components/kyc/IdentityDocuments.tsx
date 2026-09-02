import { useState } from 'react'
import { Check, X as XIcon, Loader2 } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { getIdentityDocuments, reviewIdentityDocument } from '../../api'
import type { IdentityDocument, PaginatedData } from '../../api/types'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import moment from 'moment'

export function IdentityDocuments() {
  const { user } = useAuth()
  const [reviewDoc, setReviewDoc] = useState<IdentityDocument | null>(null)
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [reason, setReason] = useState('')
  const [reviewLoading, setReviewLoading] = useState(false)

  const { data, refetch } = useApi<PaginatedData<IdentityDocument>>(async () => {
    const res = await getIdentityDocuments({ size: 100 })
    return res.data
  }, [])

  const docs = data?.content ?? []

  const handleReview = async () => {
    if (!reviewDoc) return
    setReviewLoading(true)
    try {
      await reviewIdentityDocument(reviewDoc.id, {
        adminId: user!.adminId,
        decision,
        reason: reason.trim() || undefined,
      })
      setReviewDoc(null)
      setReason('')
      refetch()
    } catch (e: any) {
      alert('Review failed: ' + (e.message || 'Unknown error'))
    } finally {
      setReviewLoading(false)
    }
  }

  const columns: ColumnDef<IdentityDocument>[] = [
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: (r) => <span className="font-semibold text-slate-700">{r.customerName || r.customerId}</span>,
    },
    {
      header: 'Document Type',
      accessorKey: 'documentType',
      cell: (r) => <span className="text-xs font-bold text-slate-500 uppercase">{r.documentType}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (r) => <Badge label={r.status} variant={statusBadge(r.status)} />,
    },
    {
      header: 'Submitted',
      accessorKey: 'submittedAt',
      cell: (r) => <span className="text-xs text-slate-400">{r.submittedAt ? moment(r.submittedAt).format('DD MMM YYYY') : '—'}</span>,
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (r) =>
        r.status === 'PENDING' ? (
          <div className="flex gap-1">
            <button
              className="p-1.5 text-emerald-500 hover:text-emerald-700 cursor-pointer"
              onClick={() => { setDecision('approve'); setReviewDoc(r) }}
            >
              <Check size={14} />
            </button>
            <button
              className="p-1.5 text-red-400 hover:text-red-600 cursor-pointer"
              onClick={() => { setDecision('reject'); setReviewDoc(r) }}
            >
              <XIcon size={14} />
            </button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-700">Alternative Identity Documents</h3>

      <DataTable
        columns={columns}
        data={docs}
        searchPlaceholder="Search documents..."
        emptyMessage="No identity documents submitted."
      />

      <Modal
        open={!!reviewDoc}
        onClose={() => setReviewDoc(null)}
        title={decision === 'approve' ? 'Approve Document' : 'Reject Document'}
        width="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {decision === 'approve'
              ? 'This will approve the document and contribute to the customer\'s KYC tier.'
              : 'This will reject the document. Please provide a reason.'}
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Reason {decision === 'reject' ? '(required)' : '(optional)'}
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Enter reason..."
            />
          </div>
          <Button
            fullWidth
            variant={decision === 'approve' ? 'success' : 'danger'}
            disabled={reviewLoading || (decision === 'reject' && !reason.trim())}
            onClick={handleReview}
          >
            {reviewLoading ? <Loader2 size={14} className="animate-spin" /> : decision === 'approve' ? <Check size={14} /> : <XIcon size={14} />}
            {decision === 'approve' ? 'Approve' : 'Reject'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
