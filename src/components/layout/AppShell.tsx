import { useState } from 'react'
import { Sidebar, type SectionId } from './Sidebar'
import { TopBar } from './TopBar'
import { OverviewPage } from '../overview/OverviewPage'
import { KYCPage } from '../kyc/KYCPage'
import { RetailPage } from '../retail/RetailPage'
import { CorporatePage } from '../corporate/CorporatePage'
import { OversightPage } from '../oversight/OversightPage'
import { ActivityLogsPage } from '../activity/ActivityLogsPage'
import { GovernancePage } from '../governance/GovernancePage'
import { SettingsPage } from '../settings/SettingsPage'

const sectionComponents: Record<SectionId, React.ReactNode> = {
  overview: <OverviewPage />,
  kyc: <KYCPage />,
  retail: <RetailPage />,
  corporate: <CorporatePage />,
  oversight: <OversightPage />,
  activity: <ActivityLogsPage />,
  governance: <GovernancePage />,
  settings: <SettingsPage />,
}

export function AppShell() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')

  return (
    <div className="min-h-screen bg-[#fdf4f4]">
      <Sidebar active={activeSection} onChange={setActiveSection} />
      <TopBar activeSection={activeSection} />
      <main className="ml-60 pt-14 min-h-screen">
        <div className="p-6">
          {sectionComponents[activeSection]}
        </div>
      </main>
    </div>
  )
}
