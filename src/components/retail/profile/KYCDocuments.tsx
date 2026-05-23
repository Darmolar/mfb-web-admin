import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import type { RetailCustomer } from '../../../types'
import { Badge, statusBadge } from '../../ui/Badge'

interface Props { customer: RetailCustomer }

const tierDocs: Record<string, string[]> = {
  'Tier 1': ['Passport Photograph', 'Valid ID Card'],
  'Tier 2': ['Passport Photograph', 'Valid ID Card', 'Utility Bill'],
  'Tier 3': ['Passport Photograph', 'Valid ID Card', 'Utility Bill', 'Indemnity Form', 'Verified Utility Bill'],
  Unverified: [],
}

const docStatuses = ['Verified', 'Verified', 'Pending', 'Missing'] as const

export function KYCDocuments({ customer }: Props) {
  const docs = tierDocs[customer.kycTier] ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">KYC Tier</p>
          <div className="flex items-center gap-2">
            <Badge label={customer.kycTier} variant={statusBadge(customer.kycTier)} size="md" />
            <Badge label={customer.status} variant={statusBadge(customer.status)} size="md" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Submitted Documents</h4>
        {docs.length === 0 ? (
          <p className="text-sm text-slate-400">No KYC documents on file.</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc, i) => {
              const s = docStatuses[i % docStatuses.length]
              return (
                <div key={doc} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-sm font-semibold text-slate-700">{doc}</span>
                  <div className="flex items-center gap-1.5">
                    {s === 'Verified' && <CheckCircle size={14} className="text-emerald-500" />}
                    {s === 'Pending' && <AlertCircle size={14} className="text-amber-500" />}
                    {s === 'Missing' && <XCircle size={14} className="text-red-400" />}
                    <span className="text-xs font-semibold text-slate-500">{s}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
