const roles = [
  { name: 'Super Admin', authority: { initiate: true, approve: true, modify: true, global: true }, count: 2 },
  { name: 'Compliance Officer', authority: { initiate: false, approve: true, modify: true, global: false }, count: 3 },
  { name: 'Finance Manager', authority: { initiate: true, approve: true, modify: false, global: false }, count: 5 },
  { name: 'Auditor', authority: { initiate: false, approve: false, modify: false, global: false }, count: 4 },
  { name: 'Customer Support', authority: { initiate: false, approve: false, modify: false, global: false }, count: 8 },
]

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div className={`w-5 h-5 rounded flex items-center justify-center ${checked ? 'bg-slate-700' : 'bg-slate-100 border border-slate-200'}`}>
      {checked && <span className="text-white text-[10px] font-black">✓</span>}
    </div>
  )
}

export function RoleManagement() {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Role Management Framework</h4>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Role Profile', 'Total Count', 'Initiate', 'Approve', 'Modify', 'Global Framework'].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-slate-700">{r.name}</p>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{r.count}</td>
                <td className="px-6 py-4"><Checkbox checked={r.authority.initiate} /></td>
                <td className="px-6 py-4"><Checkbox checked={r.authority.approve} /></td>
                <td className="px-6 py-4"><Checkbox checked={r.authority.modify} /></td>
                <td className="px-6 py-4"><Checkbox checked={r.authority.global} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
