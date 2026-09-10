import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { IdentityProviderSettings } from './IdentityProviderSettings'
import { PushBroadcast } from './PushBroadcast'

const tabs = [
  { id: 'identity', label: 'Identity Providers' },
  { id: 'push', label: 'Push Broadcast' },
]

export function SettingsPage() {
  const [active, setActive] = useState('identity')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'identity' && <IdentityProviderSettings />}
      {active === 'push' && <PushBroadcast />}
    </div>
  )
}
