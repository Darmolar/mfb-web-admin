import { useState } from 'react'
import { TabBar } from '../ui/TabBar'
import { GeneralSettings } from './GeneralSettings'
import { SecuritySettings } from './SecuritySettings'
import { NotificationSettings } from './NotificationSettings'
import { AuditLogSettings } from './AuditLogSettings'

const tabs = [
  { id: 'general', label: 'General' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'logs', label: 'Audit Log' },
]

export function SettingsPage() {
  const [active, setActive] = useState('general')
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={setActive} />
      {active === 'general' && <GeneralSettings />}
      {active === 'security' && <SecuritySettings />}
      {active === 'notifications' && <NotificationSettings />}
      {active === 'logs' && <AuditLogSettings />}
    </div>
  )
}
