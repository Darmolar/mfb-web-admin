import { useMemo, useState } from 'react'
import { MapPin, RefreshCw } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getCardFusionActivities } from '../../api'
import { readActivityPage, type CardFusionActivity as Activity } from '../../api/cardfusion'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Notice } from './shared'
import { formatWhen } from './format'

const label = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
const statusVariant = (status: string) => (status === 'SUCCESS' ? 'green' : status === 'FAILED' || status === 'FAILURE' ? 'red' : 'amber')

export function CardFusionActivity() {
  const [operation, setOperation] = useState('ALL')
  const { data, loading, error, refetch } = useApi(async () => readActivityPage((await getCardFusionActivities()).data), [])
  const activities = useMemo(() => data?.items ?? [], [data])
  const operations = useMemo(() => [...new Set(activities.map(a => a.operation))].sort(), [activities])
  const shown = operation === 'ALL' ? activities : activities.filter(a => a.operation === operation)

  const columns: ColumnDef<Activity>[] = [
    { header: 'When', accessorKey: 'createdAt', cell: a => <span className="text-slate-500 whitespace-nowrap">{formatWhen(a.createdAt)}</span> },
    { header: 'Operation', accessorKey: 'operation', cell: a => <span className="font-semibold text-slate-700">{label(a.operation)}</span> },
    { header: 'Status', accessorKey: 'status', cell: a => <Badge label={a.status} variant={statusVariant(a.status)} /> },
    {
      header: 'Staff',
      accessorKey: 'staffName',
      cell: a => (
        <div>
          <p className="font-semibold text-slate-700">{a.staffName ?? '—'}</p>
          {a.staffCode && <p className="text-[11px] font-mono text-slate-400">{a.staffCode}</p>}
        </div>
      ),
    },
    { header: 'Device', accessorKey: 'hardwareId', cell: a => <span className="font-mono text-slate-500">{a.hardwareId ?? '—'}</span> },
    {
      header: 'Customer / Card',
      sortable: false,
      cell: a => (
        <div className="text-slate-500">
          <p className="font-mono">{a.accountNumber ?? '—'}</p>
          {a.cardPanLast4 && <p className="text-[11px] font-mono text-slate-400">•••• {a.cardPanLast4}</p>}
        </div>
      ),
    },
    {
      header: 'Location',
      sortable: false,
      cell: a => a.latitude !== null && a.longitude !== null ? (
        <a
          href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline whitespace-nowrap"
        >
          <MapPin size={12} /> {a.latitude.toFixed(4)}, {a.longitude.toFixed(4)}
        </a>
      ) : <span className="text-slate-400">—</span>,
    },
    { header: 'Details', accessorKey: 'details', cell: a => <span className="text-slate-500">{a.details ?? '—'}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Activity Log</h3>
          <p className="text-xs text-slate-400">Every staff sign-in and card operation performed on CardFusion devices.</p>
        </div>
        <div className="flex gap-2">
          <select
            aria-label="Filter by operation"
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
            value={operation}
            onChange={e => setOperation(e.target.value)}
          >
            <option value="ALL">All operations</option>
            {operations.map(op => <option key={op} value={op}>{label(op)}</option>)}
          </select>
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {data && data.totalElements > activities.length && (
        <p className="text-xs text-slate-400">Showing the latest {activities.length} of {data.totalElements} activities.</p>
      )}

      <DataTable
        columns={columns}
        data={shown}
        searchPlaceholder="Search by staff, device or account..."
        searchFields={['staffName', 'staffCode', 'hardwareId', 'accountNumber', 'details']}
        emptyMessage={loading ? 'Loading activity...' : 'No CardFusion activity recorded.'}
      />
    </div>
  )
}
