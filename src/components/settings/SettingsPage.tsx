import { useState } from 'react'
import { BankStampSettings } from './BankStampSettings'
import { TabBar } from '../ui/TabBar'
import { IdentityProviderSettings } from './IdentityProviderSettings'
import { PushBroadcast } from './PushBroadcast'
import { VasSettings } from './VasSettings'
import { GlSettings } from './GlSettings'
import { ProductCodesSettings } from './ProductCodesSettings'
import { SmsSettings } from './SmsSettings'
import { FeeManagement } from './FeeManagement'

const tabs = [
  { id: 'identity', label: 'Identity Providers' },
  { id: 'vas', label: 'VAS Config' },
  { id: 'gl', label: 'Settlement & GL Accounts' },
  { id: 'product-codes', label: 'CBA Product Codes' },
  { id: 'fees', label: 'Fees' },
  { id: 'sms', label: 'SMS Notifications' },
  { id: 'push', label: 'Push Broadcast' },
  { id: 'bank-stamp', label: 'Bank Stamp' },
]

export function SettingsPage() {
  const [active, setActive] = useState('identity')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'identity' && <IdentityProviderSettings />}
      {active === 'vas' && <VasSettings />}
      {active === 'gl' && <div className="space-y-6"><VasSettings section="accounts" /><GlSettings /></div>}
      {active === 'product-codes' && <ProductCodesSettings />}
      {active === 'fees' && <FeeManagement />}
      {active === 'sms' && <SmsSettings />}
      {active === 'push' && <PushBroadcast />}
      {active === 'bank-stamp' && <BankStampSettings />}
    </div>
  )
}
