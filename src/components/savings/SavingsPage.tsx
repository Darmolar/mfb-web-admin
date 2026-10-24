import { useSearchParams } from 'react-router-dom'
import { TabBar } from '../ui/TabBar'
import { SavingsProducts } from './SavingsProducts'
import { SavingsGoals } from './SavingsGoals'

const tabs = [
  { id: 'products', label: 'Savings Products' },
  { id: 'goals', label: 'Customer Goals' },
]

export function SavingsPage() {
  // The tab lives in the URL so links and the back button keep the user's place.
  const [params, setParams] = useSearchParams()
  const active = params.get('tab') === 'goals' ? 'goals' : 'products'
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={id => setParams(id === 'products' ? {} : { tab: id }, { replace: true })} />
      {active === 'products' && <SavingsProducts />}
      {active === 'goals' && <SavingsGoals />}
    </div>
  )
}
