import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { AuthWorkflows } from './AuthWorkflows'
import { ThresholdLimits } from './ThresholdLimits'
import { RoleManagement } from './RoleManagement'

const tabs = [
  { id: 'workflow', label: 'Authorization Workflows' },
  { id: 'limits', label: 'Corporate Limits' },
  { id: 'roles', label: 'Role Management' },
]

export function GovernancePage() {
  const [active, setActive] = useState('workflow')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'workflow' && <AuthWorkflows />}
      {active === 'limits' && <ThresholdLimits />}
      {active === 'roles' && <RoleManagement />}
    </div>
  )
}
