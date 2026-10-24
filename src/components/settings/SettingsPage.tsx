import { useSearchParams } from 'react-router-dom'
import { BankStampSettings } from './BankStampSettings'
import { TabBar } from '../ui/TabBar'
import { IdentityProviderSettings } from './IdentityProviderSettings'
import { PushBroadcast } from './PushBroadcast'
import { VasSettings } from './VasSettings'
import { GlSettings } from './GlSettings'
import { ProductCodesSettings } from './ProductCodesSettings'
import { SystemConfigSettings } from './SystemConfigSettings'
import { NotificationSettings } from './NotificationSettings'
import { FeeManagement } from './FeeManagement'

const tabs = [
  { id: 'identity', label: 'Identity Providers' },
  { id: 'system', label: 'System Configuration' },
  { id: 'vas', label: 'VAS Config' },
  { id: 'gl', label: 'Settlement & GL Accounts' },
  { id: 'product-codes', label: 'CBA Product Codes' },
  { id: 'fees', label: 'Fees' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'push', label: 'Push Broadcast' },
  { id: 'bank-stamp', label: 'Bank Stamp' },
]

export function SettingsPage() {
  // The tab lives in the URL so links (e.g. from the Overview) open the right tab.
  const [params, setParams] = useSearchParams()
  const active = tabs.some(t => t.id === params.get('tab')) ? params.get('tab')! : 'identity'
  const setActive = (id: string) => setParams(id === 'identity' ? {} : { tab: id }, { replace: true })
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'identity' && <IdentityProviderSettings />}
      {active === 'system' && <SystemConfigSettings />}
      {active === 'vas' && <VasSettings />}
      {active === 'gl' && <div className="space-y-6"><VasSettings section="accounts" /><GlSettings /></div>}
      {active === 'product-codes' && <ProductCodesSettings />}
      {active === 'fees' && <FeeManagement />}
      {active === 'notifications' && <NotificationSettings />}
      {active === 'push' && <PushBroadcast />}
      {active === 'bank-stamp' && <BankStampSettings />}
    </div>
  )
}
