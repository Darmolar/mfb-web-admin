export type KYCTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Unverified'
export type VerificationStatus = 'Verified' | 'Pending' | 'Unverified' | 'Flagged' | 'Locked'
export type TransactionStatus = 'Completed' | 'Pending' | 'Failed' | 'Reversed'
export type RiskLevel = 'Low' | 'Medium' | 'High'
export type EntityStatus = 'Active' | 'Suspended' | 'Pending' | 'Flagged'
export type CustomerType = 'Individual' | 'SME' | 'Corporate'

export interface RetailCustomer {
  id: string
  name: string
  email: string
  phone: string
  accountNo: string
  kycTier: KYCTier
  status: VerificationStatus
  balance: number
  lastActive: string
  riskLevel: RiskLevel
  memberSince: string
  dateOfBirth: string
  country: string
  address: string
  gender: string
  bvn: string
  nin: string
  type: CustomerType
}

export interface CorporateEntity {
  id: string
  name: string
  rcNumber: string
  taxId: string
  hqAddress: string
  status: EntityStatus
  onboardedDate: string
  authorizedPersonnel: number
  activeUsers: number
  accounts: number
  complianceClearances: string[]
  cacDocStatus: 'Verified' | 'Pending' | 'Missing'
  industry: string
  defaultCurrency: string
}

export interface Transaction {
  id: string
  referenceId: string
  type: 'Transfer' | 'Deposit' | 'Withdrawal' | 'Loan' | 'Reversal'
  amount: number
  currency: string
  channel: 'Web' | 'Mobile' | 'USSD' | 'POS' | 'API'
  date: string
  status: TransactionStatus
  beneficiary: string
  beneficiaryAccount: string
  fee: number
  description: string
  failureReason?: string
  flagged?: boolean
  customerId?: string
  corporateId?: string
}

export interface AuditLog {
  id: string
  actor: string
  actorRole: string
  action: string
  context: string
  resourceId: string
  payload: string
  timestamp: string
  ipAddress: string
  severity: 'Info' | 'Warning' | 'Critical'
}

export interface KYCApplication {
  id: string
  customerId: string
  customerName: string
  phone: string
  requestType: 'Tier 1 Upgrade' | 'Tier 2 Upgrade' | 'Tier 3 Upgrade' | 'Re-verification'
  documents: KYCDocument[]
  riskLevel: RiskLevel
  submittedAt: string
  status: 'Pending' | 'Approved' | 'Rejected'
  bvnMatch: boolean
  faceMatch: boolean
  utilityBillValid: boolean
}

export interface KYCDocument {
  name: string
  status: 'Verified' | 'Pending' | 'Rejected' | 'Missing'
  uploadedAt?: string
}

export interface LimitOverride {
  id: string
  customerId: string
  customerName: string
  type: 'Balance Cap' | 'Daily Transfer' | 'Single Transaction' | 'Daily Web/POS'
  limit: number
  status: 'Active' | 'Expired' | 'Pending'
  setBy: string
  expiresAt?: string
}

export interface LoginHistory {
  id: string
  timestamp: string
  ipAddress: string
  geolocation: string
  userAgent: string
  status: 'Success' | 'Failed' | 'Suspicious'
  mfaMethod: string
}

export interface NavSection {
  id: string
  label: string
  icon: string
}
