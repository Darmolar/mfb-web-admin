import { Button } from '../ui/Button'

const eventTypes = [
  { name: 'Login Events', email: true, inApp: true },
  { name: 'KYC Actions', email: true, inApp: true },
  { name: 'Transaction Reversals', email: true, inApp: true },
  { name: 'Limit Changes', email: false, inApp: true },
  { name: 'Role Modifications', email: true, inApp: true },
  { name: 'System Config Changes', email: true, inApp: true },
]

export function AuditLogSettings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Audit Log Delivery Configuration</h4>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Event Type', 'Email', 'In-App'].map(h => (
                <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {eventTypes.map(ev => (
              <tr key={ev.name} className="border-b border-slate-50">
                <td className="px-6 py-4 text-sm font-semibold text-slate-700">{ev.name}</td>
                <td className="px-6 py-4">
                  <input type="checkbox" defaultChecked={ev.email} className="w-4 h-4 accent-slate-700 cursor-pointer" />
                </td>
                <td className="px-6 py-4">
                  <input type="checkbox" defaultChecked={ev.inApp} className="w-4 h-4 accent-slate-700 cursor-pointer" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
