import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { ComplianceFlags } from './ComplianceFlags'
import { RaiseFlag } from './RaiseFlag'

const tabs = [
  { id: 'flags', label: 'Compliance Flags' },
  { id: 'raise', label: 'Raise New Flag' },
]

export function CompliancePage() {
  const [active, setActive] = useState('flags')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'flags' && <ComplianceFlags />}
      {active === 'raise' && <RaiseFlag onSuccess={() => setActive('flags')} />}
    </div>
  )
}
