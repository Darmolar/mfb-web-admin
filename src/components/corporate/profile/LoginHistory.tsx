import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { Badge, statusBadge } from '../../ui/Badge'
import { useApi } from '../../../hooks/useApi'
import { getCorporateLoginHistory } from '../../../api'

interface Props { corporateId: string }

export function LoginHistory({ corporateId }: Props) {
  const { data, loading, error, refetch } = useApi(
    () => getCorporateLoginHistory(corporateId).then(r => r.data),
    [corporateId],
  )
  const entries = data?.content ?? []
  const suspicious = entries.filter(e => e.status === 'Suspicious' || e.status === 'SUSPICIOUS').length

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

        {!loading && !error && entries.length === 0 && (
          <div className="px-6 py-10 text-center text-xs text-slate-400">No login history found.</div>
        )}

        {!loading && !error && entries.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Timestamp', 'IP Address', 'Geolocation', 'User Agent', 'MFA Method', 'Status'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-5 py-4 text-xs text-slate-500">{entry.timestamp}</td>
                  <td className="px-5 py-4 text-xs font-mono text-slate-600">{entry.ipAddress}</td>
                  <td className="px-5 py-4 text-xs text-slate-600">{entry.geolocation}</td>
                  <td className="px-5 py-4 text-xs text-slate-400">{entry.userAgent}</td>
                  <td className="px-5 py-4 text-xs text-slate-500">{entry.mfaMethod}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {entry.status === 'Success' || entry.status === 'SUCCESS'
                        ? <CheckCircle size={12} className="text-emerald-500" />
                        : <XCircle size={12} className="text-red-400" />}
                      <Badge label={entry.status} variant={statusBadge(entry.status)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
