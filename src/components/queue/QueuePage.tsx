import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { getQueueStats, getFailedJobs, retryFailedJob, resolveFailedJob } from '../../api'
import type { QueueStats, FailedJob, PaginatedData } from '../../api/types'

function jobStatusVariant(s: string): 'red' | 'amber' | 'green' | 'gray' {
  if (s === 'FAILED') return 'red'
  if (s === 'RETRYING') return 'amber'
  if (s === 'RESOLVED') return 'green'
  return 'gray'
}

export function QueuePage() {
  const { user } = useAuth()
  const [selected, setSelected] = useState<FailedJob | null>(null)
  const [pendingAction, setPendingAction] = useState<'retry' | 'resolve' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const stats = useApi<QueueStats>(async () => {
    const res = await getQueueStats()
    return res.data
  })

  const jobs = useApi<PaginatedData<FailedJob>>(async () => {
    const res = await getFailedJobs()
    return res.data
  })

  const handleAction = async () => {
    if (!selected || !user || !pendingAction) return
    setActionLoading(true)
    setActionError('')
    try {
      if (pendingAction === 'retry') {
        await retryFailedJob(selected.id, { resolvedBy: user.adminId })
      } else {
        await resolveFailedJob(selected.id, { resolvedBy: user.adminId })
      }
      setSelected(null)
      setPendingAction(null)
      jobs.refetch()
      stats.refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const queueEntries = Object.entries(stats.data?.queues ?? {})
  const failedSummary = Object.entries(stats.data?.failedJobSummary ?? {})

  const columns: ColumnDef<FailedJob>[] = [
    {
      header: 'Queue',
      accessorKey: 'queueName',
      cell: (job) => <p className="text-xs font-semibold text-slate-600">{job.queueName}</p>,
    },
    {
      header: 'Job Type',
      accessorKey: 'jobType',
      cell: (job) => <p className="text-xs text-slate-700">{job.jobType}</p>,
    },
    {
      header: 'Error',
      accessorKey: 'errorMessage',
      cell: (job) => (
        <p className="text-xs text-red-600 max-w-[180px] truncate" title={job.errorMessage}>{job.errorMessage}</p>
      ),
    },
    {
      header: 'Attempts',
      accessorKey: 'attempts',
      cell: (job) => <span className="text-sm font-bold text-slate-700">{job.attempts}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (job) => <Badge label={job.status} variant={jobStatusVariant(job.status)} />,
    },
    {
      header: 'Failed At',
      accessorKey: 'failedAt',
      cell: (job) => (
        <p className="text-xs text-slate-500">{job.failedAt ? new Date(job.failedAt).toLocaleString() : '—'}</p>
      ),
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (job) =>
        job.status !== 'RESOLVED' ? (
          <div className="flex gap-1.5">
            <Button size="sm" onClick={() => { setSelected(job); setPendingAction('retry'); setActionError('') }}>Retry</Button>
            <Button size="sm" variant="secondary" onClick={() => { setSelected(job); setPendingAction('resolve'); setActionError('') }}>Dismiss</Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-700">Message Queue Health</h2>
        <Button variant="secondary" onClick={() => { stats.refetch(); jobs.refetch() }}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.loading ? (
          <div className="col-span-3 text-center text-sm text-slate-400 py-8">Loading queue stats…</div>
        ) : queueEntries.length === 0 ? (
          <div className="col-span-3 text-center text-sm text-slate-400 py-8">No queue data available.</div>
        ) : queueEntries.map(([name, info]) => {
          const healthy = info.messagesReady === 0
          return (
            <div key={name} className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-bold text-slate-600 break-all">{name}</p>
                <span className={`w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0 ${healthy ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Ready</p>
                  <p className={`text-xl font-black ${info.messagesReady > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{info.messagesReady}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Consumers</p>
                  <p className="text-xl font-black text-slate-700">{info.consumers}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {failedSummary.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-3">Failed Job Summary</p>
          <div className="flex flex-wrap gap-4">
            {failedSummary.map(([key, count]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-red-500 font-semibold capitalize">{key.replace(/_/g, ' ')}:</span>
                <span className="text-sm font-black text-red-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Failed Jobs</h3>
        {jobs.loading && <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>}
        {jobs.error && <div className="px-6 py-12 text-center text-sm text-red-500">{jobs.error}</div>}
        {!jobs.loading && !jobs.error && (
          <DataTable<FailedJob>
            columns={columns}
            data={jobs.data?.content ?? []}
            searchPlaceholder="Search failed jobs…"
            emptyMessage="No failed jobs."
          />
        )}
      </div>

      {selected && pendingAction && (
        <Modal open onClose={() => { setSelected(null); setPendingAction(null) }} title={pendingAction === 'retry' ? 'Retry Failed Job' : 'Dismiss Failed Job'}>
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs text-slate-500">Queue: <span className="font-semibold text-slate-700">{selected.queueName}</span></p>
              <p className="text-xs text-slate-500">Type: <span className="font-semibold text-slate-700">{selected.jobType}</span></p>
              <p className="text-xs text-slate-500">Attempts: <span className="font-semibold text-red-600">{selected.attempts}</span></p>
            </div>
            <p className="text-sm text-slate-600">
              {pendingAction === 'retry'
                ? 'This will re-queue the job for another attempt.'
                : 'This will mark the job as resolved without retrying.'}
            </p>
            {actionError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{actionError}</p>
            )}
            <div className="h-px bg-slate-100" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setSelected(null); setPendingAction(null) }}>Cancel</Button>
              <Button
                className="flex-1"
                variant={pendingAction === 'retry' ? 'primary' : 'danger'}
                onClick={handleAction}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing…' : pendingAction === 'retry' ? 'Retry Job' : 'Dismiss'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
