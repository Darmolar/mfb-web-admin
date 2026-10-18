import { useState } from 'react'
import { Fingerprint } from 'lucide-react'
import { TabBar } from '../ui/TabBar'
import { CardFusionStaff } from './CardFusionStaff'
import { CardFusionDevices } from './CardFusionDevices'
import { CardFusionActivity } from './CardFusionActivity'

export function CardFusionPage() {
  const [activeTab, setActiveTab] = useState('staff')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center">
          <Fingerprint size={20} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">CardFusion</h2>
          <p className="text-sm text-slate-500">Manage branch card-issuance staff, paired devices and their activity.</p>
        </div>
      </div>

      <TabBar
        tabs={[
          { id: 'staff', label: 'Staff Users' },
          { id: 'devices', label: 'Devices' },
          { id: 'activity', label: 'Activity Log' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'staff' && <CardFusionStaff />}
      {activeTab === 'devices' && <CardFusionDevices />}
      {activeTab === 'activity' && <CardFusionActivity />}
    </div>
  )
}
