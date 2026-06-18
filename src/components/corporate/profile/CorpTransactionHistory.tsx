import { Badge, statusBadge } from '../../ui/Badge'
import { DataTable, type ColumnDef } from '../../ui/DataTable'
import { useApi } from '../../../hooks/useApi'
import { getCorporateTransfers } from '../../../api'
import type { CorporateTransferItem } from '../../../api/types'
import moment from 'moment'

interface Props { corporateId: string }

function fmt(n?: number) { return `₦${(n ?? 0).toLocaleString()}` }

export function CorpTransactionHistory({ corporateId }: Props) {
  const { data, loading, error, refetch } = useApi(
    () => getCorporateTransfers(corporateId).then(r => r.data),
    [corporateId],
  )
  const transfers = data?.content ?? []

  const columns: ColumnDef<CorporateTransferItem>[] = [
    {
      header: 'Reference',
      accessorKey: 'reference',
      cell: (tx) => <span className="text-xs font-mono text-slate-500">{tx.reference}</span>,
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (tx) => <span className="text-sm font-bold text-slate-700">{fmt(tx.amount)}</span>,
    },
    {
      header: 'Currency',
      accessorKey: 'currency',
      cell: (tx) => <span className="text-xs text-slate-500">{tx.currency}</span>,
    },
    {
      header: 'Beneficiary',
      accessorKey: 'beneficiaryName',
      cell: (tx) => <span className="text-xs text-slate-600">{tx.beneficiaryName ?? '—'}</span>,
    },
    {
      header: 'Channel',
      accessorKey: 'channel',
      cell: (tx) => <span className="text-xs text-slate-500">{tx.channel ?? '—'}</span>,
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: (tx) => (
        <span className="text-xs text-slate-400">{tx.createdAt ? moment(tx.createdAt).fromNow() : ''}</span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (tx) => <Badge label={tx.status} variant={statusBadge(tx.status)} />,
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction History</h4>
        <button onClick={refetch} className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer">Refresh</button>
      </div>

      {loading && <div className="px-6 py-10 text-center text-xs text-slate-400">Loading transfers…</div>}
      {error && <div className="px-6 py-6 text-center text-xs text-red-500">{error}</div>}

      {!loading && !error && (
        <div className="px-6 py-4">
          <DataTable<CorporateTransferItem>
            columns={columns}
            data={transfers}
            searchPlaceholder="Search transfers…"
            emptyMessage="No transfers found."
          />
        </div>
      )}
    </div>
  )
}
