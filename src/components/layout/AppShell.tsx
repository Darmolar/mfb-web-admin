import { useParams, Navigate } from 'react-router-dom'
import { Sidebar, type SectionId, SECTION_IDS } from './Sidebar'
import { TopBar } from './TopBar'
import { OverviewPage } from '../overview/OverviewPage'
import { KYCPage } from '../kyc/KYCPage'
import { RetailPage } from '../retail/RetailPage'
import { CorporatePage } from '../corporate/CorporatePage'
import { OversightPage } from '../oversight/OversightPage'
import { ActivityLogsPage } from '../activity/ActivityLogsPage'
import { GovernancePage } from '../governance/GovernancePage'
import { AdminsPage } from '../admins/AdminsPage'
import { SettingsPage } from '../settings/SettingsPage'

const sectionComponents: Record<SectionId, React.ReactNode> = {
  overview: <OverviewPage />,
  kyc: <KYCPage />,
  retail: <RetailPage />,
  corporate: <CorporatePage />,
  oversight: <OversightPage />,
  activity: <ActivityLogsPage />,
  governance: <GovernancePage />,
  admins: <AdminsPage />,
  settings: <SettingsPage />,
}

export function AppShell() {
  const { section = 'overview' } = useParams<{ section: string }>()

  if (!SECTION_IDS.includes(section as SectionId)) {
    return <Navigate to="/overview" replace />
  }

  const activeSection = section as SectionId

  return (
    <div className="min-h-screen bg-[#fdf4f4]">
      <Sidebar active={activeSection} />
      <TopBar activeSection={activeSection} />
      <main className="ml-60 pt-14 min-h-screen">
        <div className="p-6">
          {sectionComponents[activeSection]}
        </div>
      </main>
    </div>
  )
}
