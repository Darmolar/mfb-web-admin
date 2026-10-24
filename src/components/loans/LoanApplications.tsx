import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, RefreshCw } from 'lucide-react'
import moment from 'moment'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { StatCardsSkeleton } from '../ui/Skeleton'
import { useApi } from '../../hooks/useApi'
import { getLoanApplications, getLoanProducts } from '../../api'
import { allPages } from '../../api/pagination'
import {
  LOAN_STATUS_FILTERS, appRepayment, loanActions, loanStatus, readLoanApps, readLoanProducts, type LoanApp,
} from '../../api/loans'

const naira = (n: number | null | undefined) => (n == null ? '—' : `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`)

type Row = LoanApp & { productName: string; customerName: string; customerAccount: string; monthly: number | null; ratio: number | null }

export function LoanApplications() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('ALL')

  const { data, loading, error, refetch } = useApi(async () => {
    const [apps, products] = await Promise.all([
      allPages(page => getLoanApplications({ page, size: 100 })),
      getLoanProducts().then(r => readLoanProducts(r.data)).catch(() => []),
    ])
    return { apps: readLoanApps(apps), products }
  }, [])

  const rows: Row[] = useMemo(() => (data?.apps ?? []).map(a => {
    const rep = appRepayment(a)
    return {
      ...a,
      productName: data?.products.find(p => p.code === a.productCode)?.name ?? a.productCode ?? '—',
      customerName: a.customer?.name ?? '',
      customerAccount: a.customer?.accountNumber ?? '',
      monthly: rep?.monthly ?? null,
      ratio: rep && a.monthlyIncome ? rep.monthly / a.monthlyIncome : null,
    }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data])

  const counts = rows.reduce<Record<string, { n: number; value: number }>>((acc, r) => {
    const x = acc[r.status] ?? { n: 0, value: 0 }
    acc[r.status] = { n: x.n + 1, value: x.value + (r.approved ?? r.requested) }
    return acc
  }, {})
  const shown = filter === 'ALL' ? rows : rows.filter(r => r.status === filter)
  const statuses = [...new Set([...LOAN_STATUS_FILTERS.filter(s => counts[s]), ...Object.keys(counts)])]

  const columns: ColumnDef<Row>[] = [
    {
      header: 'Application',
      accessorKey: 'createdAt',
      cell: r => (
        <div className="whitespace-nowrap">
          <p className="text-xs font-mono font-semibold text-slate-700">{r.number}</p>
          <p className="text-[11px] text-slate-400">{r.createdAt ? moment(r.createdAt).format('DD MMM YYYY') : '—'}</p>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessorKey: 'customer',
      cell: r => (
        <div className="min-w-[150px]">
          <p className="text-sm font-semibold text-slate-700">{r.customer?.name || 'Unknown customer'}</p>
          <p className="text-[11px] text-slate-400 font-mono">{r.customer?.accountNumber ?? ''}</p>
        </div>
      ),
    },
    { header: 'Product', accessorKey: 'productName', cell: r => <span className="text-xs text-slate-600 whitespace-nowrap">{r.productName}</span> },
    {
      header: 'Amount',
      accessorKey: 'requested',
      cell: r => (
        <div className="whitespace-nowrap">
          <p className="text-sm font-bold text-slate-700 tabular-nums">{naira(r.requested)}</p>
          {r.approved !== null && r.approved !== r.requested && <p className="text-[11px] text-emerald-600">Approved {naira(r.approved)}</p>}
        </div>
      ),
    },
    {
      header: 'Repayment',
      accessorKey: 'monthly',
      cell: r => (
        <div className="whitespace-nowrap text-xs">
          <p className="text-slate-700 font-semibold">{naira(r.monthly)}/mo</p>
          <p className="text-slate-400">{r.tenureMonths ?? '—'} months</p>
        </div>
      ),
    },
    {
      header: 'Income',
      accessorKey: 'monthlyIncome',
      cell: r => (
        <div className="whitespace-nowrap text-xs">
          <p className="text-slate-700">{naira(r.monthlyIncome)}/mo</p>
          {r.ratio !== null && (
            <p className={r.ratio > 0.33 ? 'text-amber-700 font-semibold' : 'text-slate-400'} title="Monthly repayment as a share of monthly income">
              {Math.round(r.ratio * 100)}% of income
            </p>
          )}
        </div>
      ),
    },
    { header: 'Status', accessorKey: 'status', cell: r => <Badge label={loanStatus(r.status).label} variant={loanStatus(r.status).variant} /> },
    {
      header: '',
      sortable: false,
      cell: r => {
        const { canDecide, canDisburse } = loanActions(r.status)
        return canDecide || canDisburse
          ? <Button size="sm" onClick={e => { e.stopPropagation(); navigate(`/loans/application/${r.id}`) }}>{canDecide ? 'Review' : 'Disburse'}</Button>
          : <ChevronRight size={16} className="text-slate-300" />
      },
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Loan applications</h3>
          <p className="text-xs text-slate-500 mt-0.5">Open an application to check eligibility, then approve, decline or disburse it.</p>
        </div>
        <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer" title="Refresh"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {loading && !data ? <StatCardsSkeleton count={4} className="grid grid-cols-2 lg:grid-cols-4 gap-3" /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Awaiting review" n={counts.PENDING?.n ?? 0} value={counts.PENDING?.value ?? 0} tone={(counts.PENDING?.n ?? 0) > 0 ? 'amber' : undefined} />
          <Tile label="Approved, not disbursed" n={counts.APPROVED?.n ?? 0} value={counts.APPROVED?.value ?? 0} tone={(counts.APPROVED?.n ?? 0) > 0 ? 'blue' : undefined} />
          <Tile label="Disbursed" n={counts.DISBURSED?.n ?? 0} value={counts.DISBURSED?.value ?? 0} />
          <Tile label="Closed" n={counts.CLOSED?.n ?? 0} value={counts.CLOSED?.value ?? 0} />
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          {['ALL', ...statuses].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${filter === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {s === 'ALL' ? 'All' : loanStatus(s).label}
              <span className="ml-1.5 text-[10px] text-slate-400">{s === 'ALL' ? rows.length : counts[s]?.n ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      {error && !loading ? (
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-red-500 mb-3">{error}</p>
          <Button size="sm" variant="secondary" onClick={refetch}>Retry</Button>
        </div>
      ) : (
        <DataTable<Row>
          columns={columns}
          data={shown}
          loading={loading && !data}
          searchPlaceholder="Search name, account, application number…"
          searchFields={['number', 'customerName', 'customerAccount', 'productName', 'productCode', 'email']}
          onRowClick={r => navigate(`/loans/application/${r.id}`)}
          emptyMessage={filter === 'ALL' ? 'No loan applications yet.' : `No ${loanStatus(filter).label.toLowerCase()} applications.`}
        />
      )}
    </div>
  )
}

function Tile({ label, n, value, tone }: { label: string; n: number; value: number; tone?: 'amber' | 'blue' }) {
  const t = tone === 'amber' ? 'bg-amber-50 border-amber-100 [&_.v]:text-amber-700' : tone === 'blue' ? 'bg-blue-50 border-blue-100 [&_.v]:text-blue-700' : 'bg-white border-slate-100 [&_.v]:text-slate-800'
  return (
    <div className={`rounded-2xl border shadow-sm p-4 ${t}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="v text-2xl font-black mt-1">{n}</p>
      <p className="text-xs text-slate-500">{naira(value)}</p>
    </div>
  )
}
