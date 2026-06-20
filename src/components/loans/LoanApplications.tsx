import { useState } from 'react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  getLoanApplications, approveLoanApplication, declineLoanApplication,
  disburseLoan
} from '../../api'
import type { LoanApplication, PaginatedData } from '../../api/types'

const fmt = (amount: number | undefined | null) =>
  amount == null ? '—' : `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

const STATUS_FILTERS = ['', 'PENDING', 'APPROVED', 'DECLINED', 'DISBURSED']

export function LoanApplications() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<LoanApplication | null>(null)
  const [action, setAction] = useState<'approve' | 'decline' | 'disburse' | null>(null)
  const [approvedAmount, setApprovedAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()

  const apps = useApi<PaginatedData<LoanApplication>>(async () => {
    const res = await getLoanApplications({ status: statusFilter || undefined })
    return res.data
  }, [statusFilter])

  const openAction = (app: LoanApplication, a: 'approve' | 'decline' | 'disburse') => {
    setSelected(app)
    setAction(a)
    setApprovedAmount(String(app.requestedAmount ?? app.amount ?? 0))
    setNotes('')
    setDeclineReason('')
    setActionError('')
  }

  const handleView = (app: LoanApplication) => {
    navigate(`/loans/application/${app.id}`)
  }

  const handleAction = async () => {
    if (!selected || !user || !action) return
    setActionLoading(true)
    setActionError('')
    try {
      if (action === 'approve') {
        await approveLoanApplication(selected.id, {
          adminId: user.adminId,
          approvedAmount: parseFloat(approvedAmount),
          notes: notes || 'Approved by admin.',
        })
      } else if (action === 'decline') {
        await declineLoanApplication(selected.id, {
          adminId: user.adminId,
          declineReason: declineReason || 'Does not meet lending criteria.',
          notes: notes || '',
        })
      } else if (action === 'disburse') {
        await disburseLoan(selected.id, user.adminId)
      }
      setSelected(null)
      setAction(null)
      apps.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const fieldClass = 'w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700'

  const columns: ColumnDef<LoanApplication>[] = [
    {
      header: 'Application ID',
      accessorKey: 'id',
      cell: (app) => <p className="text-xs font-mono text-slate-500">{app.id?.slice(0, 12) ?? '—'}</p>,
    },
    {
      header: 'Customer',
      accessorKey: 'customer',
      cell: (app) => {
        const name = app.customer
          ? `${app.customer.firstName ?? ''} ${app.customer.lastName ?? ''}`.trim() || '—'
          : app.customerName ?? '—'
        const id = app.customer?.id ?? app.customerId
        return (
          <>
            <p className="text-sm font-semibold text-slate-700">{name}</p>
            <p className="text-xs text-slate-400 font-mono">{id?.slice(0, 10) ?? '—'}</p>
          </>
        )
      },
    },
    {
      header: 'Amount',
      accessorKey: 'requestedAmount',
      cell: (app) => (
        <>
          <p className="text-sm font-semibold text-slate-700">{fmt(app.requestedAmount ?? app.amount)}</p>
          {app.approvedAmount != null && <p className="text-xs text-emerald-600">Approved: {fmt(app.approvedAmount)}</p>}
        </>
      ),
    },
    {
      header: 'Tenure',
      accessorKey: 'tenureMonths',
      cell: (app) => <span className="text-sm text-slate-600">{app.tenureMonths ? `${app.tenureMonths} mo` : '—'}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (app) => <Badge label={app.status} variant={statusBadge(app.status)} />,
    },
    {
      header: 'Applied',
      accessorKey: 'createdAt',
      cell: (app) => (
        <p className="text-xs text-slate-500">
          {(app.createdAt ?? app.appliedAt)
            ? new Date((app.createdAt ?? app.appliedAt)!).toLocaleDateString()
            : '—'}
        </p>
      ),
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (app) => (
        <div className="flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => handleView(app)}>View</Button>
          {app.status === 'PENDING' && (
            <>
              <Button size="sm" variant="success" onClick={() => openAction(app, 'approve')}>Approve</Button>
              <Button size="sm" variant="danger" onClick={() => openAction(app, 'decline')}>Decline</Button>
            </>
          )}
          {app.status === 'APPROVED' && (
            <Button size="sm" onClick={() => openAction(app, 'disburse')}>Disburse</Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4 w-fit">
        {STATUS_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${statusFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {apps.loading && <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>}
      {apps.error && <div className="px-6 py-12 text-center text-sm text-red-500">{apps.error}</div>}

      {!apps.loading && !apps.error && (
        <DataTable<LoanApplication>
          columns={columns}
          data={apps.data?.content ?? []}
          searchPlaceholder="Search applications…"
          emptyMessage="No applications found."
        />
      )}

      {selected && action && (
        <Modal
          open={!!selected}
          onClose={() => { setSelected(null); setAction(null) }}
          title={action === 'approve' ? 'Approve Loan Application' : action === 'decline' ? 'Decline Loan Application' : 'Disburse Loan'}
        >
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Requested Amount</p>
              <p className="text-xl font-black text-slate-800">{fmt(selected.requestedAmount ?? selected.amount ?? 0)}</p>
            </div>

            {action === 'approve' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Approved Amount (₦)</label>
                <input type="number" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} className={fieldClass} />
              </div>
            )}

            {action === 'decline' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Decline Reason</label>
                <input value={declineReason} onChange={e => setDeclineReason(e.target.value)} className={fieldClass} placeholder="e.g. Insufficient turnover" />
              </div>
            )}

            {action !== 'disburse' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${fieldClass} resize-none`} placeholder="Optional notes…" />
              </div>
            )}

            {action === 'disburse' && (
              <p className="text-sm text-slate-600">Confirm that you want to disburse <span className="font-bold">{fmt(selected.approvedAmount ?? selected.requestedAmount ?? selected.amount)}</span> to this customer. This action cannot be undone.</p>
            )}

            {actionError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{actionError}</p>
            )}

            <div className="h-px bg-slate-100" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setSelected(null); setAction(null) }}>Cancel</Button>
              <Button
                className="flex-1"
                variant={action === 'decline' ? 'danger' : action === 'approve' ? 'success' : 'primary'}
                onClick={handleAction}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing…' : action === 'approve' ? 'Approve' : action === 'decline' ? 'Decline' : 'Disburse'}
              </Button>
            </div>
          </div>
        </Modal>
      )}


    </>
  )
}
