import { Smartphone, Globe, CheckCircle, XCircle } from 'lucide-react'
import { mockLoginHistory } from '../../../data/mockData'
import { Badge, statusBadge } from '../../ui/Badge'

export function SecurityDevices() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Login History</h4>
        <div className="space-y-3">
          {mockLoginHistory.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                {entry.status === 'Failed' || entry.status === 'Suspicious'
                  ? <Globe size={14} className="text-slate-500" />
                  : <Smartphone size={14} className="text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700 truncate">{entry.userAgent}</p>
                  <Badge label={entry.status} variant={statusBadge(entry.status)} />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{entry.geolocation} · {entry.ipAddress}</p>
                <p className="text-[10px] text-slate-400">{entry.timestamp} · MFA: {entry.mfaMethod}</p>
              </div>
              <div className="flex-shrink-0">
                {entry.status === 'Success'
                  ? <CheckCircle size={14} className="text-emerald-500" />
                  : <XCircle size={14} className="text-red-400" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
