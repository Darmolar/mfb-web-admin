import { Button } from '../ui/Button'
import { DataTable, type ColumnDef } from '../ui/DataTable'

type EventRow = {
  name: string
  email: boolean
  inApp: boolean
}

const eventTypes: EventRow[] = [
  { name: 'Login Events', email: true, inApp: true },
  { name: 'KYC Actions', email: true, inApp: true },
  { name: 'Transaction Reversals', email: true, inApp: true },
  { name: 'Limit Changes', email: false, inApp: true },
  { name: 'Role Modifications', email: true, inApp: true },
  { name: 'System Config Changes', email: true, inApp: true },
]

const columns: ColumnDef<EventRow>[] = [
  {
    header: 'Event Type',
    accessorKey: 'name',
    cell: (ev) => <span className="text-sm font-semibold text-slate-700">{ev.name}</span>,
  },
  {
    header: 'Email',
    accessorKey: 'email',
    cell: (ev) => (
      <input type="checkbox" defaultChecked={ev.email} className="w-4 h-4 accent-slate-700 cursor-pointer" />
    ),
  },
  {
    header: 'In-App',
    accessorKey: 'inApp',
    cell: (ev) => (
      <input type="checkbox" defaultChecked={ev.inApp} className="w-4 h-4 accent-slate-700 cursor-pointer" />
    ),
  },
]

export function AuditLogSettings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Audit Log Delivery Configuration</h4>
        </div>
        <div className="px-6 py-4">
          <DataTable<EventRow>
            columns={columns}
            data={eventTypes}
            searchable={false}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
