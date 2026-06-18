import { useState } from 'react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { getKycPending, getKycStats, approveKyc, rejectKyc } from '../../api'
import type { KycPendingItem, KycStats, PaginatedData } from '../../api/types'

export function KYCReview() {
  const { user } = useAuth()
  const [selected, setSelected] = useState<KycPendingItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notes, setNotes] = useState('')
  const [riskFilter, setRiskFilter] = useState<string>('')

  const stats = useApi<KycStats>(async () => {
    const res = await getKycStats()
    return res.data
  })

  const pending = useApi<PaginatedData<KycPendingItem>>(async () => {
    const res = await getKycPending(riskFilter || undefined)
    return res.data
  }, [riskFilter])

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selected || !user) return
    setActionLoading(true)
    setActionError('')
    try {
      const payload = { adminId: user.adminId, notes: notes || `KYC ${action}d by admin.` }
      if (action === 'approve') {
        await approveKyc(selected.id, payload)
      } else {
        await rejectKyc(selected.id, payload)
      }
      setSelected(null)
      setNotes('')
      pending.refetch()
      stats.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const s = stats.data

  const columns: ColumnDef<KycPendingItem>[] = [
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: (app) => (
        <>
          <p className="text-sm font-semibold text-slate-700">{app.customerName}</p>
          <p className="text-xs text-slate-400 font-mono">{app.id.slice(0, 8)}</p>
        </>
      ),
    },
    {
      header: 'Current Tier',
      accessorKey: 'currentTier',
      cell: (app) => <span className="text-xs font-semibold text-slate-600">Tier {app.currentTier}</span>,
    },
    {
      header: 'Requested Tier',
      accessorKey: 'requestedTier',
      cell: (app) => <span className="text-xs font-semibold text-slate-600">Tier {app.requestedTier}</span>,
    },
    {
      header: 'Risk Level',
      accessorKey: 'riskLevel',
      cell: (app) => <Badge label={app.riskLevel} variant={statusBadge(app.riskLevel)} />,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (app) => <Badge label={app.status} variant={statusBadge(app.status)} />,
    },
    {
      header: 'Action',
      sortable: false,
      cell: (app) => (
        <Button size="sm" onClick={() => { setSelected(app); setNotes(''); setActionError('') }}>Review</Button>
      ),
    },
  ]

  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Review', value: stats.loading ? '…' : s?.pending ?? 0, color: 'text-amber-600 bg-amber-50' },
          { label: 'Approved', value: stats.loading ? '…' : s?.approved ?? 0, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Rejected', value: stats.loading ? '…' : s?.rejected ?? 0, color: 'text-red-600 bg-red-50' },
          { label: 'High Risk', value: stats.loading ? '…' : s?.highRisk ?? 0, color: 'text-blue-600 bg-blue-50' },
        ].map(item => (
          <div key={item.label} className={`rounded-xl px-5 py-4 ${item.color}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{item.label}</p>
            <p className="text-2xl font-black mt-1">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4 w-fit">
        {['', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
          <button
            key={f}
            onClick={() => setRiskFilter(f)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${riskFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      {pending.loading && <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>}
      {pending.error && <div className="px-6 py-12 text-center text-sm text-red-500">{pending.error}</div>}

      {!pending.loading && !pending.error && (
        <DataTable<KycPendingItem>
          columns={columns}
          data={pending.data?.content ?? []}
          searchPlaceholder="Search KYC applications…"
          emptyMessage="No pending KYC applications."
        />
      )}

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Review KYC Application">
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-800">{selected.customerName}</h4>
                <p className="text-xs text-slate-400">Tier {selected.currentTier} → Tier {selected.requestedTier}</p>
              </div>
              <Badge label={selected.riskLevel} variant={statusBadge(selected.riskLevel)} size="md" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Admin Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add review notes (optional)…"
                rows={3}
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700 resize-none"
              />
            </div>

            {actionError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{actionError}</p>
            )}

            <div className="h-px bg-slate-100" />
            <div className="flex gap-3">
              <Button variant="danger" className="flex-1" onClick={() => handleAction('reject')} disabled={actionLoading}>
                {actionLoading ? 'Processing…' : 'Reject'}
              </Button>
              <Button variant="success" className="flex-1" onClick={() => handleAction('approve')} disabled={actionLoading}>
                {actionLoading ? 'Processing…' : 'Approve & Upgrade'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
