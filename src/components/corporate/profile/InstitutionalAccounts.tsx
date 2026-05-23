import type { CorporateEntity } from '../../../types'

interface Props { entity: CorporateEntity }

export function InstitutionalAccounts({ entity }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Registered Information</h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Entity Name', value: entity.name },
            { label: 'RC Number', value: entity.rcNumber },
            { label: 'Tax ID', value: entity.taxId },
            { label: 'HQ Address', value: entity.hqAddress },
            { label: 'Industry', value: entity.industry },
            { label: 'Default Currency', value: entity.defaultCurrency },
            { label: 'Onboarded', value: entity.onboardedDate },
            { label: 'Active Users', value: String(entity.activeUsers) },
          ].map(r => (
            <div key={r.label} className="py-2 border-b border-slate-50 last:border-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.label}</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{r.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Compliance Clearances</h4>
        <div className="flex flex-wrap gap-2">
          {entity.complianceClearances.map(c => (
            <span key={c} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg">{c}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
