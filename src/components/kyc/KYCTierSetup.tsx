import { CheckCircle } from 'lucide-react'
import { Badge } from '../ui/Badge'

const tiers = [
  {
    id: 'Tier 1', label: 'Basic Entry Level', active: true,
    documents: [
      { name: 'Passport Photograph', mandatory: true },
      { name: 'Valid ID Card', mandatory: true },
    ],
    balanceCap: '₦300,000', dailyTransfer: '₦50,000', singleTransaction: '₦20,000',
  },
  {
    id: 'Tier 2', label: 'Standard Account', active: true,
    documents: [
      { name: 'Passport Photograph', mandatory: true },
      { name: 'Valid ID Card', mandatory: true },
      { name: 'Utility Bill', mandatory: true },
    ],
    balanceCap: '₦5,000,000', dailyTransfer: '₦500,000', singleTransaction: '₦200,000',
  },
  {
    id: 'Tier 3', label: 'Premium / Corporate', active: true,
    documents: [
      { name: 'Passport Photograph', mandatory: true },
      { name: 'Valid ID Card', mandatory: true },
      { name: 'Utility Bill', mandatory: true },
      { name: 'Verified Utility Bill', mandatory: true },
      { name: 'Indemnity Form', mandatory: true },
      { name: 'Reference Forms', mandatory: false },
      { name: 'Proof of Address Visit', mandatory: false },
    ],
    balanceCap: 'Unlimited', dailyTransfer: 'Unlimited', singleTransaction: '₦10,000,000',
  },
]

export function KYCTierSetup() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-600">Corporate &amp; Retail Tiers</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {tiers.map(tier => (
          <div key={tier.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <Badge label={tier.id} variant={tier.id === 'Tier 1' ? 'slate' : tier.id === 'Tier 2' ? 'blue' : 'purple'} size="md" />
                <p className="text-sm font-bold text-slate-700 mt-2">{tier.label}</p>
              </div>
              {tier.active && <Badge label="ACTIVE" variant="green" />}
            </div>

            <div className="mb-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Required Documents</p>
              <div className="space-y-1.5">
                {tier.documents.map(doc => (
                  <div key={doc.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={12} className="text-emerald-500" />
                      <span className="text-xs text-slate-600">{doc.name}</span>
                    </div>
                    {doc.mandatory && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">MANDATORY</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-slate-100 mb-4" />

            <div className="space-y-2 text-xs">
              {[
                { label: 'Balance Cap', value: tier.balanceCap },
                { label: 'Daily Transfer', value: tier.dailyTransfer },
                { label: 'Single Transaction', value: tier.singleTransaction },
              ].map(limit => (
                <div key={limit.label} className="flex justify-between">
                  <span className="text-slate-400 font-semibold">{limit.label}</span>
                  <span className="text-slate-700 font-bold">{limit.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
