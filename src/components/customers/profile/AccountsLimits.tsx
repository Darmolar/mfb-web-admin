import { Badge, statusBadge } from '../../ui/Badge'
import { useApi } from '../../../hooks/useApi'
import { getCustomerLimits } from '../../../api'
import type { CustomerDetail } from '../../../api'
import moment from 'moment'

interface Props { customer: CustomerDetail }

function fmt(n?: number) { return `₦${(n ?? 0).toLocaleString()}` }

export function AccountsLimits({ customer }: Props) {
  const { data: limits, loading } = useApi(
    () => getCustomerLimits(customer.id).then(r => r.data),
    [customer.id],
  )

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Account Info</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account No</p>
            <p className="text-sm font-bold text-slate-700 font-mono">{customer.accountNumber}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <Badge label={customer.status} variant={statusBadge(customer.status)} size="md" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transaction Override</p>
            <p className="text-sm text-slate-600">
              {customer.transactionLimitOverride != null ? fmt(customer.transactionLimitOverride) : 'None'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Onboarded</p>
            <p className="text-sm text-slate-600">{customer.createdAt ? moment(customer.createdAt).fromNow() : '—'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Transaction Limits</h4>
        {loading ? (
          <p className="text-xs text-slate-400">Loading limits…</p>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'Daily Transfer Limit', value: limits?.dailyTransferLimit != null ? fmt(limits.dailyTransferLimit) : '—' },
              { label: 'Single Transaction Limit', value: limits?.singleTransactionLimit != null ? fmt(limits.singleTransactionLimit) : '—' },
              { label: 'Balance Cap', value: limits?.balanceCap != null ? fmt(limits.balanceCap) : '—' },
            ].map(l => (
              <div key={l.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">{l.label}</span>
                <span className="text-sm font-bold text-slate-700">{l.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
