import { useSearchParams } from 'react-router-dom'
import { TabBar } from '../ui/TabBar'
import { CardProducts } from './CardProducts'
import { CardRequests } from './CardRequests'

const tabs = [
  { id: 'products', label: 'Card Products' },
  { id: 'requests', label: 'Card Requests' },
]

export function CardsPage() {
  // The tab lives in the URL so links and the back button keep the user's place.
  const [params, setParams] = useSearchParams()
  const active = params.get('tab') === 'requests' ? 'requests' : 'products'
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={id => setParams(id === 'products' ? {} : { tab: id }, { replace: true })} />
      {active === 'products' && <CardProducts />}
      {active === 'requests' && <CardRequests />}
    </div>
  )
}
