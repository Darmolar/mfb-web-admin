import { Download } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'

const bulkTransfers = [
  { id: 'BT001', name: 'May 2024 Payroll', entity: 'Nexus Energy Plc', count: 152, amount: 42000000, date: '2024-05-22', status: 'Completed' },
  { id: 'BT002', name: 'Vendor Settlement Q2', entity: 'Greenfield Agro Ltd', count: 48, amount: 18500000, date: '2024-05-20', status: 'Pending' },
  { id: 'BT003', name: 'Contractor Payments', entity: 'Skybridge Telecoms', count: 22, amount: 9200000, date: '2024-05-19', status: 'Completed' },
]

function fmt(n: number) { return `₦${n.toLocaleString()}` }

export function BulkTransfers() {
  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="secondary" size="sm"><Download size={13} /> Export CSV</Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Batch Name', 'Corporate Entity', 'Recipients', 'Total Amount', 'Date', 'Status', 'Action'].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bulkTransfers.map(bt => (
              <tr key={bt.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-6 py-4 text-sm font-semibold text-slate-700">{bt.name}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{bt.entity}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{bt.count}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">{fmt(bt.amount)}</td>
                <td className="px-6 py-4 text-xs text-slate-400">{bt.date}</td>
                <td className="px-6 py-4"><Badge label={bt.status} variant={statusBadge(bt.status)} /></td>
                <td className="px-6 py-4"><Button variant="secondary" size="sm">View Details</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
