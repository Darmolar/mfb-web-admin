import { useState } from 'react'
import { Download, AlertTriangle, Loader2, MapPin } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { getTransactions } from '../../api'
import type { TransactionItem } from '../../api/types'
import moment from 'moment'

function fmt(n?: number) { return `₦${(n ?? 0).toLocaleString()}` }

// Default coordinates (Lagos, Nigeria) used when a transaction has no captured location.
const DEFAULT_COORDS = { lat: 6.5244, lng: 3.3792 }

function coords(t: TransactionItem): { lat: number; lng: number; isDefault: boolean } {
  if (t.latitude != null && t.longitude != null) return { lat: t.latitude, lng: t.longitude, isDefault: false }
  if (t.location) {
    const [a, b] = t.location.split(',').map(s => parseFloat(s.trim()))
    if (Number.isFinite(a) && Number.isFinite(b)) return { lat: a, lng: b, isDefault: false }
  }
  return { ...DEFAULT_COORDS, isDefault: true }
}

export function SingleTransfers() {
  const [selected, setSelected] = useState<TransactionItem | null>(null)

  const { data, loading, error, refetch } = useApi(
    () => getTransactions({ size: 100 }).then(r => r.data),
    [],
  )

  const txs = (data?.content ?? []).filter(t => ['TO_OTHER_BANK', 'INTERNAL', 'INTERNAL_TRANSFER', 'TRANSFER'].includes(t.transferType))

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

  const columns: ColumnDef<TransactionItem>[] = [
    {
      header: 'Reference',
      accessorKey: 'transactionReference',
      cell: (tx) => <span className="text-xs font-mono text-slate-500">{tx.transactionReference}</span>,
    },
    {
      header: 'Beneficiary',
      accessorKey: 'beneficiaryName',
      cell: (tx) => <span className="text-xs text-slate-700 font-semibold">{tx.beneficiaryName ?? '—'}</span>,
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (tx) => <span className="text-sm font-bold text-slate-700">{fmt(tx.amount)}</span>,
    },
    {
      header: 'Channel',
      accessorKey: 'channel',
      cell: (tx) => <span className="text-xs text-slate-500">{tx.channel ?? 'MOBILE'}</span>,
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: (tx) => <span className="text-xs text-slate-400">{tx.createdAt ? moment(tx.createdAt).fromNow() : ''}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (tx) => <Badge label={tx.status} variant={statusBadge(tx.status)} />,
    },
    {
      header: 'Action',
      sortable: false,
      cell: (tx) => (
        <Button size="sm" variant="secondary" onClick={() => setSelected(tx)}>View Details</Button>
      ),
    },
  ]

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

      <DataTable<TransactionItem>
        columns={columns}
        data={txs}
        searchPlaceholder="Search transfers…"
        searchFields={['transactionReference', 'beneficiaryName', 'status']}
        emptyMessage="No transfer transactions found."
      />

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

            {(() => {
              const c = coords(selected)
              return (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">User Location</p>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <MapPin size={13} className="text-slate-400" />
                        <span>Lat {c.lat.toFixed(4)}, Lng {c.lng.toFixed(4)}</span>
                      </div>
                      {c.isDefault && (
                        <p className="text-[11px] text-slate-400 mt-0.5">Default location (Lagos, Nigeria) — not captured for this transaction</p>
                      )}
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${c.lat},${c.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap"
                    >
                      View on Google Maps
                    </a>
                  </div>
                </div>
              )
            })()}

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
