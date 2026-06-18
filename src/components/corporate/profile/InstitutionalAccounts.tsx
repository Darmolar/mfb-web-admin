import type { CorporateDetail } from '../../../api'
import moment from 'moment'

interface Props { detail: CorporateDetail }

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-semibold text-slate-700">{value || '—'}</span>
    </div>
  )
}

export function InstitutionalAccounts({ detail }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Registered Information</h4>
        <Row label="Entity Name" value={detail.companyName} />
        <Row label="RC Number" value={detail.rcNumber} />
        <Row label="Tax Identification Number" value={detail.tin} />
        <Row label="Sector" value={detail.sector} />
        <Row label="HQ Address" value={detail.address} />
        <Row label="Incorporation Date" value={detail.incorporationDate ? moment(detail.incorporationDate).fromNow() : '—'} />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Banking Details</h4>
        <Row label="Primary Account Number" value={detail.primaryAccountNumber} />
        <Row label="Status" value={detail.status} />
        <Row label="Single Transfer Limit" value={`₦${detail.singleTransferLimit?.toLocaleString() ?? '—'}`} />
        <Row label="Daily Transfer Limit" value={`₦${detail.dailyTransferLimit?.toLocaleString() ?? '—'}`} />
        <Row label="Onboarded" value={detail.createdAt ? moment(detail.createdAt).fromNow() : '—'} />
      </div>
    </div>
  )
}
