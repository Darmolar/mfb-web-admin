import { useParams, Navigate } from 'react-router-dom'
import { Sidebar, type SectionId, SECTION_IDS } from './Sidebar'
import { TopBar } from './TopBar'
import { OverviewPage } from '../overview/OverviewPage'
import { KYCPage } from '../kyc/KYCPage'
import { CustomersPage } from '../customers/CustomersPage'
import { CorporatePage } from '../corporate/CorporatePage'
import { OversightPage } from '../oversight/OversightPage'
import { CompliancePage } from '../compliance/CompliancePage'
import { LoansPage } from '../loans/LoansPage'
import { SavingsPage } from '../savings/SavingsPage'
import { QueuePage } from '../queue/QueuePage'
import { ReferencePage } from '../reference/ReferencePage'
import { ActivityLogsPage } from '../activity/ActivityLogsPage'
import { GovernancePage } from '../governance/GovernancePage'
import { AdminsPage } from '../admins/AdminsPage'
import { SettingsPage } from '../settings/SettingsPage'

const sectionComponents: Record<SectionId, React.ReactNode> = {
  overview: <OverviewPage />,
  kyc: <KYCPage />,
  customers: <CustomersPage />,
  corporate: <CorporatePage />,
  oversight: <OversightPage />,
  compliance: <CompliancePage />,
  loans: <LoansPage />,
  savings: <SavingsPage />,
  queue: <QueuePage />,
  reference: <ReferencePage />,
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
