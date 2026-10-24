import { Smartphone, Globe, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { Badge } from '../../ui/Badge'
import { useApi } from '../../../hooks/useApi'
import { getCustomerDevices, getCustomerLoginHistory, revokeDevice } from '../../../api'
import { useAuth } from '../../../context/AuthContext'
import moment from 'moment'
import { LoadingRegion, Skeleton } from '../../ui/Skeleton'

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

  // Placeholders only on first load; a refresh keeps the current list on screen.
  const devicesPending = devices.loading && !devices.data
  const loginsPending = logins.loading && !logins.data

  return (
    <div className="space-y-5">
      {/* Registered Devices */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registered Devices</h4>
          <button onClick={devices.refetch} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Refresh</button>
        </div>

        {devicesPending && (
          <LoadingRegion className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-2.5 w-1/3" /></div>
              </div>
            ))}
          </LoadingRegion>
        )}
        {devices.error && <p className="text-xs text-red-500">{devices.error}</p>}

        {!devicesPending && !devices.error && (devices.data ?? []).length === 0 && (
          <p className="text-sm text-slate-400">No registered devices.</p>
        )}

        {!devicesPending && !devices.error && (devices.data ?? []).length > 0 && (
          <div className="space-y-3">
            {(devices.data ?? []).map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <Smartphone size={14} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{d.deviceModel || 'Unknown Device'}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">UUID: {d.deviceUuid}</p>
                    <p className="text-[10px] text-slate-400">{d.osType}{d.osVersion ? ` · ${d.osVersion}` : ''} · Last login {d.lastLoginAt ? moment(d.lastLoginAt).fromNow() : ''}</p>
                    {d.lastLoginIp && <p className="text-[10px] text-slate-400">{d.lastLoginIp}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${d.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {d.active ? 'Active' : 'Inactive'}
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

        {loginsPending && (
          <LoadingRegion className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-2.5 w-1/3" /></div>
              </div>
            ))}
          </LoadingRegion>
        )}
        {logins.error && <p className="text-xs text-red-500">{logins.error}</p>}

        {!loginsPending && !logins.error && loginEntries.length === 0 && (
          <p className="text-sm text-slate-400">No login history found.</p>
        )}

        {!loginsPending && !logins.error && loginEntries.length > 0 && (
          <div className="space-y-3">
            {loginEntries.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                  {!entry.success
                    ? <Globe size={14} className="text-slate-500" />
                    : <Smartphone size={14} className="text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-700 truncate">{entry.deviceUuid || 'Unknown Agent'}</p>
                    <Badge label={entry.success ? 'Success' : 'Failed'} variant={entry.success ? 'green' : 'red'} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{entry.ipAddress}</p>
                  <p className="text-[10px] text-slate-400">{moment(entry.attemptedAt).fromNow()}</p>
                </div>
                <div className="flex-shrink-0">
                  {entry.success
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
