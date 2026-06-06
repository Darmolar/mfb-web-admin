import { Smartphone, Globe, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { Badge, statusBadge } from '../../ui/Badge'
import { useApi } from '../../../hooks/useApi'
import { getCustomerDevices, getCustomerLoginHistory, revokeDevice } from '../../../api'
import { useAuth } from '../../../context/AuthContext'

interface Props { customerId: string }

export function SecurityDevices({ customerId }: Props) {
  const { user: _user } = useAuth()

  const devices = useApi(
    () => getCustomerDevices(customerId).then(r => r.data),
    [customerId],
  )
  const logins = useApi(
    () => getCustomerLoginHistory(customerId).then(r => r.data),
    [customerId],
  )
  const loginEntries = logins.data?.content ?? []

  async function handleRevoke(deviceId: string) {
    try {
      await revokeDevice(customerId, deviceId)
      devices.refetch()
    } catch { /* handled silently — could add toast */ }
  }

  return (
    <div className="space-y-5">
      {/* Registered Devices */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registered Devices</h4>
          <button onClick={devices.refetch} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Refresh</button>
        </div>

        {devices.loading && <p className="text-xs text-slate-400">Loading devices…</p>}
        {devices.error && <p className="text-xs text-red-500">{devices.error}</p>}

        {!devices.loading && !devices.error && (devices.data ?? []).length === 0 && (
          <p className="text-sm text-slate-400">No registered devices.</p>
        )}

        {!devices.loading && !devices.error && (devices.data ?? []).length > 0 && (
          <div className="space-y-3">
            {(devices.data ?? []).map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <Smartphone size={14} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{d.deviceName}</p>
                    <p className="text-[10px] text-slate-400">{d.deviceType}{d.os ? ` · ${d.os}` : ''} · Last used {d.lastUsed?.split('T')[0]}</p>
                    {d.ipAddress && <p className="text-[10px] text-slate-400">{d.ipAddress}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.trusted ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {d.trusted ? 'Trusted' : 'Untrusted'}
                  </span>
                  <button onClick={() => handleRevoke(d.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer" title="Revoke device">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Login History */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login History</h4>
          <button onClick={logins.refetch} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Refresh</button>
        </div>

        {logins.loading && <p className="text-xs text-slate-400">Loading login history…</p>}
        {logins.error && <p className="text-xs text-red-500">{logins.error}</p>}

        {!logins.loading && !logins.error && loginEntries.length === 0 && (
          <p className="text-sm text-slate-400">No login history found.</p>
        )}

        {!logins.loading && !logins.error && loginEntries.length > 0 && (
          <div className="space-y-3">
            {loginEntries.map(entry => (
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
                  {entry.status === 'Success' || entry.status === 'SUCCESS'
                    ? <CheckCircle size={14} className="text-emerald-500" />
                    : <XCircle size={14} className="text-red-400" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
