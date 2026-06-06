import { Badge, statusBadge } from '../../ui/Badge'
import type { CustomerDetail } from '../../../api'

interface Props { customer: CustomerDetail }

export function KYCDocuments({ customer }: Props) {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Account Status</h4>
        <div className="flex items-center gap-3">
          <Badge label={customer.status} variant={statusBadge(customer.status)} size="md" />
        </div>
        <p className="text-xs text-slate-500 mt-3">
          KYC document history and tier upgrade requests are managed through the{' '}
          <span className="font-semibold text-slate-700">KYC &amp; Compliance</span> queue.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Identity on File</h4>
        <div className="space-y-3">
          {[
            { label: 'BVN', value: customer.bvn },
            { label: 'Account Number', value: customer.accountNumber },
            { label: 'Email', value: customer.email },
            { label: 'Phone', value: customer.phoneNumber },
          ].map(r => (
            <div key={r.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
              <span className="text-xs font-semibold text-slate-500">{r.label}</span>
              <span className="text-xs font-mono text-slate-700">{r.value || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
