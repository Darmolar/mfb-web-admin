import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { LoanProducts } from './LoanProducts'
import { LoanApplications } from './LoanApplications'

const tabs = [
  { id: 'products', label: 'Loan Products' },
  { id: 'applications', label: 'Applications' },
]

export function LoansPage() {
  const [active, setActive] = useState('products')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'products' && <LoanProducts />}
      {active === 'applications' && <LoanApplications />}
    </div>
  )
}
