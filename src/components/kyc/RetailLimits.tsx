import { Plus, Clock } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { mockLimitOverrides } from '../../data/mockData'

function fmt(n: number) {
  return `₦${n.toLocaleString()}`
}

export function RetailLimits() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-600">Retail Limits Management</h3>
        <Button size="sm" icon={<Plus size={14} />}>
          <Plus size={14} /> New Global Cap
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Overrides</h4>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Customer', 'Type', 'Limit', 'Expires', 'Set By', 'Status'].map(h => (
                <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockLimitOverrides.map(o => (
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
      </div>

      <div>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Active Individual Overrides</h4>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {mockLimitOverrides.filter(o => o.status === 'Active').map(o => (
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
              <button className="mt-3 text-xs font-semibold text-blue-500 hover:text-blue-700 cursor-pointer">View History →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
