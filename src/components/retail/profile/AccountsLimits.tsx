import type { RetailCustomer } from '../../../types'
import { Badge, statusBadge } from '../../ui/Badge'

interface Props { customer: RetailCustomer }

function fmt(n: number) {
  return `₦${n.toLocaleString()}`
}

const tierLimits: Record<string, { balanceCap: string; dailyTransfer: string; singleTransaction: string }> = {
  'Tier 1': { balanceCap: '₦300,000', dailyTransfer: '₦50,000', singleTransaction: '₦20,000' },
  'Tier 2': { balanceCap: '₦5,000,000', dailyTransfer: '₦500,000', singleTransaction: '₦200,000' },
  'Tier 3': { balanceCap: 'Unlimited', dailyTransfer: 'Unlimited', singleTransaction: '₦10,000,000' },
  Unverified: { balanceCap: '₦100,000', dailyTransfer: '₦20,000', singleTransaction: '₦10,000' },
}

export function AccountsLimits({ customer }: Props) {
  const limits = tierLimits[customer.kycTier]

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Account Info</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account No</p>
            <p className="text-sm font-bold text-slate-700 font-mono">{customer.accountNo}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Balance</p>
            <p className="text-lg font-black text-slate-800">{fmt(customer.balance)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <Badge label={customer.status} variant={statusBadge(customer.status)} size="md" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Active</p>
            <p className="text-sm text-slate-600">{customer.lastActive}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Transaction Limits ({customer.kycTier})</h4>
        <div className="space-y-3">
          {[
            { label: 'Balance Cap', value: limits.balanceCap },
            { label: 'Daily Transfer', value: limits.dailyTransfer },
            { label: 'Single Transaction', value: limits.singleTransaction },
          ].map(l => (
            <div key={l.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-500">{l.label}</span>
              <span className="text-sm font-bold text-slate-700">{l.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
