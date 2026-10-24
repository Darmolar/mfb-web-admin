import type { CustomerDetail } from '../../../api'
import moment from 'moment'

interface Props { customer: CustomerDetail }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-semibold text-slate-700 break-words min-w-0">{value || '—'}</span>
    </div>
  )
}

export function PersonalInfo({ customer }: Props) {
  const fullName = [customer.firstName, customer.middleName, customer.lastName].filter(Boolean).join(' ') || customer.username
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Primary Details</h4>
        <Row label="Full Legal Name" value={fullName} />
        <Row label="Username" value={customer.username} />
        <Row label="Date of Birth" value={customer.dateOfBirth ?? ''} />
        <Row label="State / LGA of Origin" value={[customer.stateOfOrigin, customer.lgaOfOrigin].filter(Boolean).join(' / ')} />
        <Row label="Residential Address" value={customer.residentialAddress} />
        <Row label="Occupation" value={customer.occupation ?? ''} />
        <Row label="Employer" value={customer.employer ?? ''} />
        <Row label="Next of Kin" value={customer.nextOfKin ?? ''} />
        <Row label="Member Since" value={customer.createdAt ? moment(customer.createdAt).fromNow() : '—'} />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Identity Verifiers</h4>
        <Row label="Email Address" value={customer.email} />
        <Row label="Phone Number" value={customer.phoneNumber} />
        <Row label="BVN" value={customer.bvn} />
        <Row label="NIN" value={customer.nin ?? ''} />
        <Row label="Account Number" value={customer.accountNumber} />
        <Row label="Legacy Account Number" value={customer.legacyAccountNumber ?? ''} />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">System Information</h4>
        <Row label="Customer ID" value={customer.id} />
        <Row label="Core Customer ID" value={customer.coreCustomerId ?? ''} />
        <Row label="Account Officer Code" value={customer.accountOfficerCode ?? ''} />
        <Row label="Account Tier" value={customer.accountTier != null ? `Tier ${customer.accountTier}` : ''} />
        <Row label="Status" value={customer.status} />
        <Row label="CBA Verified" value={customer.cbaVerified == null ? '' : customer.cbaVerified
          ? `Yes${customer.cbaVerifiedAt ? ` · ${moment(customer.cbaVerifiedAt).format('DD MMM YYYY, h:mm a')}` : ''}`
          : `No${customer.cbaVerificationFailedAt ? ` · failed ${moment(customer.cbaVerificationFailedAt).format('DD MMM YYYY, h:mm a')}` : ''}`} />
        <Row label="Transactions Blocked" value={customer.txnBlocked == null ? '' : customer.txnBlocked ? `Yes${customer.txnBlockReason ? ` · ${customer.txnBlockReason}` : ''}` : 'No'} />
        <Row label="Created At" value={customer.createdAt ? moment(customer.createdAt).format('DD MMM YYYY, h:mm a') : '—'} />
        <Row label="Last Updated" value={customer.updatedAt ? moment(customer.updatedAt).format('DD MMM YYYY, h:mm a') : '—'} />
      </div>
    </div>
  )
}
