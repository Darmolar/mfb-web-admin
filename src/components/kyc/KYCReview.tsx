import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { mockKYCApplications } from '../../data/mockData'
import type { KYCApplication } from '../../types'
import { overviewStats } from '../../data/mockData'

export function KYCReview() {
  const [selected, setSelected] = useState<KYCApplication | null>(null)

  return (
    <>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending Review', value: overviewStats.kycPending, color: 'text-amber-600 bg-amber-50' },
          { label: 'Approved Today', value: overviewStats.approvedToday, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Rejected Today', value: overviewStats.rejectedToday, color: 'text-red-600 bg-red-50' },
          { label: 'Avg Review Time', value: '4.2 MIN', color: 'text-blue-600 bg-blue-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl px-5 py-4 ${s.color}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{s.label}</p>
            <p className="text-2xl font-black mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Customer Details', 'Request', 'Documents', 'Risk Level', 'Time', 'Action'].map(h => (
                <th key={h} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockKYCApplications.map(app => (
              <tr key={app.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="text-sm font-semibold text-slate-700">{app.customerName}</p>
                  <p className="text-xs text-slate-400">{app.phone}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-semibold text-slate-600">{app.requestType}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-500">{app.documents.length} document{app.documents.length !== 1 ? 's' : ''}</span>
                </td>
                <td className="px-6 py-4">
                  <Badge label={app.riskLevel} variant={statusBadge(app.riskLevel)} />
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-400">{app.submittedAt}</span>
                </td>
                <td className="px-6 py-4">
                  <Button size="sm" onClick={() => setSelected(app)}>Review</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Review Application">
          <div className="space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-800">{selected.customerName}</h4>
                <p className="text-xs text-slate-400">{selected.phone} · {selected.requestType}</p>
              </div>
              <Badge label={selected.riskLevel} variant={statusBadge(selected.riskLevel)} size="md" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'BVN Verified Match', ok: selected.bvnMatch },
                { label: 'Face matches ID', ok: selected.faceMatch },
                { label: 'Utility Bill Valid', ok: selected.utilityBillValid },
              ].map(check => (
                <div key={check.label} className={`flex items-center gap-2 p-3 rounded-xl ${check.ok ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {check.ok
                    ? <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                    : <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                  <span className="text-xs font-semibold text-slate-700">{check.label}</span>
                </div>
              ))}
            </div>

            <div>
              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Submitted Documents</h5>
              <div className="space-y-2">
                {selected.documents.map(doc => (
                  <div key={doc.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-700">{doc.name}</span>
                    <div className="flex items-center gap-1.5">
                      {doc.status === 'Verified'
                        ? <CheckCircle size={14} className="text-emerald-500" />
                        : doc.status === 'Pending'
                        ? <AlertCircle size={14} className="text-amber-500" />
                        : <XCircle size={14} className="text-red-400" />}
                      <span className="text-xs font-semibold text-slate-500">{doc.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100" />
            <div className="flex gap-3">
              <Button variant="danger" className="flex-1" onClick={() => setSelected(null)}>Reject</Button>
              <Button variant="success" className="flex-1" onClick={() => setSelected(null)}>Approve & Upgrade</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
