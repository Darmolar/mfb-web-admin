import { Button } from '../ui/Button'

export function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">System Configuration</h4>
        <div className="grid grid-cols-2 gap-5">
          {[
            { label: 'Bank Name', value: 'Memphis Microfinance Bank', type: 'text' },
            { label: 'HQ Address', value: '12 Marina Road, Lagos Island', type: 'text' },
            { label: 'Default Currency', value: 'NGN', type: 'text' },
            { label: 'Timezone', value: 'Africa/Lagos (WAT, UTC+1)', type: 'text' },
            { label: 'System Language', value: 'English', type: 'text' },
            { label: 'Support Email', value: 'support@memphismfb.com', type: 'email' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{f.label}</label>
              <input
                type={f.type}
                defaultValue={f.value}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Branch Operations</h4>
        <p className="text-xs text-slate-400 mb-4">Requires manual override outside hours</p>
        <div className="grid grid-cols-2 gap-5">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => (
            <div key={day} className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600 w-20">{day}</span>
              <input type="time" defaultValue="08:00" className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" />
              <span className="text-xs text-slate-400">—</span>
              <input type="time" defaultValue="17:00" className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
