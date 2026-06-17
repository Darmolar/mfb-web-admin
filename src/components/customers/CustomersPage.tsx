import { useState } from 'react'
import { Download, ChevronRight, ChevronLeft } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { SearchInput } from '../ui/SearchInput'
import { useApi } from '../../hooks/useApi'
import { getCustomers } from '../../api'
import type { CustomerListItem, PaginatedData } from '../../api/types'
import { CustomerProfile } from './profile/CustomerProfile'

const statusFilters = ['', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'PENDING']

export function CustomersPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const pageSize = 20

  const customers = useApi<PaginatedData<CustomerListItem>>(async () => {
    const res = await getCustomers({ status: statusFilter || undefined, page, size: pageSize })
    return res.data
  }, [statusFilter, page])

  if (selectedId) {
    return <CustomerProfile customerId={selectedId} onBack={() => setSelectedId(null)} />
  }

  const items = customers.data?.content ?? []
  const totalPages = customers.data?.totalPages ?? 1
  const totalElements = customers.data?.totalElements ?? 0

  // Client-side search filtering (on top of server filter)
  const filtered = search
    ? items.filter(c => {
        const s = search.toLowerCase()
        return (
          c.firstName?.toLowerCase().includes(s) ||
          c.lastName?.toLowerCase().includes(s) ||
          c.email?.toLowerCase().includes(s) ||
          c.accountNumber?.includes(s) ||
          c.phoneNumber?.includes(s)
        )
      })
    : items

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {statusFilters.map(f => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(0) }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${statusFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f || 'All Users'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search customers..." />
          <Button variant="secondary" size="sm"><Download size={13} /> Export</Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CUSTOMERS</span>
          <span className="text-xs text-slate-400">{totalElements} users</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Customer', 'Account No', 'Email', 'Phone', 'Status', 'Created', ''].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {customers.loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">Loading…</td></tr>
            ) : customers.error ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-red-500">{customers.error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">No customers found.</td></tr>
            ) : (
              filtered.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer transition-colors"
                  onClick={() => setSelectedId(c.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                        <span className="text-xs font-black text-slate-600">{(c.firstName ?? '?').charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-slate-400">@{c.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">{c.accountNumber}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{c.email}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{c.phoneNumber}</td>
                  <td className="px-6 py-4"><Badge label={c.status} variant={statusBadge(c.status)} /></td>
                  <td className="px-6 py-4 text-xs text-slate-400">{c.createdAt?.split('T')[0]}</td>
                  <td className="px-6 py-4"><ChevronRight size={16} className="text-slate-300" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} /> PREVIOUS
          </button>
          <span className="text-xs text-slate-400">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            NEXT <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
