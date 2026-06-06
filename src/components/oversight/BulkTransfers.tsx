import { Info } from 'lucide-react'

export function BulkTransfers() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
        <Info size={22} className="text-slate-400" />
      </div>
      <div className="text-center max-w-sm">
        <p className="text-sm font-semibold text-slate-700 mb-1">Per-Corporate View</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Bulk transfer batches are scoped per corporate entity. To view bulk batches for a specific company,
          navigate to <span className="font-semibold text-slate-700">Corporate Banking</span>, open the company
          profile, and select the <span className="font-semibold text-slate-700">Transaction History</span> tab.
        </p>
      </div>
    </div>
  )
}
