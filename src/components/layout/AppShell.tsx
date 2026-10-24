import { useEffect, useState } from 'react'
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
// Removed ReferencePage import
import { CardsPage } from '../cards/CardsPage'
import { CardFusionPage } from '../cardfusion/CardFusionPage'
import { ActivityLogsPage } from '../activity/ActivityLogsPage'
import { GovernancePage } from '../governance/GovernancePage'
import { AdminsPage } from '../admins/AdminsPage'
import { ComplaintsPage } from '../complaints/ComplaintsPage';
import { SettingsPage } from '../settings/SettingsPage'

import { Routes, Route } from 'react-router-dom'
import { LoanApplicationDetailsPage } from '../loans/LoanApplicationDetailsPage'
import { IdentityVerificationPage } from '../identity/IdentityVerificationPage'
import { IdentityRecordDetails } from '../identity/IdentityRecordDetails'

const sectionComponents: Record<SectionId, React.ReactNode> = {
  overview: <OverviewPage />,
  kyc: <KYCPage />,
  identity: (
    <Routes>
      <Route index element={<IdentityVerificationPage />} />
      <Route path=":id" element={<IdentityRecordDetails />} />
    </Routes>
  ),
  customers: <CustomersPage />,
  corporate: <CorporatePage />,
  oversight: <OversightPage />,
  compliance: <CompliancePage />,
  loans: (
    <Routes>
      <Route index element={<LoansPage />} />
      <Route path="application/:id" element={<LoanApplicationDetailsPage />} />
    </Routes>
  ),
  savings: <SavingsPage />,
  cards: <CardsPage />,
  cardfusion: <CardFusionPage />,
  queue: <QueuePage />,
  // reference: <ReferencePage />,
  activity: <ActivityLogsPage />,
  governance: <GovernancePage />,
  admins: <AdminsPage />,
  settings: <SettingsPage />,
  complaints: <ComplaintsPage />,
}

export function AppShell() {
  const { section = 'overview' } = useParams<{ section: string }>()
  const [navOpen, setNavOpen] = useState(false)
  // Close the mobile menu after navigating.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setNavOpen(false), [section])

  if (!SECTION_IDS.includes(section as SectionId)) {
    return <Navigate to="/overview" replace />
  }

  const activeSection = section as SectionId

  return (
    <div className="min-h-screen bg-[#fdf4f4]">
      <Sidebar active={activeSection} open={navOpen} onClose={() => setNavOpen(false)} />
      <TopBar activeSection={activeSection} onMenu={() => setNavOpen(true)} />
      <main className="lg:ml-60 pt-14 min-h-screen">
        <div className="p-4 sm:p-6">
          {sectionComponents[activeSection]}
        </div>
      </main>
    </div>
  )
}
