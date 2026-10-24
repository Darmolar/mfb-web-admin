import { useSearchParams } from 'react-router-dom'
import { TabBar } from '../ui/TabBar'
import { CardFusionStaff } from './CardFusionStaff'
import { CardFusionDevices } from './CardFusionDevices'
import { CardFusionActivity } from './CardFusionActivity'

const tabs = [
  { id: 'staff', label: 'Staff Users' },
  { id: 'devices', label: 'Devices' },
  { id: 'activity', label: 'Activity Log' },
]

export function CardFusionPage() {
  // The tab lives in the URL so links and the back button keep the user's place.
  const [params, setParams] = useSearchParams()
  const active = tabs.some(t => t.id === params.get('tab')) ? params.get('tab')! : 'staff'
  return (
    <div className="space-y-6">
      <TabBar tabs={tabs} active={active} onChange={id => setParams(id === 'staff' ? {} : { tab: id }, { replace: true })} />
      {active === 'staff' && <CardFusionStaff />}
      {active === 'devices' && <CardFusionDevices />}
      {active === 'activity' && <CardFusionActivity />}
    </div>
  )
}
