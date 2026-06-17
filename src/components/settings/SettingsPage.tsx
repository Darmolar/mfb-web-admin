import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { ProfileSettings } from './ProfileSettings'
import { GeneralSettings } from './GeneralSettings'
import { SecuritySettings } from './SecuritySettings'
import { NotificationSettings } from './NotificationSettings'
import { AuditLogSettings } from './AuditLogSettings'

const tabs = [
  { id: 'profile', label: 'My Profile' },
  { id: 'general', label: 'General' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'logs', label: 'Audit Log' },
]

export function SettingsPage() {
  const [active, setActive] = useState('profile')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'profile' && <ProfileSettings />}
      {active === 'general' && <GeneralSettings />}
      {active === 'security' && <SecuritySettings />}
      {active === 'notifications' && <NotificationSettings />}
      {active === 'logs' && <AuditLogSettings />}
    </div>
  )
}
