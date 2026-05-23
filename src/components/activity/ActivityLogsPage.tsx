import { useState } from 'react'
import { Download, Flag, AlertTriangle } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { mockAuditLogs } from '../../data/mockData'
import type { AuditLog } from '../../types'

export function ActivityLogsPage() {
  const [selected, setSelected] = useState<AuditLog | null>(null)

  return (
    <>
      <div className="space-y-5">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700">Regulatory Compliance Notice</p>
            <p className="text-xs text-amber-600 mt-0.5">All activity logs are retained for 7 years in compliance with CBN directive on electronic records preservation.</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">RETAIL NETWORK SYSTEM MONITORING</h3>
            <p className="text-sm text-slate-400 mt-0.5">All admin and system actions are recorded here.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Download size={13} /> Export JSON</Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Admin / Actor', 'Action Executed', 'Context', 'Resource ID', 'Timestamp', 'Severity', ''].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockAuditLogs.map(log => (
                <tr
                  key={log.id}
                  className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => setSelected(log)}
                >
                  <td className="px-6 py-4">
                    <p className="text-xs font-semibold text-slate-700">{log.actor}</p>
                    <p className="text-[10px] text-slate-400">{log.actorRole}</p>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-600 max-w-[180px] truncate">{log.action}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{log.context}</td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">{log.resourceId}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{log.timestamp}</td>
                  <td className="px-6 py-4">
                    <Badge
                      label={log.severity}
                      variant={log.severity === 'Info' ? 'blue' : log.severity === 'Warning' ? 'amber' : 'red'}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      className="text-slate-300 hover:text-amber-500 cursor-pointer"
                      onClick={e => { e.stopPropagation() }}
                      title="Flag for revision"
                    >
                      <Flag size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Audit Event Dispatched">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Admin / Actor', value: selected.actor },
                { label: 'Actor Role', value: selected.actorRole },
                { label: 'Action Executed', value: selected.action },
                { label: 'Context', value: selected.context },
                { label: 'Resource ID', value: selected.resourceId },
                { label: 'IP Address', value: selected.ipAddress },
                { label: 'Timestamp', value: selected.timestamp },
                { label: 'Severity', value: selected.severity },
              ].map(r => (
                <div key={r.label}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.label}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Event Payload / Description</p>
              <p className="text-sm text-slate-700">{selected.payload}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Event Lifecycle</p>
              <div className="flex items-center gap-2">
                {['Received', 'Validated', 'Executed', 'Logged'].map((step, i, arr) => (
                  <>
                    <div key={step} className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <span className="text-white text-[8px] font-black">✓</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{step}</span>
                    </div>
                    {i < arr.length - 1 && <span key={`a-${i}`} className="text-slate-300">→</span>}
                  </>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>
                <Flag size={13} /> Flag for Revision
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>
                <Download size={13} /> Export JSON
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
