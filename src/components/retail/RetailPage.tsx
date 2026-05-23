import { useState } from 'react'
import { Download, ChevronRight } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { SearchInput } from '../ui/SearchInput'
import { mockCustomers } from '../../data/mockData'
import type { RetailCustomer } from '../../types'
import { CustomerProfile } from './profile/CustomerProfile'

const filterTabs = ['All Users', 'High Net Worth', 'Flagged', 'Unverified']

function fmt(n: number) { return `₦${n.toLocaleString()}` }

export function RetailPage() {
  const [filter, setFilter] = useState('All Users')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<RetailCustomer | null>(null)

  if (selected) return <CustomerProfile customer={selected} onBack={() => setSelected(null)} />

  const filtered = mockCustomers.filter(c => {
    const matchesFilter =
      filter === 'All Users' ||
      (filter === 'High Net Worth' && c.kycTier === 'Tier 3') ||
      (filter === 'Flagged' && c.status === 'Flagged') ||
      (filter === 'Unverified' && (c.status === 'Unverified' || c.kycTier === 'Unverified'))
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.accountNo.includes(search)
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {filterTabs.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${filter === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t}
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
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RETAIL BANKING</span>
          <span className="text-xs text-slate-400">{filtered.length} users</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Customer', 'Account No', 'KYC Tier', 'Verification', 'Status', 'Balance', 'Last Active', ''].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr
                key={c.id}
                className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer transition-colors"
                onClick={() => setSelected(c)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                      <span className="text-xs font-black text-slate-600">{c.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-slate-500">{c.accountNo}</td>
                <td className="px-6 py-4"><Badge label={c.kycTier} variant={statusBadge(c.kycTier)} /></td>
                <td className="px-6 py-4"><Badge label={c.status} variant={statusBadge(c.status)} /></td>
                <td className="px-6 py-4"><Badge label={c.riskLevel} variant={statusBadge(c.riskLevel)} /></td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">{fmt(c.balance)}</td>
                <td className="px-6 py-4 text-xs text-slate-400">{c.lastActive}</td>
                <td className="px-6 py-4"><ChevronRight size={16} className="text-slate-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">PREVIOUS</span>
          <span className="text-xs text-slate-400">Page 1 of 1</span>
          <span className="text-xs text-slate-400">NEXT</span>
        </div>
      </div>
    </div>
  )
}
