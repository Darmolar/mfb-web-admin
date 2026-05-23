import { useState } from 'react'
import { Plus, X } from 'lucide-react'
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

export function SecuritySettings() {
  const [complexity, setComplexity] = useState(true)
  const [ipList, setIpList] = useState(['102.89.0.0/16', '41.58.0.0/16'])
  const [newIp, setNewIp] = useState('')

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Password Policy</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Min Length</p>
              <p className="text-xs text-slate-400">Minimum password character count</p>
            </div>
            <input type="number" defaultValue={12} min={8} max={32} className="w-16 text-center text-sm font-bold border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Require Complexity</p>
              <p className="text-xs text-slate-400">Must contain uppercase, number, and symbol</p>
            </div>
            <Toggle checked={complexity} onChange={setComplexity} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Max Concurrent Sessions</p>
              <p className="text-xs text-slate-400">Per admin account</p>
            </div>
            <input type="number" defaultValue={2} min={1} max={10} className="w-16 text-center text-sm font-bold border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">IP Whitelist</h4>
        <div className="flex flex-wrap gap-2 mb-4">
          {ipList.map(ip => (
            <span key={ip} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700">
              {ip}
              <button onClick={() => setIpList(ipList.filter(i => i !== ip))} className="text-slate-400 hover:text-red-500 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newIp}
            onChange={e => setNewIp(e.target.value)}
            placeholder="e.g. 192.168.1.0/24"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
          <Button size="sm" onClick={() => { if (newIp) { setIpList([...ipList, newIp]); setNewIp('') } }}>
            <Plus size={14} /> Add New
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
