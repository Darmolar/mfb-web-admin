import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { TransactionOverview } from './TransactionOverview'
import { SingleTransfers } from './SingleTransfers'
import { AllTransactions } from './AllTransactions'

const tabs = [
  { id: 'overview', label: 'Transaction Overview' },
  { id: 'all', label: 'All Transactions' },
  { id: 'single', label: 'Single Transfers' },
]

export function OversightPage() {
  const [active, setActive] = useState('overview')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'overview' && <TransactionOverview />}
      {active === 'all' && <AllTransactions />}
      {active === 'single' && <SingleTransfers />}
    </div>
  )
}
