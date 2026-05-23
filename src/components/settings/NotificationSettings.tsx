import { useState } from 'react'
import { Button } from '../ui/Button'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${checked ? 'bg-slate-700' : 'bg-slate-200'} relative`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

const eventTypes = [
  'KYC Application Submitted', 'Large Transaction Alert', 'Failed Login Attempt',
  'System Batch Complete', 'Entity Suspended', 'Limit Override Created',
]

export function NotificationSettings() {
  const [email, setEmail] = useState(true)
  const [inApp, setInApp] = useState(true)
  const [sms, setSms] = useState(false)
  const [frequency, setFrequency] = useState('Critical Only')

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Delivery Channels</h4>
        <div className="space-y-4">
          {[
            { label: 'Email', sub: 'admin@memphismfb.com', value: email, set: setEmail },
            { label: 'In-App', sub: 'Bell icon & notification panel', value: inApp, set: setInApp },
            { label: 'SMS', sub: '+234 800 000 0000', value: sms, set: setSms },
          ].map(ch => (
            <div key={ch.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">{ch.label}</p>
                <p className="text-xs text-slate-400">{ch.sub}</p>
              </div>
              <Toggle checked={ch.value} onChange={ch.set} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Frequency</h4>
        <div className="flex gap-2">
          {['Daily Summary', 'Weekly Report', 'Critical Only'].map(f => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${frequency === f ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Event Type Filters</h4>
        <div className="grid grid-cols-2 gap-3">
          {eventTypes.map(ev => (
            <label key={ev} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-slate-700" />
              <span className="text-sm text-slate-600">{ev}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
