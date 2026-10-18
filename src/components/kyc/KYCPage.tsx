import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { KYCConfiguration } from './KYCConfiguration'
import { KYCSubmissionReview } from './KYCSubmissionReview'
import { KYCReview } from './KYCReview'
import { CustomerLimits } from './CustomerLimits'
import { IdentityDocuments } from './IdentityDocuments'

const tabs = [
  { id: 'configuration', label: 'Process Configuration' },
  { id: 'submissions', label: 'Process Submissions' },
  { id: 'review', label: 'Tier Upgrade Review' },
  { id: 'limits', label: 'Customer Limits' },
  { id: 'identity-docs', label: 'Identity Documents' },
]

export function KYCPage() {
  const [active, setActive] = useState('submissions')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'configuration' && <KYCConfiguration />}
      {active === 'submissions' && <KYCSubmissionReview />}
      {active === 'review' && <KYCReview />}
      {active === 'limits' && <CustomerLimits />}
      {active === 'identity-docs' && <IdentityDocuments />}
    </div>
  )
}
