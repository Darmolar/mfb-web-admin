import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { RoleManagement } from './RoleManagement'

const tabs = [
  { id: 'roles', label: 'Role Management' },
]

export function GovernancePage() {
  const [active, setActive] = useState('roles')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'roles' && <RoleManagement />}
    </div>
  )
}
