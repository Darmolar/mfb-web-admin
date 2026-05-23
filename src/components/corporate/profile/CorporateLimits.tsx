import { Button } from '../../ui/Button'

const limits = [
  { tier: 'Standard Corporate', maxSingle: '₦50,000,000', maxDaily: '₦200,000,000' },
  { tier: 'Premium Corporate', maxSingle: '₦200,000,000', maxDaily: '₦1,000,000,000' },
  { tier: 'Institutional', maxSingle: 'Unlimited', maxDaily: 'Unlimited' },
]

export function CorporateLimits() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Institutional Threshold Standards</h4>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              {['Tier', 'Max Single', 'Max Daily', ''].map(h => (
                <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {limits.map(l => (
              <tr key={l.tier} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-6 py-4 text-sm font-semibold text-slate-700">{l.tier}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">{l.maxSingle}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">{l.maxDaily}</td>
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
