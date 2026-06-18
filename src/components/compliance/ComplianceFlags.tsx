import { useState } from 'react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { getComplianceStats, getComplianceFlags, resolveComplianceFlag } from '../../api'
import type { ComplianceFlag, ComplianceStats, PaginatedData } from '../../api/types'

function severityBadge(s: string): 'red' | 'amber' | 'blue' | 'gray' {
  if (s === 'CRITICAL') return 'red'
  if (s === 'HIGH') return 'amber'
  if (s === 'MEDIUM') return 'blue'
  return 'gray'
}

export function ComplianceFlags() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<ComplianceFlag | null>(null)
  const [notes, setNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const stats = useApi<ComplianceStats>(async () => {
    const res = await getComplianceStats()
    return res.data
  })

  const flags = useApi<PaginatedData<ComplianceFlag>>(async () => {
    const res = await getComplianceFlags({ status: statusFilter || undefined })
    return res.data
  }, [statusFilter])

  const handleResolve = async () => {
    if (!selected || !user) return
    setActionLoading(true)
    setActionError('')
    try {
      await resolveComplianceFlag(selected.id, { resolvedBy: user.adminId, notes: notes || 'Resolved by admin.' })
      setSelected(null)
      setNotes('')
      flags.refetch()
      stats.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const s = stats.data

  const columns: ColumnDef<ComplianceFlag>[] = [
    {
      header: 'Target',
      accessorKey: 'targetType',
      cell: (flag) => (
        <>
          <p className="text-xs font-semibold text-slate-600 uppercase">{flag.targetType ?? '—'}</p>
          <p className="text-xs text-slate-400 font-mono">{flag.targetId?.slice(0, 12) ?? '—'}</p>
        </>
      ),
    },
    {
      header: 'Reason',
      accessorKey: 'reason',
      cell: (flag) => (
        <p className="text-sm text-slate-700 max-w-[200px] truncate">{flag.reason ?? '—'}</p>
      ),
    },
    {
      header: 'Severity',
      accessorKey: 'severity',
      cell: (flag) => <Badge label={flag.severity ?? '—'} variant={severityBadge(flag.severity ?? '')} />,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (flag) => <Badge label={flag.status ?? '—'} variant={statusBadge(flag.status ?? '')} />,
    },
    {
      header: 'Raised By',
      accessorKey: 'raisedBy',
      cell: (flag) => <p className="text-xs text-slate-500 font-mono">{flag.raisedBy?.slice(0, 10) ?? '—'}</p>,
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: (flag) => (
        <p className="text-xs text-slate-500">{flag.createdAt ? new Date(flag.createdAt).toLocaleDateString() : '—'}</p>
      ),
    },
    {
      header: 'Action',
      sortable: false,
      cell: (flag) =>
        flag.status !== 'RESOLVED' ? (
          <Button size="sm" onClick={() => { setSelected(flag); setNotes(''); setActionError('') }}>
            Resolve
          </Button>
        ) : null,
    },
  ]

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Open', value: s?.open ?? 0, color: 'text-red-600 bg-red-50' },
          { label: 'Under Review', value: s?.underReview ?? 0, color: 'text-amber-600 bg-amber-50' },
          { label: 'Resolved', value: s?.resolved ?? 0, color: 'text-emerald-600 bg-emerald-50' },
        ].map(item => (
          <div key={item.label} className={`rounded-xl px-5 py-4 ${item.color}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{item.label}</p>
            <p className="text-2xl font-black mt-1">{stats.loading ? '…' : item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-4 w-fit">
        {[
          { value: '', label: 'All' },
          { value: 'OPEN', label: 'Open' },
          { value: 'UNDER_REVIEW', label: 'Under Review' },
          { value: 'RESOLVED', label: 'Resolved' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${statusFilter === f.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {flags.loading && <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>}
      {flags.error && <div className="px-6 py-12 text-center text-sm text-red-500">{flags.error}</div>}

      {!flags.loading && !flags.error && (
        <DataTable<ComplianceFlag>
          columns={columns}
          data={flags.data?.content ?? []}
          searchPlaceholder="Search flags…"
          emptyMessage="No compliance flags found."
        />
      )}

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Resolve Compliance Flag">
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{selected.targetType}</p>
                <p className="text-sm font-bold text-slate-800">{selected.reason}</p>
              </div>
              <Badge label={selected.severity} variant={severityBadge(selected.severity)} size="md" />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Resolution Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Describe how this flag was resolved…"
                rows={3}
                className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700 resize-none"
              />
            </div>

            {actionError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{actionError}</p>
            )}

            <div className="h-px bg-slate-100" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>Cancel</Button>
              <Button variant="success" className="flex-1" onClick={handleResolve} disabled={actionLoading}>
                {actionLoading ? 'Resolving…' : 'Mark Resolved'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
