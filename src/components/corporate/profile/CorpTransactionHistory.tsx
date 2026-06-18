import { Badge, statusBadge } from '../../ui/Badge'
import { useApi } from '../../../hooks/useApi'
import { getCorporateTransfers } from '../../../api'
import moment from 'moment'

interface Props { corporateId: string }

function fmt(n?: number) { return `₦${(n ?? 0).toLocaleString()}` }

export function CorpTransactionHistory({ corporateId }: Props) {
  const { data, loading, error, refetch } = useApi(
    () => getCorporateTransfers(corporateId).then(r => r.data),
    [corporateId],
  )
  const transfers = data?.content ?? []

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction History</h4>
        <button onClick={refetch} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Refresh</button>
      </div>

      {loading && <div className="px-6 py-10 text-center text-xs text-slate-400">Loading transfers…</div>}
      {error && <div className="px-6 py-6 text-center text-xs text-red-500">{error}</div>}

      {!loading && !error && transfers.length === 0 && (
        <div className="px-6 py-10 text-center text-sm text-slate-400">No transfers found.</div>
      )}

      {!loading && !error && transfers.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Reference', 'Amount', 'Currency', 'Beneficiary', 'Channel', 'Date', 'Status'].map(h => (
                <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transfers.map(tx => (
              <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-6 py-4 text-xs font-mono text-slate-500">{tx.reference}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">{fmt(tx.amount)}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{tx.currency}</td>
                <td className="px-6 py-4 text-xs text-slate-600">{tx.beneficiaryName ?? '—'}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{tx.channel ?? '—'}</td>
                <td className="px-6 py-4 text-xs text-slate-400">{tx.createdAt ? moment(tx.createdAt).fromNow() : ''}</td>
                <td className="px-6 py-4"><Badge label={tx.status} variant={statusBadge(tx.status)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
