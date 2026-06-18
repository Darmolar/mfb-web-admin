import { Download } from 'lucide-react'
import { Badge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { DataTable, type ColumnDef } from '../../ui/DataTable'
import { useApi } from '../../../hooks/useApi'
import { getCorporateAuditTrail } from '../../../api'
import type { AuditLogEntry } from '../../../api/types'
import moment from 'moment'

interface Props { corporateId: string }

function severityVariant(eventType: string): 'blue' | 'amber' | 'red' {
  if (eventType.includes('FAILED') || eventType.includes('ERROR')) return 'red'
  if (eventType.includes('SENT') || eventType.includes('REFRESHED')) return 'amber'
  return 'blue'
}

export function AuditTrail({ corporateId }: Props) {
  const { data, loading, error, refetch } = useApi(
    () => getCorporateAuditTrail(corporateId).then(r => r.data),
    [corporateId],
  )
  const logs = data?.content ?? []

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      header: 'Customer / Actor',
      accessorKey: 'customerId',
      cell: (log) => (
        <>
          <p className="text-xs font-semibold text-slate-700 max-w-[150px] truncate" title={log.customerId}>{log.customerId ?? 'System'}</p>
          <p className="text-[10px] text-slate-400">Customer ID</p>
        </>
      ),
    },
    {
      header: 'Event Type',
      accessorKey: 'eventType',
      cell: (log) => <span className="text-xs font-mono text-slate-600 max-w-[180px] truncate">{log.eventType}</span>,
    },
    {
      header: 'Description',
      accessorKey: 'description',
      cell: (log) => (
        <span className="text-xs text-slate-500 max-w-[200px] truncate" title={log.description}>{log.description}</span>
      ),
    },
    {
      header: 'Account Number',
      accessorKey: 'accountNumber',
      cell: (log) => <span className="text-xs font-mono text-slate-400">{log.accountNumber ?? '—'}</span>,
    },
    {
      header: 'Timestamp',
      accessorKey: 'createdAt',
      cell: (log) => (
        <span className="text-xs text-slate-400">{log.createdAt ? moment(log.createdAt).fromNow() : ''}</span>
      ),
    },
    {
      header: 'Severity',
      accessorKey: 'eventType',
      cell: (log) => (
        <Badge label={log.eventType.includes('FAILED') ? 'Critical' : 'Info'} variant={severityVariant(log.eventType)} />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm"><Download size={13} /> Export CSV</Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Institutional Audit Trail</h4>
          <button onClick={refetch} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Refresh</button>
        </div>

        {loading && <div className="px-6 py-10 text-center text-xs text-slate-400">Loading audit trail…</div>}
        {error && <div className="px-6 py-6 text-center text-xs text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="px-6 py-4">
            <DataTable<AuditLogEntry>
              columns={columns}
              data={logs}
              searchPlaceholder="Search audit trail…"
              emptyMessage="No audit records found."
            />
          </div>
        )}
      </div>
    </div>
  )
}
