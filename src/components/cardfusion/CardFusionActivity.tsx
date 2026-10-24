import { useMemo, useState } from 'react'
import { CheckCircle2, CreditCard, LogIn, MapPin, XCircle } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getCardFusionActivities } from '../../api'
import { readActivityPage, type CardFusionActivity as Activity } from '../../api/cardfusion'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Badge } from '../ui/Badge'
import { StatCardsSkeleton } from '../ui/Skeleton'
import { Notice, RefreshButton, SectionHeader, Tile } from './shared'
import { formatWhen, readable, timeAgo } from './format'

const failed = (status: string) => status === 'FAILED' || status === 'FAILURE' || status === 'ERROR'
const statusVariant = (status: string) => (status === 'SUCCESS' ? 'green' : failed(status) ? 'red' : 'amber')

function MapLink({ a }: { a: Activity }) {
  if (a.latitude === null || a.longitude === null) return <span className="text-slate-400">—</span>
  return (
    <a
      href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}`}
      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap"
      onClick={e => e.stopPropagation()}
    >
      <MapPin size={12} /> View on map
    </a>
  )
}

function OperationIcon({ a }: { a: Activity }) {
  const Icon = a.operation.includes('LOGIN') ? LogIn : CreditCard
  return (
    <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${failed(a.status) ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
      <Icon size={16} />
    </span>
  )
}

export function CardFusionActivity() {
  const [operation, setOperation] = useState('ALL')
  const { data, loading, error, refetch } = useApi(async () => readActivityPage((await getCardFusionActivities()).data), [])
  const activities = useMemo(() => data?.items ?? [], [data])
  const operations = useMemo(() => [...new Set(activities.map(a => a.operation))].sort(), [activities])
  const shown = operation === 'ALL' ? activities : activities.filter(a => a.operation === operation)
  const failures = activities.filter(a => failed(a.status)).length
  const staffCount = new Set(activities.map(a => a.staffCode).filter(Boolean)).size
  const cardOps = activities.filter(a => !a.operation.includes('LOGIN')).length

  const columns: ColumnDef<Activity>[] = [
    {
      header: 'Activity',
      accessorKey: 'operation',
      cell: a => (
        <div className="flex items-center gap-3 min-w-[240px] max-w-[340px]">
          <OperationIcon a={a} />
          <div className="min-w-0">
            <p className="font-semibold text-slate-700">{readable(a.operation)}</p>
            {a.details && <p className="text-[11px] text-slate-400 line-clamp-2">{a.details}</p>}
          </div>
        </div>
      ),
    },
    { header: 'Result', accessorKey: 'status', cell: a => <Badge label={readable(a.status)} variant={statusVariant(a.status)} /> },
    {
      header: 'Staff',
      accessorKey: 'staffName',
      cell: a => (
        <div className="whitespace-nowrap">
          <p className="font-semibold text-slate-700">{a.staffName ?? '—'}</p>
          {a.staffCode && <p className="text-[11px] font-mono text-slate-400">{a.staffCode}</p>}
        </div>
      ),
    },
    {
      header: 'Device & place',
      accessorKey: 'hardwareId',
      cell: a => (
        <div className="whitespace-nowrap space-y-0.5">
          <p className="font-mono text-xs text-slate-600">{a.hardwareId ?? '—'}</p>
          <MapLink a={a} />
        </div>
      ),
    },
    {
      header: 'Customer',
      sortable: false,
      cell: a => a.accountNumber || a.cardPanLast4 ? (
        <div className="whitespace-nowrap">
          <p className="font-mono text-xs text-slate-600">{a.accountNumber ?? '—'}</p>
          {a.cardPanLast4 && <p className="text-[11px] font-mono text-slate-400">Card •••• {a.cardPanLast4}</p>}
        </div>
      ) : <span className="text-xs text-slate-300">Not a card operation</span>,
    },
    {
      header: 'When',
      accessorKey: 'createdAt',
      cell: a => (
        <div className="whitespace-nowrap text-xs">
          <p className="text-slate-700">{timeAgo(a.createdAt) ?? '—'}</p>
          <p className="text-slate-400">{formatWhen(a.createdAt)}</p>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <SectionHeader title="Activity log" text="Every staff sign-in and card operation performed on CardFusion devices, with where it happened.">
        <select
          aria-label="Filter by operation"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          value={operation}
          onChange={e => setOperation(e.target.value)}
        >
          <option value="ALL">All operations</option>
          {operations.map(op => <option key={op} value={op}>{readable(op)}</option>)}
        </select>
        <RefreshButton loading={loading} onClick={() => void refetch()} />
      </SectionHeader>

      {error && <Notice tone="error">{error}</Notice>}
      {loading && !data && <StatCardsSkeleton count={4} className="grid grid-cols-2 lg:grid-cols-4 gap-3" />}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Activities" value={data.totalElements} sub={`${activities.length} shown`} />
          <Tile label="Failed" value={failures} sub={failures ? 'Check these first' : 'No failures'} tone={failures ? 'red' : undefined} />
          <Tile label="Card operations" value={cardOps} sub="Issued, linked or changed" />
          <Tile label="Staff involved" value={staffCount} sub="Different staff codes" />
        </div>
      )}
      {data && data.totalElements > activities.length && (
        <p className="text-xs text-slate-400">Showing the latest {activities.length} of {data.totalElements} activities.</p>
      )}

      {data && (
        <div className="sm:hidden space-y-3">
          {shown.length === 0 && <p className="text-center text-xs text-slate-400 py-8">No CardFusion activity recorded.</p>}
          {shown.map(a => (
            <div key={a.id} className={`bg-white rounded-2xl border shadow-sm p-4 space-y-2 ${failed(a.status) ? 'border-red-200' : 'border-slate-100'}`}>
              <div className="flex items-start gap-3">
                <OperationIcon a={a} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800">{readable(a.operation)}</p>
                    {failed(a.status) ? <XCircle size={16} className="text-red-500 shrink-0" /> : <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500">{a.staffName ?? 'Unknown staff'}{a.staffCode && <span className="font-mono text-slate-400"> · {a.staffCode}</span>}</p>
                </div>
              </div>
              {a.details && <p className="text-xs text-slate-500">{a.details}</p>}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span>{formatWhen(a.createdAt)} · <span className="font-mono">{a.hardwareId ?? '—'}</span></span>
                <MapLink a={a} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={data ? 'hidden sm:block' : ''}>
        <DataTable
          columns={columns}
          data={shown}
          searchPlaceholder="Search by staff, device or account…"
          searchFields={['staffName', 'staffCode', 'hardwareId', 'accountNumber', 'details']}
          loading={loading && !data}
          emptyMessage="No CardFusion activity recorded."
        />
      </div>
    </div>
  )
}
