import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { SingleTransfers } from './SingleTransfers'
import { BulkTransfers } from './BulkTransfers'

const tabs = [
  { id: 'overview', label: 'Transaction Overview' },
  { id: 'single', label: 'Single Transfers' },
  { id: 'bulk', label: 'Bulk Transfers' },
]

export function OversightPage() {
  const [active, setActive] = useState('single')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'overview' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400 text-sm">
          Transaction overview charts coming soon.
        </div>
      )}
      {active === 'single' && <SingleTransfers />}
      {active === 'bulk' && <BulkTransfers />}
    </div>
  )
}
