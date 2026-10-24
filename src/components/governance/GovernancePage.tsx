import { useSearchParams } from 'react-router-dom'
import { TabBar } from '../ui/TabBar'
import { RoleManagement } from './RoleManagement'
import { ApprovalManagement } from './ApprovalManagement'

const tabs = [
  { id: 'roles', label: 'Role Management' },
  { id: 'approvals', label: 'Approval Management' },
]

export function GovernancePage() {
  // The tab lives in the URL so links (e.g. from the notifications bell) open the right tab.
  const [params, setParams] = useSearchParams()
  const active = tabs.some(t => t.id === params.get('tab')) ? params.get('tab')! : 'roles'
  const setActive = (id: string) => setParams(id === 'roles' ? {} : { tab: id }, { replace: true })
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'roles' && <RoleManagement />}
      {active === 'approvals' && <ApprovalManagement />}
    </div>
  )
}
