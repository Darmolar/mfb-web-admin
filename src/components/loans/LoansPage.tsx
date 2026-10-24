import { useSearchParams } from 'react-router-dom'
import { TabBar } from '../ui/TabBar'
import { LoanProducts } from './LoanProducts'
import { LoanApplications } from './LoanApplications'

const tabs = [
  { id: 'products', label: 'Loan Products' },
  { id: 'applications', label: 'Applications' },
]

export function LoansPage() {
  // The tab lives in the URL so returning from an application lands back on Applications.
  const [params, setParams] = useSearchParams()
  const active = params.get('tab') === 'applications' ? 'applications' : 'products'
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={id => setParams(id === 'products' ? {} : { tab: id }, { replace: true })} />
      {active === 'products' && <LoanProducts />}
      {active === 'applications' && <LoanApplications />}
    </div>
  )
}
