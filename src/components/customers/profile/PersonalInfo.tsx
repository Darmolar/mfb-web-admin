import type { CustomerDetail } from '../../../api'

interface Props { customer: CustomerDetail }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value || '—'}</span>
    </div>
  )
}

export function PersonalInfo({ customer }: Props) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.username
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Primary Details</h4>
        <Row label="Full Legal Name" value={fullName} />
        <Row label="Username" value={customer.username} />
        <Row label="Residential Address" value={customer.residentialAddress} />
        <Row label="Member Since" value={customer.createdAt?.split('T')[0] ?? '—'} />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Identity Verifiers</h4>
        <Row label="Email Address" value={customer.email} />
        <Row label="Phone Number" value={customer.phoneNumber} />
        <Row label="BVN" value={customer.bvn} />
        <Row label="Account Number" value={customer.accountNumber} />
      </div>
    </div>
  )
}
