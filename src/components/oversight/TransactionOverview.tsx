import { AlertTriangle, TrendingUp, TrendingDown, ArrowLeftRight, Loader2 } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getTransactions } from '../../api'
import { Badge, statusBadge } from '../ui/Badge'

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`
  return `₦${n.toLocaleString()}`
}

const channelColors: Record<string, string> = {
  Web:    'bg-indigo-500',
  API:    'bg-violet-500',
  Mobile: 'bg-emerald-500',
  POS:    'bg-amber-500',
  USSD:   'bg-slate-400',
}

export function TransactionOverview() {
  const { data, loading, error, refetch } = useApi(
    () => getTransactions({ size: 100 }).then(r => r.data),
    [],
  )

  const txs = data?.content ?? []
  const totalVolume = txs.reduce((s, t) => s + t.amount, 0)
  const completed = txs.filter(t => t.status === 'Completed' || t.status === 'COMPLETED')
  const pending = txs.filter(t => t.status === 'Pending' || t.status === 'PENDING')
  const failed = txs.filter(t => t.status === 'Failed' || t.status === 'FAILED' || t.status === 'Reversed' || t.status === 'REVERSED')
  const flagged = txs.filter(t => t.flagged)

  const channels = Array.from(new Set(txs.map(t => t.channel))).filter(Boolean)
  const channelData = channels.map(ch => {
    const cTxs = txs.filter(t => t.channel === ch)
    const vol = cTxs.reduce((s, t) => s + t.amount, 0)
    return { channel: ch, count: cTxs.length, volume: vol, pct: txs.length > 0 ? Math.round((cTxs.length / txs.length) * 100) : 0 }
  }).sort((a, b) => b.count - a.count)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
      </div>
    )
  }

  const completedPct = txs.length > 0 ? Math.round((completed.length / txs.length) * 100) : 0
  const pendingPct   = txs.length > 0 ? Math.round((pending.length / txs.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Summary stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Volume</p>
            <ArrowLeftRight size={14} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-800">{fmt(totalVolume)}</p>
          <p className="text-xs text-slate-400 mt-1">{txs.length} transactions</p>
        </div>

        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Completed</p>
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{completed.length}</p>
          <p className="text-xs text-emerald-500 mt-1">{fmt(completed.reduce((s, t) => s + t.amount, 0))}</p>
        </div>

        <div className="bg-amber-50 rounded-2xl border border-amber-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Pending</p>
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-amber-700">{pending.length}</p>
          <p className="text-xs text-amber-500 mt-1">{fmt(pending.reduce((s, t) => s + t.amount, 0))} on hold</p>
        </div>

        <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Failed / Reversed</p>
            <TrendingDown size={14} className="text-red-400" />
          </div>
          <p className="text-2xl font-black text-red-600">{failed.length}</p>
          <p className="text-xs text-red-400 mt-1">{fmt(failed.reduce((s, t) => s + t.amount, 0))} impacted</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Channel Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Channel Breakdown</h3>
          {channelData.length === 0 ? (
            <p className="text-sm text-slate-400">No data available.</p>
          ) : (
            <div className="space-y-4">
              {channelData.map(c => (
                <div key={c.channel}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${channelColors[c.channel] ?? 'bg-slate-400'}`} />
                      <span className="text-sm font-semibold text-slate-700">{c.channel}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{fmt(c.volume)}</span>
                      <span className="text-xs font-bold text-slate-600 w-8 text-right">{c.pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${channelColors[c.channel] ?? 'bg-slate-400'}`}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Status Distribution</h3>
          {txs.length === 0 ? (
            <p className="text-sm text-slate-400">No data available.</p>
          ) : (
            <>
              <div className="flex items-center justify-center mb-6">
                <div
                  className="w-32 h-32 rounded-full"
                  style={{
                    background: `conic-gradient(
                      #10b981 0% ${completedPct}%,
                      #f59e0b ${completedPct}% ${completedPct + pendingPct}%,
                      #ef4444 ${completedPct + pendingPct}% 100%
                    )`,
                  }}
                >
                  <div className="w-full h-full rounded-full bg-white scale-[0.65] flex flex-col items-center justify-center">
                    <p className="text-xs font-black text-slate-700">{txs.length}</p>
                    <p className="text-[9px] text-slate-400">total</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Completed', count: completed.length, color: 'bg-emerald-500', text: 'text-emerald-700' },
                  { label: 'Pending',   count: pending.length,   color: 'bg-amber-400',   text: 'text-amber-700'   },
                  { label: 'Failed',    count: txs.filter(t => t.status === 'Failed' || t.status === 'FAILED').length, color: 'bg-red-500', text: 'text-red-700' },
                  { label: 'Reversed',  count: txs.filter(t => t.status === 'Reversed' || t.status === 'REVERSED').length, color: 'bg-rose-300', text: 'text-rose-700' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-sm ${s.color}`} />
                      <span className="text-xs text-slate-600">{s.label}</span>
                    </div>
                    <span className={`text-xs font-bold ${s.text}`}>{s.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Flagged Transactions */}
      {flagged.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-red-50 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest">Flagged Transactions</h3>
            <span className="ml-auto bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{flagged.length}</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Reference', 'Type', 'Amount', 'Channel', 'Date', 'Status'].map(h => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flagged.map(tx => (
                <tr key={tx.id} className="border-b border-slate-50 bg-red-50/30">
                  <td className="px-6 py-3 text-xs font-mono text-slate-500">{tx.reference}</td>
                  <td className="px-6 py-3 text-xs text-slate-600">{tx.type}</td>
                  <td className="px-6 py-3 text-sm font-bold text-slate-700">{fmt(tx.amount)}</td>
                  <td className="px-6 py-3 text-xs text-slate-500">{tx.channel}</td>
                  <td className="px-6 py-3 text-xs text-slate-400">{tx.createdAt?.split('T')[0]}</td>
                  <td className="px-6 py-3"><Badge label={tx.status} variant={statusBadge(tx.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
