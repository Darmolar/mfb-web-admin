import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { KYCReview } from './KYCReview'
import { KYCTierSetup } from './KYCTierSetup'
import { CustomerLimits } from './CustomerLimits'

const tabs = [
  { id: 'review', label: 'KYC Review' },
  { id: 'tier-setup', label: 'KYC Tier Setup' },
  { id: 'limits', label: 'Customer Limits' },
]

export function KYCPage() {
  const [active, setActive] = useState('review')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'review' && <KYCReview />}
      {active === 'tier-setup' && <KYCTierSetup />}
      {active === 'limits' && <CustomerLimits />}
    </div>
  )
}
