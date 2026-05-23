const workflows = [
  {
    id: 'single', name: 'Single Transfer', scope: 'Outbound payment to external account',
    range: '₦100,000 – ₦50,000,000', path: 'Initiator → Finance Director → Treasurer',
    onFailure: 'Escalate to Higher Tier',
  },
  {
    id: 'bulk', name: 'Bulk Disbursement', scope: 'Batch payroll / vendor payments',
    range: 'Any amount > ₦500,000 aggregate', path: 'Initiator → Accountant → Finance Director → CEO',
    onFailure: 'Auto-Reject Payload',
  },
  {
    id: 'loan', name: 'Loan Issuance', scope: 'Credit facility drawdown',
    range: '₦1,000,000 – Unlimited', path: 'Credit Officer → Risk Manager → MD',
    onFailure: 'Notify System Auditor',
  },
  {
    id: 'timeout', name: 'System Timeout', scope: 'Pending approvals past 48 hours',
    range: 'All amounts', path: 'Auto-escalated to compliance queue',
    onFailure: 'Discard & Exit',
  },
]

const failureOptions = ['Auto-Reject Payload', 'Escalate to Higher Tier', 'Notify System Auditor', 'Discard & Exit']

export function ApprovalWorkflows() {
  return (
    <div>
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Authorization Workflows</h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {workflows.map(w => (
          <div key={w.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h5 className="text-sm font-bold text-slate-800 mb-4">{w.name}</h5>
            <div className="space-y-2 text-xs mb-4">
              {[
                { label: 'Transaction Scope', value: w.scope },
                { label: 'Financial Range', value: w.range },
                { label: 'Workflow Path', value: w.path },
              ].map(r => (
                <div key={r.label}>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{r.label}</p>
                  <p className="text-slate-700 font-semibold mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">On Failure Action</p>
              <select className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300">
                {failureOptions.map(o => (
                  <option key={o} selected={o === w.onFailure}>{o}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
