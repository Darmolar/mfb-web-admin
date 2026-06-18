import { Button } from '../ui/Button'
import { DataTable, type ColumnDef } from '../ui/DataTable'

type LimitRow = {
  tier: string
  maxSingle: string
  maxDaily: string
}

const limits: LimitRow[] = [
  { tier: 'Standard Corporate', maxSingle: '₦50,000,000', maxDaily: '₦200,000,000' },
  { tier: 'Premium Corporate', maxSingle: '₦200,000,000', maxDaily: '₦1,000,000,000' },
  { tier: 'Institutional', maxSingle: 'Unlimited', maxDaily: 'Unlimited' },
  { tier: 'Retail Tier 1', maxSingle: '₦20,000', maxDaily: '₦50,000' },
  { tier: 'Retail Tier 2', maxSingle: '₦200,000', maxDaily: '₦500,000' },
  { tier: 'Retail Tier 3', maxSingle: '₦10,000,000', maxDaily: 'Unlimited' },
]

const columns: ColumnDef<LimitRow>[] = [
  {
    header: 'Transaction Scope',
    accessorKey: 'tier',
    cell: (l) => <span className="text-sm font-semibold text-slate-700">{l.tier}</span>,
  },
  {
    header: 'Max Single',
    accessorKey: 'maxSingle',
    cell: (l) => (
      <input
        defaultValue={l.maxSingle}
        className="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-slate-300"
      />
    ),
  },
  {
    header: 'Max Daily',
    accessorKey: 'maxDaily',
    cell: (l) => (
      <input
        defaultValue={l.maxDaily}
        className="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-slate-300"
      />
    ),
  },
  {
    header: '',
    sortable: false,
    cell: () => <Button variant="secondary" size="sm">Configure Custom Limit</Button>,
  },
]

export function ThresholdLimits() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Institutional Threshold Standards</h4>
          <Button size="sm">Save Changes</Button>
        </div>
        <div className="px-6 py-4">
          <DataTable<LimitRow>
            columns={columns}
            data={limits}
            searchable={false}
          />
        </div>
      </div>
    </div>
  )
}
