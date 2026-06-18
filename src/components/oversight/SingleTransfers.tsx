import { useState } from 'react'
import { Download, AlertTriangle, Loader2 } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useApi } from '../../hooks/useApi'
import { getTransactions } from '../../api'
import type { TransactionItem } from '../../api/types'
import moment from 'moment'

function fmt(n?: number) { return `₦${(n ?? 0).toLocaleString()}` }

export function SingleTransfers() {
  const [selected, setSelected] = useState<TransactionItem | null>(null)

  const { data, loading, error, refetch } = useApi(
    () => getTransactions({ size: 100 }).then(r => r.data),
    [],
  )

  const txs = (data?.content ?? []).filter(t => t.transferType === 'TO_OTHER_BANK' || t.transferType === 'INTERNAL_TRANSFER' || t.transferType === 'TRANSFER')

  const pendingCount = txs.filter(t => t.status === 'Pending' || t.status === 'PENDING').length
  const failedCount  = txs.filter(t => t.status === 'Failed' || t.status === 'FAILED' || t.status === 'Reversed' || t.status === 'REVERSED').length

  const stats = [
    { label: 'Tx Count',            value: String(txs.length), color: 'text-slate-700 bg-slate-50'   },
    { label: 'Pending Approval',    value: String(pendingCount), color: 'text-amber-700 bg-amber-50' },
    { label: 'Failed / Reversed',   value: String(failedCount),  color: 'text-red-700 bg-red-50'     },
  ]

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
        {txs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">No transfer transactions found.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Reference', 'Beneficiary', 'Amount', 'Channel', 'Date', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txs.map(tx => (
                <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">{tx.transactionReference}</td>
                  <td className="px-6 py-4 text-xs text-slate-700 font-semibold">{tx.beneficiaryName ?? '—'}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-700">{fmt(tx.amount)}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{tx.channel ?? 'MOBILE'}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{tx.createdAt ? moment(tx.createdAt).fromNow() : ''}</td>
                  <td className="px-6 py-4"><Badge label={tx.status} variant={statusBadge(tx.status)} /></td>
                  <td className="px-6 py-4">
                    <Button size="sm" variant="secondary" onClick={() => setSelected(tx)}>View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
                { label: 'Reference',           value: selected.transactionReference },
                { label: 'Amount',              value: fmt(selected.amount) },
                { label: 'Channel',             value: selected.channel ?? 'MOBILE' },
                { label: 'Date',                value: selected.createdAt ? moment(selected.createdAt).fromNow() : '' },
                { label: 'Customer / Corporate', value: selected.customer?.id ?? '—' },
                { label: 'Beneficiary',         value: selected.beneficiaryName ?? '—' },
                { label: 'Beneficiary Account', value: selected.creditAccount ?? '—' },
                { label: 'Fee',                 value: selected.fee != null ? fmt(selected.fee) : '—' },
                { label: 'Description',         value: selected.narration ?? '—' },
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

            <div className="h-px bg-slate-100" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
