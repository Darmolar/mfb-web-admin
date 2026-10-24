import { useSearchParams } from 'react-router-dom'
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
  // The tab lives in the URL so links (e.g. from the Overview) open the right tab.
  const [params, setParams] = useSearchParams()
  const active = tabs.some(t => t.id === params.get('tab')) ? params.get('tab')! : 'overview'
  const setActive = (id: string) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'overview' && <TransactionOverview />}
      {active === 'all' && <AllTransactions />}
      {active === 'single' && <SingleTransfers />}
    </div>
  )
}
