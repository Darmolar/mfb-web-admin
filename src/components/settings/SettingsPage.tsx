import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { IdentityProviderSettings } from './IdentityProviderSettings'
import { PushBroadcast } from './PushBroadcast'
import { VasSettings } from './VasSettings'
import { GlSettings } from './GlSettings'
import { ProductCodesSettings } from './ProductCodesSettings'
import { FeeManagement } from './FeeManagement'

const tabs = [
  { id: 'identity', label: 'Identity Providers' },
  { id: 'vas', label: 'VAS Config' },
  { id: 'gl', label: 'GL Accounts' },
  { id: 'product-codes', label: 'CBA Product Codes' },
  { id: 'fees', label: 'Fees' },
  { id: 'push', label: 'Push Broadcast' },
]

export function SettingsPage() {
  const [active, setActive] = useState('identity')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'identity' && <IdentityProviderSettings />}
      {active === 'vas' && <VasSettings />}
      {active === 'gl' && <GlSettings />}
      {active === 'product-codes' && <ProductCodesSettings />}
      {active === 'fees' && <FeeManagement />}
      {active === 'push' && <PushBroadcast />}
    </div>
  )
}
