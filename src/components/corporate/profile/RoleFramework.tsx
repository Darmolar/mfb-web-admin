import { DataTable, type ColumnDef } from '../../ui/DataTable'

type RoleRow = {
  name: string
  authority: { initiate: boolean; approve: boolean; modify: boolean; global: boolean }
  count: number
}

const roles: RoleRow[] = [
  {
    name: 'Finance Director', authority: { initiate: true, approve: true, modify: true, global: true },
    count: 1,
  },
  {
    name: 'Treasury Manager', authority: { initiate: true, approve: true, modify: false, global: false },
    count: 2,
  },
  {
    name: 'Accountant', authority: { initiate: true, approve: false, modify: false, global: false },
    count: 4,
  },
  {
    name: 'Auditor', authority: { initiate: false, approve: false, modify: false, global: false },
    count: 2,
  },
]

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div className={`w-5 h-5 rounded flex items-center justify-center ${checked ? 'bg-slate-700' : 'bg-slate-100 border border-slate-200'}`}>
      {checked && <span className="text-white text-[10px] font-black">✓</span>}
    </div>
  )
}

const columns: ColumnDef<RoleRow>[] = [
  {
    header: 'Role Profile',
    accessorKey: 'name',
    cell: (r) => <span className="text-sm font-semibold text-slate-700">{r.name}</span>,
  },
  {
    header: 'Count',
    accessorKey: 'count',
    cell: (r) => <span className="text-sm text-slate-500">{r.count}</span>,
  },
  {
    header: 'Initiate',
    sortable: false,
    cell: (r) => <Checkbox checked={r.authority.initiate} />,
  },
  {
    header: 'Approve',
    sortable: false,
    cell: (r) => <Checkbox checked={r.authority.approve} />,
  },
  {
    header: 'Modify',
    sortable: false,
    cell: (r) => <Checkbox checked={r.authority.modify} />,
  },
  {
    header: 'Global Framework',
    sortable: false,
    cell: (r) => <Checkbox checked={r.authority.global} />,
  },
]

export function RoleFramework() {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Role Management Framework</h4>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4">
          <DataTable<RoleRow>
            columns={columns}
            data={roles}
            searchable={false}
          />
        </div>
      </div>
    </div>
  )
}
