import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { SavingsProducts } from './SavingsProducts'
import { SavingsGoals } from './SavingsGoals'

const tabs = [
  { id: 'products', label: 'Savings Products' },
  { id: 'goals', label: 'Customer Goals' },
]

export function SavingsPage() {
  const [active, setActive] = useState('products')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'products' && <SavingsProducts />}
      {active === 'goals' && <SavingsGoals />}
    </div>
  )
}
