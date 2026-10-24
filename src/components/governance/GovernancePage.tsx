import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { RoleManagement } from './RoleManagement'
import { ApprovalManagement } from './ApprovalManagement'

const tabs = [
  { id: 'roles', label: 'Role Management' },
  { id: 'approvals', label: 'Approval Management' },
]

export function GovernancePage() {
  const [active, setActive] = useState('roles')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'roles' && <RoleManagement />}
      {active === 'approvals' && <ApprovalManagement />}
    </div>
  )
}
