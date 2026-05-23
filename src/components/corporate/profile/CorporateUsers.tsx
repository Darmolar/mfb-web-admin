import type { CorporateEntity } from '../../../types'
import { Badge } from '../../ui/Badge'

interface Props { entity: CorporateEntity }

const sampleUsers = [
  { name: 'Tobi Adeniyi', role: 'Finance Director', email: 'tobi@nexus.com', status: 'Active' },
  { name: 'Amaka Osei', role: 'Treasury Manager', email: 'amaka@nexus.com', status: 'Active' },
  { name: 'Emeka Nwobi', role: 'Accountant', email: 'emeka@nexus.com', status: 'Active' },
  { name: 'Sade Lawal', role: 'Auditor', email: 'sade@nexus.com', status: 'Inactive' },
]

export function CorporateUsers({ entity }: Props) {
  const users = sampleUsers.slice(0, entity.activeUsers + 1)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Corporate Users</h4>
        <span className="text-xs text-slate-400">{entity.authorizedPersonnel} authorized</span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100">
            {['User Identity', 'System Role', 'Email', 'Status'].map(h => (
              <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.name} className="border-b border-slate-50 hover:bg-slate-50/50">
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-slate-600">{u.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{u.name}</span>
                </div>
              </td>
              <td className="px-6 py-4 text-xs text-slate-600">{u.role}</td>
              <td className="px-6 py-4 text-xs text-slate-400">{u.email}</td>
              <td className="px-6 py-4">
                <Badge label={u.status} variant={u.status === 'Active' ? 'green' : 'gray'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
