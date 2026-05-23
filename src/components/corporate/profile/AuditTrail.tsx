import { Download } from 'lucide-react'
import { mockAuditLogs } from '../../../data/mockData'
import { Badge, statusBadge } from '../../ui/Badge'
import { Button } from '../../ui/Button'

export function AuditTrail() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm"><Download size={13} /> Export CSV</Button>
        <Button variant="secondary" size="sm"><Download size={13} /> Generate PDF</Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Institutional Audit Trail</h4>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Actor', 'Action Executed', 'Context', 'Resource ID', 'Timestamp', 'Severity'].map(h => (
                <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockAuditLogs.map(log => (
              <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <p className="text-xs font-semibold text-slate-700">{log.actor}</p>
                  <p className="text-[10px] text-slate-400">{log.actorRole}</p>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-slate-600">{log.action}</td>
                <td className="px-6 py-4 text-xs text-slate-500">{log.context}</td>
                <td className="px-6 py-4 text-xs font-mono text-slate-400">{log.resourceId}</td>
                <td className="px-6 py-4 text-xs text-slate-400">{log.timestamp}</td>
                <td className="px-6 py-4">
                  <Badge label={log.severity} variant={statusBadge(log.severity === 'Info' ? 'Verified' : log.severity === 'Warning' ? 'Pending' : 'Flagged')} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
