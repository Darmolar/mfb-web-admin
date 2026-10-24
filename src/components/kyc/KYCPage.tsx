import { useSearchParams } from 'react-router-dom'
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
  // The tab lives in the URL so links (e.g. from the notifications bell) open the right tab.
  const [params, setParams] = useSearchParams()
  const active = tabs.some(t => t.id === params.get('tab')) ? params.get('tab')! : 'submissions'
  const setActive = (id: string) => setParams(id === 'submissions' ? {} : { tab: id }, { replace: true })
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
