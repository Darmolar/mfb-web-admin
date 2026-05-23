import { Button } from '../ui/Button'

const limits = [
  { tier: 'Standard Corporate', maxSingle: '₦50,000,000', maxDaily: '₦200,000,000' },
  { tier: 'Premium Corporate', maxSingle: '₦200,000,000', maxDaily: '₦1,000,000,000' },
  { tier: 'Institutional', maxSingle: 'Unlimited', maxDaily: 'Unlimited' },
  { tier: 'Retail Tier 1', maxSingle: '₦20,000', maxDaily: '₦50,000' },
  { tier: 'Retail Tier 2', maxSingle: '₦200,000', maxDaily: '₦500,000' },
  { tier: 'Retail Tier 3', maxSingle: '₦10,000,000', maxDaily: 'Unlimited' },
]

export function ThresholdLimits() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Institutional Threshold Standards</h4>
          <Button size="sm">Save Changes</Button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Transaction Scope', 'Max Single', 'Max Daily', ''].map(h => (
                <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {limits.map(l => (
              <tr key={l.tier} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-6 py-4 text-sm font-semibold text-slate-700">{l.tier}</td>
                <td className="px-6 py-4">
                  <input
                    defaultValue={l.maxSingle}
                    className="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    defaultValue={l.maxDaily}
                    className="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                </td>
                <td className="px-6 py-4">
                  <Button variant="secondary" size="sm">Configure Custom Limit</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
