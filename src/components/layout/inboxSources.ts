// What counts as "waiting for action", shared by the header bell and the Overview page.
import {
  getCardRequests, getComplaints, getComplianceStats, getIdentityImageRequests, getKycStats, getLoanApplications,
} from '../../api'
import { allPages } from '../../api/pagination'
import { cardRequestActions, readCardRequests } from '../../api/cards'
import { loanActions, readLoanApps } from '../../api/loans'
import { readImageRequests } from '../../api/approvals'
import type { InboxSource } from '../../api/inbox'

export const INBOX_SOURCES: InboxSource[] = [
  {
    key: 'kyc', label: 'Tier upgrades to review', hint: 'KYC requests waiting for a decision', to: '/kyc?tab=review',
    load: async () => (await getKycStats()).data.pending,
  },
  {
    key: 'identity', label: 'Photo changes to approve', hint: 'Identity image updates awaiting a second admin', to: '/governance?tab=approvals',
    load: async () => readImageRequests((await getIdentityImageRequests({ status: 'PENDING' })).data).total,
  },
  {
    key: 'loans', label: 'Loan applications', hint: 'Waiting for approve or decline', to: '/loans?tab=applications',
    load: async () => readLoanApps((await getLoanApplications({ size: 100 })).data).filter(a => loanActions(a.status).canDecide).length,
  },
  {
    key: 'cards', label: 'Card requests', hint: 'Waiting for approve or reject', to: '/cards?tab=requests',
    load: async () => readCardRequests(await allPages(page => getCardRequests({ page, size: 100 }))).requests
      .filter(r => cardRequestActions(r.status).canDecide).length,
  },
  {
    key: 'complaints', label: 'Open complaints', hint: 'Customer complaints not yet picked up', to: '/complaints',
    load: async () => (await getComplaints({ status: 'OPEN', size: 1 })).data.totalElements,
  },
  {
    key: 'compliance', label: 'Compliance flags', hint: 'Open flags not yet reviewed', to: '/compliance',
    load: async () => (await getComplianceStats()).data.open,
  },
]
