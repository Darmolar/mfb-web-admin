import { useEffect, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronRight, CircleSlash, Layers, Loader2, PiggyBank, Receipt, RefreshCw, RotateCcw, XOctagon,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { getQueueStats, getFailedJobs, retryFailedJob, resolveFailedJob } from '../../api'
import type { FailedJob, PaginatedData } from '../../api/types'
import {
  groupQueues, jobTypeLabel, overallStatus, payloadRows, queueLabel, timeAgo, type QueueService, type ServiceHealth,
} from '../../api/queue'
import { ListSkeleton, LoadingRegion, Skeleton, StatCardsSkeleton } from '../ui/Skeleton'

const PAGE_SIZE = 20
const AUTO_REFRESH_MS = 30_000

const JOB_TABS = [
  { id: 'FAILED', label: 'Needs action' },
  { id: 'RETRIED', label: 'Retried' },
  { id: 'RESOLVED', label: 'Resolved' },
]

const HEALTH: Record<ServiceHealth, { label: string; pill: string; dot: string }> = {
  healthy: { label: 'Healthy', pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  processing: { label: 'Processing', pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  backlog: { label: 'Falling behind', pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  failures: { label: 'Has failures', pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  stopped: { label: 'Stopped', pill: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
}

const serviceIcon = (key: string) =>
  key.includes('bill') ? <Receipt size={18} /> : key.includes('saving') ? <PiggyBank size={18} /> : <Layers size={18} />

export function QueuePage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('FAILED')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<FailedJob | null>(null)
  const [action, setAction] = useState<'retry' | 'resolve' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [, setTick] = useState(0)

  const stats = useApi(async () => {
    const data = (await getQueueStats()).data
    setUpdatedAt(Date.now())
    return data
  }, [])
  // Tagged with the tab/page it belongs to, so switching tabs shows placeholders while auto-refresh keeps the list in place.
  const jobsKey = `${tab}:${page}`
  const jobs = useApi<{ key: string; page: PaginatedData<FailedJob> }>(
    async () => ({ key: `${tab}:${page}`, page: (await getFailedJobs({ status: tab, page, size: PAGE_SIZE })).data }),
    [tab, page],
  )

  // useApi's refetch functions are stable, so the timers below are not reset by every render.
  const { refetch: refetchStats } = stats
  const { refetch: refetchJobs } = jobs
  const refreshAll = () => { refetchStats(); refetchJobs() }

  // Re-render every 15s so "updated … ago" stays true.
  useEffect(() => {
    const clock = setInterval(() => setTick(t => t + 1), 15_000)
    return () => clearInterval(clock)
  }, [])

  // Auto-refresh while the browser tab is visible and no job is open.
  useEffect(() => {
    if (!autoRefresh || selected) return
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') { refetchStats(); refetchJobs() }
    }, AUTO_REFRESH_MS)
    return () => clearInterval(poll)
  }, [autoRefresh, selected, refetchStats, refetchJobs])

  const services = groupQueues(stats.data?.queues)
  const summary = stats.data?.failedJobSummary ?? {}
  const failedCount = Number(summary.totalFailed ?? 0)
  const status = overallStatus(services, failedCount)
  const list = jobs.data?.page.content ?? []
  const total = jobs.data?.page.totalElements ?? list.length
  const jobsPending = jobs.loading && jobs.data?.key !== jobsKey
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)

  function openJob(job: FailedJob, next: 'retry' | 'resolve' | null = null) {
    setSelected(job)
    setAction(next)
    setActionError('')
  }

  async function confirmAction() {
    if (!selected || !user || !action) return
    setActionLoading(true)
    setActionError('')
    try {
      if (action === 'retry') await retryFailedJob(selected.id, { resolvedBy: user.adminId })
      else await resolveFailedJob(selected.id, { resolvedBy: user.adminId })
      setNotice(action === 'retry'
        ? `${jobTypeLabel(selected.jobType)} sent back to the queue to run again.`
        : `${jobTypeLabel(selected.jobType)} marked as resolved.`)
      setSelected(null)
      setAction(null)
      refreshAll()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  const bannerTone = {
    green: { box: 'bg-emerald-50 border-emerald-100', icon: <CheckCircle2 size={20} className="text-emerald-600" />, title: 'text-emerald-800', text: 'text-emerald-700' },
    amber: { box: 'bg-amber-50 border-amber-100', icon: <AlertTriangle size={20} className="text-amber-600" />, title: 'text-amber-900', text: 'text-amber-800' },
    red: { box: 'bg-red-50 border-red-100', icon: <XOctagon size={20} className="text-red-600" />, title: 'text-red-800', text: 'text-red-700' },
  }[status.tone]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-lg font-bold text-slate-800">Background jobs</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Bill payments and savings interest run in the background. See whether they're keeping up, and decide what to do with jobs that failed.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            {updatedAt ? <p className="text-[11px] text-slate-400">Updated {timeAgo(new Date(updatedAt).toISOString())}</p> : <Skeleton className="h-2.5 w-20 ml-auto mb-1" />}
            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
              <input type="checkbox" className="accent-slate-700" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
              Auto-refresh
            </label>
          </div>
          <Button variant="secondary" size="sm" onClick={refreshAll} disabled={stats.loading || jobs.loading}>
            <RefreshCw size={13} className={stats.loading || jobs.loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
      </div>

      {notice && (
        <div className="text-xs font-semibold rounded-xl px-4 py-3 border bg-emerald-50 border-emerald-100 text-emerald-700 flex justify-between gap-4">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Overall status */}
      {stats.error ? (
        <div className="rounded-2xl border bg-red-50 border-red-100 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <XOctagon size={20} className="text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-800">Could not reach the job service</p>
              <p className="text-xs text-red-700 mt-0.5">{stats.error}</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={stats.refetch}>Try again</Button>
        </div>
      ) : !stats.data ? (
        <Skeleton className="h-[74px] w-full rounded-2xl" />
      ) : (
        <div className={`rounded-2xl border px-5 py-4 flex items-start gap-3 ${bannerTone.box}`}>
          <span className="shrink-0">{bannerTone.icon}</span>
          <div>
            <p className={`text-sm font-bold ${bannerTone.title}`}>{status.title}</p>
            <p className={`text-xs mt-0.5 ${bannerTone.text}`}>{status.detail}</p>
          </div>
        </div>
      )}

      {/* Services */}
      <section className="space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Services</h3>
        {stats.loading && !stats.data ? (
          <LoadingRegion className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-2.5 w-3/4" /></div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-2">{[0, 1, 2].map(j => <Skeleton key={j} className="h-14 rounded-xl" />)}</div>
              </div>
            ))}
          </LoadingRegion>
        ) : services.length === 0 && !stats.error ? (
          <p className="text-sm text-slate-400 bg-white rounded-2xl border border-slate-100 px-5 py-8 text-center">No services reported.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map(s => <ServiceCard key={s.key} service={s} />)}
          </div>
        )}
      </section>

      {/* Totals */}
      {!stats.data && !stats.error && <StatCardsSkeleton count={3} className="grid grid-cols-3 gap-3 sm:gap-4" />}
      {stats.data && (
        <section className="grid grid-cols-3 gap-3 sm:gap-4">
          <Tile label="Needs action" value={failedCount} tone={failedCount > 0 ? 'amber' : 'slate'} hint="Failed after all retries" />
          <Tile label="Retried" value={Number(summary.totalRetried ?? 0)} tone="slate" hint="Sent back by an admin" />
          <Tile label="Resolved" value={Number(summary.totalResolved ?? 0)} tone="slate" hint="Closed without re-running" />
        </section>
      )}

      {/* Failed jobs */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700">Failed jobs</h3>
            <p className="text-xs text-slate-400">Jobs that still failed after the system's automatic retries.</p>
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {JOB_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(0) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${tab === t.id ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t.label}
                {t.id === 'FAILED' && failedCount > 0 && <span className="ml-1.5 text-[10px] font-bold text-white bg-amber-500 rounded-full px-1.5">{failedCount}</span>}
              </button>
            ))}
          </div>
        </div>

        {jobsPending ? (
          <ListSkeleton rows={3} action />
        ) : jobs.error ? (
          <div className="px-6 py-10 text-center">
            <p className="text-xs text-red-500 mb-3">{jobs.error}</p>
            <Button size="sm" variant="secondary" onClick={jobs.refetch}>Retry</Button>
          </div>
        ) : list.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              {tab === 'FAILED' ? 'Nothing needs your attention' : tab === 'RETRIED' ? 'No retried jobs' : 'No resolved jobs'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {tab === 'FAILED' ? 'Every background job has completed successfully.' : 'Jobs appear here after an admin acts on them.'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map(job => (
              <li key={job.id} className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-slate-50/60">
                <button onClick={() => openJob(job)} className="flex-1 min-w-0 text-left flex items-start gap-3 cursor-pointer">
                  <span className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    {serviceIcon(job.queueName)}
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-slate-800">{jobTypeLabel(job.jobType)}</span>
                      <span className="text-[11px] text-slate-400">{queueLabel(job.queueName)} · {timeAgo(job.failedAt)} · {job.attempts} attempt{job.attempts === 1 ? '' : 's'}</span>
                    </span>
                    <span className="block text-xs text-red-600 mt-0.5 line-clamp-2">{job.errorMessage || 'No error message recorded.'}</span>
                  </span>
                </button>
                <div className="flex items-center gap-2 sm:shrink-0 pl-12 sm:pl-0">
                  {job.status === 'FAILED' ? (
                    <>
                      <Button size="sm" onClick={() => openJob(job, 'retry')}><RotateCcw size={13} /> Retry</Button>
                      <Button size="sm" variant="secondary" onClick={() => openJob(job, 'resolve')}><CircleSlash size={13} /> Dismiss</Button>
                    </>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">{jobTypeLabel(job.status)}</span>
                  )}
                  <button onClick={() => openJob(job)} className="p-1.5 text-slate-300 hover:text-slate-500 cursor-pointer" aria-label="Details"><ChevronRight size={16} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {total > PAGE_SIZE && (
          <div className="px-4 sm:px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page + 1} of {lastPage + 1} · {total} jobs</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </section>

      {/* Job details + action */}
      <Modal
        open={!!selected}
        onClose={() => { setSelected(null); setAction(null) }}
        title={selected ? jobTypeLabel(selected.jobType) : 'Job'}
        width="max-w-xl"
        footer={selected?.status === 'FAILED' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <ActionChoice active={action === 'retry'} icon={<RotateCcw size={15} />} title="Retry" text="Run it again" onClick={() => setAction('retry')} />
              <ActionChoice active={action === 'resolve'} icon={<CircleSlash size={15} />} title="Dismiss" text="Close without running" onClick={() => setAction('resolve')} />
            </div>
            {action && (
              <>
                <p className={`text-xs rounded-xl px-3 py-2.5 border ${action === 'retry' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                  {action === 'retry'
                    ? 'The job is sent back to the queue and runs again. For a payment, first check with the provider that the earlier attempt did not go through, or the customer could be charged twice.'
                    : 'The job is closed and will not run again. Use this when it was handled another way, e.g. the customer was refunded or the payment was completed manually.'}
                </p>
                {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{actionError}</p>}
                <Button fullWidth className="justify-center py-2.5" variant={action === 'retry' ? 'primary' : 'danger'} onClick={confirmAction} disabled={actionLoading}>
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : action === 'retry' ? <RotateCcw size={14} /> : <CircleSlash size={14} />}
                  {action === 'retry' ? 'Retry this job' : 'Dismiss this job'}
                </Button>
              </>
            )}
          </div>
        ) : undefined}
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">What went wrong</p>
              <p className="text-sm text-red-800 break-words">{selected.errorMessage || 'No error message recorded.'}</p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Detail label="Service" value={queueLabel(selected.queueName)} />
              <Detail label="Status" value={jobTypeLabel(selected.status)} />
              <Detail label="Attempts" value={String(selected.attempts ?? '—')} />
              <Detail label="Failed" value={selected.failedAt ? `${new Date(selected.failedAt).toLocaleString('en-GB')} (${timeAgo(selected.failedAt)})` : '—'} />
              <Detail label="Customer notified" value={selected.notificationSent ? 'Yes' : 'No'} />
              <Detail label="Job ID" value={<span className="font-mono text-xs break-all">{selected.id}</span>} />
            </dl>
            {payloadRows(selected.payload).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Job details</p>
                <dl className="rounded-xl border border-slate-100 divide-y divide-slate-100">
                  {payloadRows(selected.payload).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-2 text-sm">
                      <dt className="text-slate-400">{k}</dt>
                      <dd className="text-slate-700 font-medium text-right break-all">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function ServiceCard({ service: s }: { service: QueueService }) {
  const h = HEALTH[s.health]
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">{serviceIcon(s.key)}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">{s.label}</p>
            {s.description && <p className="text-xs text-slate-400 mt-0.5">{s.description}</p>}
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 ${h.pill}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${h.dot}`} />{h.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Metric label="Waiting" value={s.waiting} warn={s.health === 'backlog'} />
        <Metric label="Workers" value={s.workers} bad={s.workers === 0} />
        <Metric label="Failed, held" value={s.failedHeld} warn={s.failedHeld > 0} />
      </div>
    </div>
  )
}

function Metric({ label, value, warn, bad }: { label: string; value: number; warn?: boolean; bad?: boolean }) {
  return (
    <div className={`rounded-xl py-2.5 ${bad ? 'bg-red-50' : warn ? 'bg-amber-50' : 'bg-slate-50'}`}>
      <p className={`text-xl font-black ${bad ? 'text-red-600' : warn ? 'text-amber-600' : 'text-slate-700'}`}>{value}</p>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
    </div>
  )
}

function Tile({ label, value, hint, tone }: { label: string; value: number; hint: string; tone: 'amber' | 'slate' }) {
  return (
    <div className={`rounded-2xl border p-3 sm:p-4 ${tone === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
      <p className={`text-2xl font-black ${tone === 'amber' ? 'text-amber-700' : 'text-slate-800'}`}>{value}</p>
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="hidden sm:block text-[11px] text-slate-400 mt-0.5">{hint}</p>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd className="text-slate-700 font-medium">{value}</dd>
    </div>
  )
}

function ActionChoice({ active, icon, title, text, onClick }: { active: boolean; icon: React.ReactNode; title: string; text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-3 text-left rounded-xl border px-3 py-2.5 cursor-pointer ${active ? 'border-slate-700 bg-slate-50 ring-2 ring-slate-200' : 'border-slate-200 bg-white hover:border-slate-300'}`}
    >
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-800">{title}</span>
        <span className="block text-[11px] text-slate-500 truncate">{text}</span>
      </span>
    </button>
  )
}
