import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { SearchInput } from '../ui/SearchInput'
import { mockCorporates } from '../../data/mockData'
import type { CorporateEntity } from '../../types'
import { EntityProfile } from './profile/EntityProfile'

export function CorporatePage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CorporateEntity | null>(null)

  if (selected) return <EntityProfile entity={selected} onBack={() => setSelected(null)} />

  const filtered = mockCorporates.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.rcNumber.includes(search)
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-600">Corporate Directory</h3>
        <SearchInput value={search} onChange={setSearch} placeholder="Search entities..." />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CORPORATE BANKING</span>
          <span className="text-xs text-slate-400">{filtered.length} entities</span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Entity Details', 'Status', 'RC Number', 'Authorized Personnel', 'Active Users', 'Onboarded', ''].map(h => (
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
                      <p className="text-xs text-slate-400">{c.industry}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4"><Badge label={c.status} variant={statusBadge(c.status)} /></td>
                <td className="px-6 py-4 text-xs font-mono text-slate-500">{c.rcNumber}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{c.authorizedPersonnel}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{c.activeUsers}</td>
                <td className="px-6 py-4 text-xs text-slate-400">{c.onboardedDate}</td>
                <td className="px-6 py-4"><ChevronRight size={16} className="text-slate-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
