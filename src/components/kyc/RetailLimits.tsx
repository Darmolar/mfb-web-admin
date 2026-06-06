import { Clock, Loader2 } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { useApi } from '../../hooks/useApi'
import { getLimitOverrides } from '../../api'

function fmt(n: number) { return `₦${n.toLocaleString()}` }

export function RetailLimits() {
  const { data, loading, error, refetch } = useApi(
    () => getLimitOverrides({ size: 100 }).then(r => r.data),
    [],
  )

  const overrides = data?.content ?? []
  const active = overrides.filter(o => o.status === 'Active' || o.status === 'ACTIVE')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-600">Retail Limits Management</h3>
        <button onClick={refetch} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Refresh</button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-slate-400" />
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Overrides</h4>
            </div>
            {overrides.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-400">No limit overrides found.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Customer', 'Type', 'Limit', 'Expires', 'Set By', 'Status'].map(h => (
                      <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overrides.map(o => (
                    <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">{o.customerName}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{o.type}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{fmt(o.limit)}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{o.expiresAt ?? '—'}</td>
                      <td className="px-6 py-4 text-xs text-slate-400">{o.setBy}</td>
                      <td className="px-6 py-4"><Badge label={o.status} variant={statusBadge(o.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {active.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Active Individual Overrides</h4>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {active.map(o => (
                  <div key={o.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-bold text-slate-700">{o.customerName}</p>
                      <Badge label={o.status} variant={statusBadge(o.status)} />
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{o.type}</p>
                    <p className="text-lg font-black text-slate-800">{fmt(o.limit)}</p>
                    {o.expiresAt && (
                      <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                        <Clock size={10} /> Expires {o.expiresAt}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
