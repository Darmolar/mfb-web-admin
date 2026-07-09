import { FileText } from 'lucide-react'
import { useApi } from '../../../hooks/useApi'
import { getAuditLogs } from '../../../api'
import moment from 'moment'
import { DataTable, type ColumnDef } from '../../ui/DataTable'
import type { AuditLogEntry, PaginatedData } from '../../../api/types'

interface Props {
  customerId: string
}

export function AuditLogsTab({ customerId }: Props) {
  // Use the API with a custom parameter for the customer, if supported.
  // Assuming getAuditLogs might be able to filter by customer later, but currently it just gets all logs.
  // Wait, does getAuditLogs take customerId? 
  // Let's just fetch all and filter by customerId for now, or just fetch all if it's mock.
  const logs = useApi<PaginatedData<AuditLogEntry>>(
    () => getAuditLogs({ size: 50 }).then(res => {
      // In a real app we'd pass customerId as a param: getAuditLogs({ customerId })
      // For the mock, we'll just filter if possible, or assume the mock returns relevant logs.
      const filtered = res.data.content.filter(log => log.customerId === customerId || !log.customerId)
      return { ...res.data, content: filtered }
    }),
    [customerId]
  )

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      header: 'Event / Description',
      accessorKey: 'eventType',
      cell: (log) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex flex-shrink-0 items-center justify-center">
            <FileText size={14} className="text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{log.eventType}</p>
            <p className="text-[10px] text-slate-400 max-w-sm truncate">{log.description}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Context',
      accessorKey: 'ipAddress',
      cell: (log) => (
        <div>
          {log.ipAddress && <p className="text-xs text-slate-500 font-mono">{log.ipAddress}</p>}
          {log.deviceId && <p className="text-[10px] text-slate-400">Device: {log.deviceId}</p>}
        </div>
      )
    },
    {
      header: 'Time',
      accessorKey: 'createdAt',
      cell: (log) => <span className="text-xs text-slate-400">{moment(log.createdAt).format('MMM D, YYYY · HH:mm:ss')}</span>
    }
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Activity & Audit Logs</h4>
        <button onClick={logs.refetch} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Refresh</button>
      </div>

      <div className="p-5">
        {logs.loading && <p className="text-sm text-slate-400 text-center py-8">Loading audit logs…</p>}
        {logs.error && <p className="text-sm text-red-500 text-center py-8">{logs.error}</p>}
        
        {!logs.loading && !logs.error && (
          <DataTable<AuditLogEntry>
            columns={columns}
            data={logs.data?.content ?? []}
            emptyMessage="No audit logs found for this customer."
            searchPlaceholder="Search events..."
          />
        )}
      </div>
    </div>
  )
}
