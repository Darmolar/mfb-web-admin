// ──────────────────────────────────────────────
// Generic response wrappers
// ──────────────────────────────────────────────

export type ApiResponse<T> = {
  success: boolean
  message?: string
  data: T
  timestamp: string
}

export type PaginatedData<T> = {
  content: T[]
  totalElements: number
  totalPages?: number
  number?: number
  size?: number
}

export class ApiError extends Error {
  status: number
  errorCode?: string

  constructor(message: string, status: number, errorCode?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errorCode = errorCode
  }
}

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────

export type AdminLoginRequest = {
  email: string
  password: string
}

export type AdminLoginData = {
  preAuthToken: string
  mfaRequired: boolean
  adminName: string
  role: string
}

export type AdminMfaRequest = {
  preAuthToken: string
  otp: string
}

export type AdminSession = {
  accessToken: string
  tokenType: string
  adminId: string
  adminName: string
  role: string
  email: string
}

// ──────────────────────────────────────────────
// Admin Users
// ──────────────────────────────────────────────

export type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: string
  mfaEnabled: boolean
  createdAt: string
}

export type CreateAdminUserRequest = {
  name: string
  email: string
  password: string
  role: string
  department: string
}

export type AdminUserListParams = {
  status?: string
  page?: number
  size?: number
}

export type UpdateAdminUserRequest = {
  name: string
  role: string
  department: string
  adminId: string
}

export type UpdateAdminUserStatusRequest = {
  status: string
  adminId: string
}

// ──────────────────────────────────────────────
// KYC
// ──────────────────────────────────────────────

export type KycPendingItem = {
  id: string
  customerName: string
  currentTier: number
  requestedTier: number
  riskLevel: string
  status: string
}

export type KycStats = {
  pending: number
  approved: number
  rejected: number
  highRisk: number
}

export type KycActionRequest = {
  adminId: string
  notes: string
}

export type KycReviewResult = {
  id: string
  status: string
  reviewNotes: string
  reviewedAt: string
}

// ──────────────────────────────────────────────
// Customers (Retail)
// ──────────────────────────────────────────────

export type CustomerListParams = {
  status?: string
  page?: number
  size?: number
}

export type CustomerListItem = {
  id: string
  username: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  accountNumber: string
  bvn: string
  residentialAddress: string
  status: string
  transactionLimitOverride: number | null
  createdAt: string
}

export type CustomerDetail = CustomerListItem

export type CustomerStatusUpdate = {
  status: string
  adminId: string
}

// ──────────────────────────────────────────────
// Corporates
// ──────────────────────────────────────────────

export type CorporateListItem = {
  id: string
  companyName: string
  rcNumber: string
  tin: string
  sector: string
  status: string
  primaryAccountNumber: string | null
  createdAt: string
}

export type CorporateDetail = {
  id: string
  companyName: string
  rcNumber: string
  tin: string
  sector: string
  address: string
  incorporationDate: string
  primaryAccountNumber: string
  singleTransferLimit: number
  dailyTransferLimit: number
  status: string
  createdAt: string
}

export type CreateCorporateRequest = {
  companyName: string
  rcNumber: string
  tin: string
  sector: string
  sectorCode: string
  address: string
  stateCode: string
  townCode: string
  phone: string
  email: string
  incorporationDate: string
  bvn: string
  acctOfficer: string
  adminId: string
}

export type CreateCorporateResponse = {
  id: string
  companyName: string
  rcNumber: string
  tin: string
  sector: string
  address: string
  phone: string
  email: string
  incorporationDate: string
  coreCustomerId: string
  primaryAccountNumber: string
  singleTransferLimit: number
  dailyTransferLimit: number
  status: string
  createdAt: string
  updatedAt: string
}

export type UpdateCorporateRequest = {
  companyName: string
  tin: string
  sector: string
  address: string
  phone: string
  email: string
  adminId: string
}

export type UpdateCorporateResponse = {
  id: string
  companyName: string
  rcNumber: string
  tin: string
  sector: string
  address: string
  phone: string
  email: string
  status: string
  updatedAt: string
}

export type CorporateStatusUpdate = {
  status: string
  adminId: string
}

export type CorporateLimitsUpdate = {
  singleTransferLimit: number
  dailyTransferLimit: number
  adminId: string
}

export type CorporateLimitsResponse = {
  id: string
  companyName: string
  singleTransferLimit: number
  dailyTransferLimit: number
  updatedAt: string
}

// ──────────────────────────────────────────────
// Corporate Users
// ──────────────────────────────────────────────

export type CorporateUser = {
  id: string
  name: string
  email: string
  role: string
  status: string
  mfaEnabled: boolean
  lastLoginAt: string
  createdAt: string
}

export type AddCorporateUserRequest = {
  name: string
  email: string
  password: string
  role: string
  adminId: string
}

export type AddCorporateUserResponse = {
  id: string
  name: string
  email: string
  role: string
  status: string
  mfaEnabled: boolean
  createdAt: string
}

export type ChangeUserRoleRequest = {
  role: string
  adminId: string
}

export type ChangeUserRoleResponse = {
  id: string
  name: string
  email: string
  role: string
  status: string
  updatedAt: string
}

export type UpdateUserStatusRequest = {
  status: string
  adminId: string
}

export type UpdateUserStatusResponse = {
  id: string
  name: string
  status: string
  updatedAt: string
}

// ──────────────────────────────────────────────
// Transactions
// ──────────────────────────────────────────────

export type TransactionListParams = {
  customerId?: string
  page?: number
  size?: number
}

export type CorporateTransferParams = {
  status?: string
  page?: number
  size?: number
}

export type BulkBatchItem = {
  id: string
  reference: string
  description: string
  totalAmount: number
  transferCount: number
  status: string
  createdAt: string
}

export type BulkBatchParams = {
  page?: number
  size?: number
}

// ──────────────────────────────────────────────
// Compliance
// ──────────────────────────────────────────────

export type ComplianceStats = {
  open: number
  underReview: number
  resolved: number
}

export type ComplianceFlag = {
  id: string
  targetType: string
  targetId: string
  reason: string
  severity: string
  status: string
  raisedBy: string
  createdAt: string
}

export type ComplianceFlagListParams = {
  status?: string
  page?: number
  size?: number
}

export type RaiseComplianceFlagRequest = {
  targetType: string
  targetId: string
  reason: string
  details: string
  severity: string
  raisedBy: string
}

export type RaiseComplianceFlagResponse = {
  id: string
  targetType: string
  targetId: string
  severity: string
  status: string
  createdAt: string
}

export type ResolveComplianceFlagRequest = {
  resolvedBy: string
  notes: string
}

export type ResolveComplianceFlagResponse = {
  id: string
  status: string
  resolutionNotes: string
  resolvedAt: string
}

// ──────────────────────────────────────────────
// Queue Management
// ──────────────────────────────────────────────

export type QueueInfo = {
  messagesReady: number
  consumers: number
}

export type QueueStats = {
  queues: Record<string, QueueInfo>
  failedJobSummary: Record<string, number>
}

export type FailedJob = {
  id: string
  queueName: string
  jobType: string
  payload: string
  errorMessage: string
  attempts: number
  status: string
  notificationSent: boolean
  failedAt: string
}

export type FailedJobListParams = {
  page?: number
  size?: number
}

export type JobActionRequest = {
  resolvedBy: string
}

export type JobActionResponse = {
  id: string
  status: string
  resolvedBy: string
}

// ──────────────────────────────────────────────
// Transactions (typed)
// ──────────────────────────────────────────────

export type TransactionItem = {
  id: string
  reference: string
  type: string
  amount: number
  currency: string
  channel: string
  status: string
  customerId?: string
  corporateId?: string
  beneficiary?: string
  beneficiaryAccount?: string
  fee?: number
  description?: string
  failureReason?: string
  flagged?: boolean
  createdAt: string
}

export type CorporateTransferItem = {
  id: string
  reference: string
  amount: number
  currency: string
  status: string
  beneficiaryName?: string
  beneficiaryAccount?: string
  channel?: string
  description?: string
  createdAt: string
}

// ──────────────────────────────────────────────
// Customer Devices & Login History
// ──────────────────────────────────────────────

export type CustomerDevice = {
  id: string
  deviceName: string
  deviceType: string
  os?: string
  lastUsed: string
  trusted: boolean
  ipAddress?: string
}

export type LoginHistoryEntry = {
  id: string
  timestamp: string
  ipAddress: string
  geolocation: string
  userAgent: string
  status: string
  mfaMethod: string
}

// ──────────────────────────────────────────────
// Audit Logs
// ──────────────────────────────────────────────

export type AuditLogEntry = {
  id: string
  actor: string
  actorRole: string
  action: string
  context: string
  resourceId: string
  payload?: string
  ipAddress?: string
  timestamp: string
  severity: string
}

export type AuditLogListParams = {
  page?: number
  size?: number
  severity?: string
}

// ──────────────────────────────────────────────
// Customer Limits / Overrides
// ──────────────────────────────────────────────

export type CustomerLimits = {
  customerId: string
  balanceCap?: number
  dailyTransferLimit?: number
  singleTransactionLimit?: number
  transactionLimitOverride?: number
}

export type CustomerLimitsUpdate = {
  dailyTransferLimit?: number
  singleTransactionLimit?: number
  transactionLimitOverride?: number
  adminId: string
}

export type LimitOverrideItem = {
  id: string
  customerId: string
  customerName: string
  type: string
  limit: number
  status: string
  setBy: string
  expiresAt?: string
  createdAt: string
}
