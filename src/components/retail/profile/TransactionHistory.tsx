import type { RetailCustomer } from '../../../types'
import { Badge, statusBadge } from '../../ui/Badge'
import { mockTransactions } from '../../../data/mockData'

interface Props { customer: RetailCustomer }

function fmt(n: number) { return `₦${n.toLocaleString()}` }

export function TransactionHistory({ customer }: Props) {
  const txs = mockTransactions.filter(t => t.customerId === customer.id)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction History</h4>
      </div>
      {txs.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-slate-400">No transactions found.</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Reference', 'Type', 'Amount', 'Channel', 'Beneficiary', 'Date', 'Status'].map(h => (
                <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.map(tx => (
              <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-6 py-4 text-xs font-mono text-slate-500">{tx.referenceId}</td>
                <td className="px-6 py-4 text-xs text-slate-600">{tx.type}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">{fmt(tx.amount)}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{tx.channel}</td>
                <td className="px-6 py-4 text-xs text-slate-600">{tx.beneficiary}</td>
                <td className="px-6 py-4 text-xs text-slate-400">{tx.date}</td>
                <td className="px-6 py-4"><Badge label={tx.status} variant={statusBadge(tx.status)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
