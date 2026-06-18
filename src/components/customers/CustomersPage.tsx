import { useState } from 'react'
import { Download, ChevronRight } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { getCustomers } from '../../api'
import type { CustomerListItem, PaginatedData } from '../../api/types'
import { CustomerProfile } from './profile/CustomerProfile'

const statusFilters = ['', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'PENDING']

export function CustomersPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const customers = useApi<PaginatedData<CustomerListItem>>(async () => {
    const res = await getCustomers({ status: statusFilter || undefined, page: 0, size: 50 })
    return res.data
  }, [statusFilter])

  if (selectedId) {
    return <CustomerProfile customerId={selectedId} onBack={() => setSelectedId(null)} />
  }

  const items = customers.data?.content ?? []
  const totalElements = customers.data?.totalElements ?? 0

  const columns: ColumnDef<CustomerListItem>[] = [
    {
      header: 'Customer',
      accessorKey: 'firstName',
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <span className="text-xs font-black text-slate-600">{(c.firstName ?? '?').charAt(0)}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{c.firstName} {c.lastName}</p>
            <p className="text-xs text-slate-400">@{c.username}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Account No',
      accessorKey: 'accountNumber',
      cell: (c) => <span className="text-xs font-mono text-slate-500">{c.accountNumber}</span>,
    },
    {
      header: 'Email',
      accessorKey: 'email',
      cell: (c) => <span className="text-xs text-slate-500">{c.email}</span>,
    },
    {
      header: 'Phone',
      accessorKey: 'phoneNumber',
      cell: (c) => <span className="text-xs text-slate-500">{c.phoneNumber}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (c) => <Badge label={c.status} variant={statusBadge(c.status)} />,
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      cell: (c) => <span className="text-xs text-slate-400">{c.createdAt?.split('T')?.[0]}</span>,
    },
    {
      header: '',
      sortable: false,
      cell: () => <ChevronRight size={16} className="text-slate-300" />,
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {statusFilters.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${statusFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f || 'All Users'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{totalElements} users</span>
          <Button variant="secondary" size="sm"><Download size={13} /> Export</Button>
        </div>
      </div>

      {customers.loading && <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>}
      {customers.error && <div className="px-6 py-12 text-center text-sm text-red-500">{customers.error}</div>}

      {!customers.loading && !customers.error && (
        <DataTable<CustomerListItem>
          columns={columns}
          data={items}
          searchPlaceholder="Search customers…"
          searchFields={['firstName', 'lastName', 'email', 'accountNumber', 'phoneNumber', 'username']}
          onRowClick={(c) => setSelectedId(c.id)}
          emptyMessage="No customers found."
        />
      )}
    </div>
  )
}
