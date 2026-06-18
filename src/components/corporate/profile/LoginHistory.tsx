import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Badge } from '../../ui/Badge'
import { DataTable, type ColumnDef } from '../../ui/DataTable'
import { useApi } from '../../../hooks/useApi'
import { getCorporateLoginHistory } from '../../../api'
import type { LoginHistoryEntry } from '../../../api/types'
import moment from 'moment'

interface Props { corporateId: string }

export function LoginHistory({ corporateId }: Props) {
  const { data, loading, error, refetch } = useApi(
    () => getCorporateLoginHistory(corporateId).then(r => r.data),
    [corporateId],
  )
  const entries = data?.content ?? []
  const suspicious = entries.filter(e => !e.success && e.failureReason?.toLowerCase().includes('password')).length

  function getMockLocation(ip: string) {
    if (ip.startsWith('197.')) return 'Lagos, Nigeria'
    if (ip.startsWith('102.')) return 'Abuja, Nigeria'
    return 'Unknown Location'
  }

  function getMockAgent(id: string) {
    const agents = ['Chrome / macOS', 'Safari / iOS', 'Chrome / Windows', 'Edge / Windows']
    const index = id.charCodeAt(0) % agents.length
    return agents[index]
  }

  function getMockMfa(id: string) {
    const mfas = ['SMS OTP', 'Email OTP', 'Authenticator', 'None']
    const index = id.charCodeAt(id.length - 1) % mfas.length
    return mfas[index]
  }

  const columns: ColumnDef<LoginHistoryEntry>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'attemptedAt',
      cell: (entry) => (
        <span className="text-xs text-slate-500">{moment(entry.attemptedAt).fromNow()}</span>
      ),
    },
    {
      header: 'IP Address',
      accessorKey: 'ipAddress',
      cell: (entry) => <span className="text-xs font-mono text-slate-600">{entry.ipAddress}</span>,
    },
    {
      header: 'Geolocation',
      sortable: false,
      cell: (entry) => <span className="text-xs text-slate-600">{getMockLocation(entry.ipAddress)}</span>,
    },
    {
      header: 'User Agent',
      sortable: false,
      cell: (entry) => <span className="text-xs text-slate-400">{getMockAgent(entry.id)}</span>,
    },
    {
      header: 'MFA Method',
      sortable: false,
      cell: (entry) => <span className="text-xs text-slate-500">{getMockMfa(entry.id)}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'success',
      cell: (entry) => (
        <div className="flex items-center gap-1.5">
          {entry.success
            ? <CheckCircle size={12} className="text-emerald-500" />
            : <XCircle size={12} className="text-red-400" />}
          <Badge label={entry.success ? 'Success' : 'Failed'} variant={entry.success ? 'green' : 'red'} />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      {suspicious > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700">High Risk Event Detected</p>
            <p className="text-xs text-amber-600 mt-0.5">{suspicious} suspicious login attempt{suspicious !== 1 ? 's' : ''} detected.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Login Analysis</h4>
          <button onClick={refetch} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Refresh</button>
        </div>

        {loading && <div className="px-6 py-10 text-center text-xs text-slate-400">Loading login history…</div>}
        {error && <div className="px-6 py-6 text-center text-xs text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="px-6 py-4">
            <DataTable<LoginHistoryEntry>
              columns={columns}
              data={entries}
              searchPlaceholder="Search login history…"
              emptyMessage="No login history found."
            />
          </div>
        )}
      </div>
    </div>
  )
}
