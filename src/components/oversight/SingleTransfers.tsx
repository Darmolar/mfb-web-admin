import { useState } from 'react'
import { Download, AlertTriangle } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { mockTransactions } from '../../data/mockData'
import type { Transaction } from '../../types'

function fmt(n: number) { return `₦${n.toLocaleString()}` }

const stats = [
  { label: 'Tx Count', value: '24', color: 'text-slate-700 bg-slate-50' },
  { label: 'Pending Approval', value: '3', color: 'text-amber-700 bg-amber-50' },
  { label: 'Failed / Reversed', value: '2', color: 'text-red-700 bg-red-50' },
]

export function SingleTransfers() {
  const [selected, setSelected] = useState<Transaction | null>(null)
  const txs = mockTransactions.filter(t => t.type === 'Transfer')

  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className={`rounded-xl px-5 py-4 ${s.color}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{s.label}</p>
            <p className="text-2xl font-black mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 mb-4">
        <Button variant="secondary" size="sm"><Download size={13} /> Export CSV</Button>
        <Button variant="secondary" size="sm"><Download size={13} /> Generate PDF</Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Reference ID', 'Corporate Account', 'Beneficiary', 'Amount', 'Channel', 'Date', 'Status', 'Action'].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.map(tx => (
              <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-6 py-4 text-xs font-mono text-slate-500">{tx.referenceId}</td>
                <td className="px-6 py-4 text-xs text-slate-600">{tx.description.slice(0, 20)}...</td>
                <td className="px-6 py-4 text-xs text-slate-700 font-semibold">{tx.beneficiary}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">{fmt(tx.amount)}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{tx.channel}</td>
                <td className="px-6 py-4 text-xs text-slate-400">{tx.date}</td>
                <td className="px-6 py-4"><Badge label={tx.status} variant={statusBadge(tx.status)} /></td>
                <td className="px-6 py-4">
                  <Button size="sm" variant="secondary" onClick={() => setSelected(tx)}>View Details</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Transfer Details">
          <div className="space-y-5">
            {selected.flagged && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-semibold text-red-700">Suspicious Activity Pattern Detected</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Reference ID', value: selected.referenceId },
                { label: 'Amount', value: fmt(selected.amount) },
                { label: 'Channel', value: selected.channel },
                { label: 'Date', value: selected.date },
                { label: 'Customer Account', value: selected.customerId || selected.corporateId || '—' },
                { label: 'Beneficiary', value: selected.beneficiary },
                { label: 'Beneficiary Account', value: selected.beneficiaryAccount },
                { label: 'Transaction Fee', value: fmt(selected.fee) },
              ].map(r => (
                <div key={r.label}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.label}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>

            {selected.failureReason && (
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Failure Context</p>
                <p className="text-sm text-red-700">{selected.failureReason}</p>
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Approval Chain</p>
              <div className="flex items-center gap-2">
                {['Initiator', 'Finance Director', 'Treasurer'].map((step, i, arr) => (
                  <>
                    <div key={step} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{step}</div>
                    {i < arr.length - 1 && <span key={`arrow-${i}`} className="text-slate-300 text-sm">→</span>}
                  </>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100" />
            <div className="flex gap-3">
              <Button variant="danger" className="flex-1" onClick={() => setSelected(null)}>Reverse</Button>
              <Button variant="success" className="flex-1" onClick={() => setSelected(null)}>Approve Transfer</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
