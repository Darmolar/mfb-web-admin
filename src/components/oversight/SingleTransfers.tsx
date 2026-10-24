import { useMemo, useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import moment from 'moment'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { CopyButton, TxnDetailsModal } from './TxnDetailsModal'
import { useApi } from '../../hooks/useApi'
import { getTransactions } from '../../api'
import { allPages } from '../../api/pagination'
import { TRANSFER_TYPES, naira, readTxns, transfersCsv, type Txn } from '../../api/transactions'
import { StatCardsSkeleton, TableSkeleton } from '../ui/Skeleton'

const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

export function SingleTransfers() {
  const [selected, setSelected] = useState<Txn | null>(null)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // /transactions lists customer transfers only; load every page so counts and exports are complete.
  const { data, loading, error, refetch } = useApi(
    async () => readTxns(await allPages(page => getTransactions({ page, size: 100 }))),
    [],
  )
  const all = useMemo(() => data ?? [], [data])
  const txs = all.filter(t => (!typeFilter || t.type === typeFilter) && (!statusFilter || t.group === statusFilter))

  const successful = all.filter(t => t.group === 'success')
  const failed = all.filter(t => t.group === 'failed' || t.group === 'reversed')

  function exportCsv() {
    const blob = new Blob(['\uFEFF', transfersCsv(txs)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transfers-${moment().format('YYYY-MM-DD')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <StatCardsSkeleton count={4} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" />
        <TableSkeleton headers={['Date', 'From', 'To', 'Type', 'Amount', 'Status', '']} rows={8} search />
      </div>
    )
  }
  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-3">Could not load transfers: {error}</p>
        <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
      </div>
    )
  }

  const columns: ColumnDef<Txn>[] = [
    {
      header: 'Date',
      accessorKey: 'createdAt',
      cell: t => <span className="text-xs text-slate-500 whitespace-nowrap">{t.createdAt ? moment(t.createdAt).format('DD MMM YYYY, HH:mm') : '—'}</span>,
    },
    {
      header: 'From',
      accessorKey: 'customerName',
      cell: t => (
        <div className="min-w-[140px]">
          <p className="text-xs font-semibold text-slate-700">{t.customerName || '—'}</p>
          <p className="text-[11px] text-slate-400 font-mono">{t.debitAccount}</p>
        </div>
      ),
    },
    {
      header: 'To',
      accessorKey: 'beneficiaryName',
      cell: t => (
        <div className="min-w-[160px]">
          <p className="text-xs font-semibold text-slate-700">{t.beneficiaryName || '—'}</p>
          <p className="text-[11px] text-slate-400"><span className="font-mono">{t.creditAccount}</span>{t.bankName && ` · ${t.bankName}`}</p>
        </div>
      ),
    },
    {
      header: 'Type',
      accessorKey: 'typeLabel',
      cell: t => (
        <div className="min-w-[120px]">
          <p className="text-xs text-slate-600 whitespace-nowrap">{t.typeLabel}</p>
          {t.description && <p className="text-[11px] text-slate-400 truncate max-w-[180px]" title={t.description}>“{t.description}”</p>}
        </div>
      ),
    },
    {
      header: 'Reference',
      accessorKey: 'reference',
      cell: t => (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
          <span className="max-w-[150px] truncate" title={t.reference}>{t.reference}</span>
          <CopyButton value={t.reference} label="Copy reference" />
        </span>
      ),
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: t => (
        <div className="whitespace-nowrap">
          <p className="text-sm font-bold text-slate-700 tabular-nums">{naira(t.amount)}</p>
          {!!t.fee && <p className="text-[11px] text-slate-400">+ {naira(t.fee)} fee</p>}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: t => (
        <div className="min-w-[100px]">
          <Badge label={statusLabel(t.status)} variant={statusBadge(statusLabel(t.status))} />
          {t.failureReason && <p className="text-[11px] text-red-600 mt-1 max-w-[150px]">{t.failureReason}</p>}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Transfers" value={all.length.toLocaleString()} sub={naira(all.reduce((s, t) => s + t.amount, 0)) + ' attempted'} tone="slate" />
        <Stat label="Successful" value={successful.length.toLocaleString()} sub={naira(successful.reduce((s, t) => s + t.amount, 0)) + ' sent'} tone="green" />
        <Stat label="Failed" value={failed.length.toLocaleString()} sub={naira(failed.reduce((s, t) => s + t.amount, 0)) + ' not sent'} tone="red" />
        <Stat label="Fees earned" value={naira(successful.reduce((s, t) => s + (t.fee ?? 0), 0))} sub="On successful transfers" tone="slate" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All transfer types</option>
            {Object.entries(TRANSFER_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Any status</option>
            <option value="success">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 cursor-pointer mr-1">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={txs.length === 0}>
            <Download size={13} /> Export CSV ({txs.length})
          </Button>
        </div>
      </div>

      <DataTable<Txn>
        columns={columns}
        data={txs}
        searchPlaceholder="Search name, account, reference…"
        searchFields={['reference', 'beneficiaryName', 'customerName', 'debitAccount', 'creditAccount', 'bankName', 'description', 'failureReason']}
        emptyMessage="No transfers match these filters."
        onRowClick={setSelected}
      />

      <TxnDetailsModal txn={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'slate' | 'green' | 'red' }) {
  const t = { slate: 'bg-white border-slate-100 text-slate-800', green: 'bg-emerald-50 border-emerald-100 text-emerald-700', red: 'bg-red-50 border-red-100 text-red-600' }[tone]
  return (
    <div className={`rounded-2xl border shadow-sm px-4 sm:px-5 py-4 ${t}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{label}</p>
      <p className="text-xl sm:text-2xl font-black mt-1">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  )
}
