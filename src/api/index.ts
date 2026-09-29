import { validateProductCodes, type CbaProductCodes } from './productCodes'
import { ADMIN_API_KEY, API_BASE_URL, PUBLIC_API_KEY } from './config'
import type {
  IdentityProvider, IdentityProviderSettings,
  VasSettingsResponse, VasAccountsUpdate, VasChargesUpdate, VasCashbackUpdate, GlAccounts,
  CustomerPushRequest, CustomerPushResponse, PushBroadcastRequest,
  Role,
  Permission,
  SavingsProduct,
  SavingsProductPayload,
  SavingsGoal,
  LoanProduct,
  LoanProductPayload,
  LoanApplication,
  ReferenceCountry,
  ReferenceState,
  ReferenceTown,
  ReferenceSector
} from './types'
import {
  ApiError,
  type AdminLoginData,
  type AdminLoginRequest,
  type AdminMfaRequest,
  type AdminSession,
  type AdminUser,
  type AdminUserListParams,
  type AddCorporateUserRequest,
  type AddCorporateUserResponse,
  type ApiResponse,
  type BulkBatchItem,
  type BulkBatchParams,
  type ChangeUserRoleRequest,
  type ChangeUserRoleResponse,
  type ComplianceFlag,
  type ComplianceFlagListParams,
  type ComplianceStats,
  type CorporateDetail,
  type CorporateLimitsResponse,
  type CorporateLimitsUpdate,
  type CorporateListItem,
  type CorporateStatusUpdate,
  type CorporateTransferParams,
  type CorporateUser,
  type CreateAdminUserRequest,
  type CreateCorporateRequest,
  type CreateCorporateResponse,
  type CustomerDetail,
  type CustomerAccount,
  type AddCustomerAccountRequest,
  type CustomerListItem,
  type CustomerListParams,
  type CustomerStatusUpdate,
  type AuditLogEntry,
  type AuditLogListParams,
  type CorporateTransferItem,
  type CustomerDevice,
  type CustomerLimits,
  type CustomerLimitsUpdate,
  type FailedJob,
  type FailedJobListParams,
  type JobActionRequest,
  type JobActionResponse,
  type KycActionRequest,
  type LimitOverrideItem,
  type LoginHistoryEntry,
  type TransactionItem,
  type KycPendingItem,
  type KycReviewResult,
  type KycStats,
  type PaginatedData,
  type QueueStats,
  type RaiseComplianceFlagRequest,
  type RaiseComplianceFlagResponse,
  type ResolveComplianceFlagRequest,
  type ResolveComplianceFlagResponse,
  type TransactionListParams,
  type UpdateAdminUserRequest,
  type UpdateAdminUserStatusRequest,
  type UpdateCorporateRequest,
  type UpdateCorporateResponse,
  type UpdateUserStatusRequest,
  type UpdateUserStatusResponse,
  type Promotion,
  type PromotionPayload,
  type Broadcast,
  type BroadcastDetail,
  type CreateBroadcastRequest,
  type ApiLog,
  type CardProduct,
  type CardProductPayload,
  type CardProductRequirement,
  type CardRequest,
  type CardRequestDetails,
  type DashboardSummary,
  type SyncTierRequest,
  type UnlockAccountRequest,
  type OtpResendRequest,
  type OtpDispatchRequest,
  type ResetSecurityRequest,
  type IdentityOverrideRequest,
  type CorporateAccountLink,
  type IdentityDocument,
  type ReviewIdentityDocumentRequest,
  type LinkSignatoryRequest,
  type CardDispatchRequest,
  type FeeSummary,
  type FeeCharge,
  type FeeBatch,
  type FeeSettings,
  type FeeSettingsUpdate,
  type FeeStatus,
} from './types'

export * from './config'
export * from './types'

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const AUTH_KEY = 'mfb_auth'

function getStoredToken(): string | null {
  try {
    const stored = localStorage.getItem(AUTH_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return parsed?.accessToken ?? null
  } catch {
    return null
  }
}

function buildApiUrl(path: string) {
  const base = API_BASE_URL.replace(/\/+$/, '')
  const normalizedPath = path.replace(/^\/+/, '')
  const versionlessPath = base.endsWith('/v1') && normalizedPath.startsWith('v1/')
    ? normalizedPath.slice(3)
    : normalizedPath

  return `${base}/${versionlessPath}`
}

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined)
  if (entries.length === 0) return ''
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')
}

async function request<T>(path: string, init: RequestInit = {}, allowHttpSuccess = false): Promise<ApiResponse<T>> {
  const isAuthRequest = path.startsWith('/v1/bank-admin/auth/')
  const token = isAuthRequest ? null : getStoredToken()

  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      ...(['POST', 'PUT', 'PATCH'].includes(init.method ?? '') ? { 'Content-Type': 'application/json' } : {}),
      'X-API-Key': PUBLIC_API_KEY,
      ...(ADMIN_API_KEY ? { 'X-Admin-Key': ADMIN_API_KEY } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  const body = await res.json().catch(() => null)
  // A failed sign-in or server key is not evidence that the current session expired.
  // Ignore late failures belonging to a previous login.
  if (res.status === 401 && !isAuthRequest && token && token === getStoredToken()
      && !/admin key/i.test(body?.message || '')) {
    localStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem('mfb_admin_pre_auth')
    window.dispatchEvent(new Event('mfb-admin-session-expired'))
    throw new ApiError(body?.message || 'Session expired. Please sign in again.', 401, body?.errorCode)
  }

  if (!res.ok || body?.success === false || (!allowHttpSuccess && !body?.success) || (allowHttpSuccess && body == null && res.status !== 204)) {
    throw new ApiError(body?.message ?? 'Request failed', res.status, body?.errorCode)
  }

  return (allowHttpSuccess ? { success: true, data: body, message: body?.message } : body) as ApiResponse<T>
}

// ──────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────

export function login(payload: AdminLoginRequest) {
  return request<AdminLoginData>('/v1/bank-admin/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function verifyAdminMfa(payload: AdminMfaRequest) {
  return request<AdminSession>('/v1/bank-admin/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getAdminUsers(params: AdminUserListParams = {}) {
  const qs = buildQueryString({ status: params.status, page: params.page ?? 0, size: params.size ?? 50 })
  return request<PaginatedData<AdminUser>>(`/v1/bank-admin/users${qs}`)
}

export function createAdminUser(payload: CreateAdminUserRequest) {
  return request<AdminUser>('/v1/bank-admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminUser(userId: string, payload: UpdateAdminUserRequest) {
  return request<AdminUser>(`/v1/bank-admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateAdminUserStatus(userId: string, payload: UpdateAdminUserStatusRequest) {
  return request<{ id: string; status: string }>(`/v1/bank-admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteAdminUser(userId: string) {
  return request<null>(`/v1/bank-admin/users/${userId}`, { method: 'DELETE' })
}

// ──────────────────────────────────────────────
// KYC
// ──────────────────────────────────────────────

export function getKycPending(risk?: string) {
  const qs = risk ? buildQueryString({ risk }) : ''
  return request<PaginatedData<KycPendingItem>>(`/v1/bank-admin/kyc/pending${qs}`)
}

export function getKycStats() {
  return request<KycStats>('/v1/bank-admin/kyc/stats')
}

export function approveKyc(kycRequestId: string, payload: KycActionRequest) {
  return request<KycReviewResult>(`/v1/bank-admin/kyc/${kycRequestId}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function rejectKyc(kycRequestId: string, payload: KycActionRequest) {
  return request<KycReviewResult>(`/v1/bank-admin/kyc/${kycRequestId}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ──────────────────────────────────────────────
// Customers (Retail)
// ──────────────────────────────────────────────

export function getCustomers(params: CustomerListParams = {}) {
  const qs = buildQueryString({
    status: params.status,
    page: params.page ?? 0,
    size: params.size ?? 20,
  })
  return request<PaginatedData<CustomerListItem>>(`/v1/bank-admin/customers${qs}`)
}

export function getCustomerDetail(customerId: string) {
  return request<CustomerDetail>(`/v1/bank-admin/customers/${customerId}`)
}

export function addCustomerAccount(customerId: string, payload: AddCustomerAccountRequest) {
  return request<CustomerAccount>(`/v1/bank-admin/customers/${customerId}/accounts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCustomerStatus(customerId: string, payload: CustomerStatusUpdate) {
  return request<{ id: string; status: string }>(`/v1/bank-admin/customers/${customerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function revokeDevice(customerId: string, deviceId: string) {
  return request<null>(`/v1/bank-admin/customers/${customerId}/devices/${deviceId}`, {
    method: 'DELETE',
  })
}

// ──────────────────────────────────────────────
// Corporates
// ──────────────────────────────────────────────

export function getCorporates(params: { page?: number; size?: number } = {}) {
  const qs = buildQueryString({ page: params.page ?? 0, size: params.size ?? 20 })
  return request<PaginatedData<CorporateListItem>>(`/v1/bank-admin/corporates${qs}`)
}

export function createCorporate(payload: CreateCorporateRequest) {
  return request<CreateCorporateResponse>('/v1/bank-admin/corporates', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCorporateDetail(corporateId: string) {
  return request<CorporateDetail>(`/v1/bank-admin/corporates/${corporateId}`)
}

export function updateCorporate(corporateId: string, payload: UpdateCorporateRequest) {
  return request<UpdateCorporateResponse>(`/v1/bank-admin/corporates/${corporateId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function updateCorporateStatus(corporateId: string, payload: CorporateStatusUpdate) {
  return request<{ id: string; status: string }>(`/v1/bank-admin/corporates/${corporateId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateCorporateLimits(corporateId: string, payload: CorporateLimitsUpdate) {
  return request<CorporateLimitsResponse>(`/v1/bank-admin/corporates/${corporateId}/limits`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

// ──────────────────────────────────────────────
// Corporate Users
// ──────────────────────────────────────────────

export function getCorporateUsers(corporateId: string) {
  return request<CorporateUser[]>(`/v1/bank-admin/corporates/${corporateId}/users`)
}

export function addCorporateUser(corporateId: string, payload: AddCorporateUserRequest) {
  return request<AddCorporateUserResponse>(`/v1/bank-admin/corporates/${corporateId}/users`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function changeCorporateUserRole(corporateId: string, userId: string, payload: ChangeUserRoleRequest) {
  return request<ChangeUserRoleResponse>(`/v1/bank-admin/corporates/${corporateId}/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function updateCorporateUserStatus(corporateId: string, userId: string, payload: UpdateUserStatusRequest) {
  return request<UpdateUserStatusResponse>(`/v1/bank-admin/corporates/${corporateId}/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

// ──────────────────────────────────────────────
// Transactions
// ──────────────────────────────────────────────

export function getTransactions(params: TransactionListParams = {}) {
  const qs = buildQueryString({
    customerId: params.customerId,
    page: params.page ?? 0,
    size: params.size ?? 50,
  })
  return request<PaginatedData<TransactionItem>>(`/v1/bank-admin/transactions${qs}`)
}

export function getCorporateTransfers(corporateId: string, params: CorporateTransferParams = {}) {
  const qs = buildQueryString({
    status: params.status,
    page: params.page ?? 0,
    size: params.size ?? 20,
  })
  return request<PaginatedData<CorporateTransferItem>>(`/v1/bank-admin/corporates/${corporateId}/transfers${qs}`)
}

export function getCorporateBulkBatches(corporateId: string, params: BulkBatchParams = {}) {
  const qs = buildQueryString({ page: params.page ?? 0, size: params.size ?? 20 })
  return request<PaginatedData<BulkBatchItem>>(`/v1/bank-admin/corporates/${corporateId}/bulk-batches${qs}`)
}

// ──────────────────────────────────────────────
// Compliance
// ──────────────────────────────────────────────

export function getComplianceStats() {
  return request<ComplianceStats>('/v1/bank-admin/compliance/stats')
}

export function getComplianceFlags(params: ComplianceFlagListParams = {}) {
  const qs = buildQueryString({
    status: params.status,
    page: params.page ?? 0,
    size: params.size ?? 20,
  })
  return request<PaginatedData<ComplianceFlag>>(`/v1/bank-admin/compliance/flags${qs}`)
}

export function raiseComplianceFlag(payload: RaiseComplianceFlagRequest) {
  return request<RaiseComplianceFlagResponse>('/v1/bank-admin/compliance/flags', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function resolveComplianceFlag(flagId: string, payload: ResolveComplianceFlagRequest) {
  return request<ResolveComplianceFlagResponse>(`/v1/bank-admin/compliance/flags/${flagId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ──────────────────────────────────────────────
// Queue Management
// ──────────────────────────────────────────────

export function getQueueStats() {
  return request<QueueStats>('/v1/admin/queue/stats')
}

export function getFailedJobs(params: FailedJobListParams = {}) {
  const qs = buildQueryString({ status: params.status, page: params.page ?? 0, size: params.size ?? 20 })
  return request<PaginatedData<FailedJob>>(`/v1/admin/queue/failed${qs}`)
}

export function getFailedJobDetail(jobId: string) {
  return request<FailedJob>(`/v1/admin/queue/failed/${jobId}`)
}

export function retryFailedJob(jobId: string, payload: JobActionRequest) {
  return request<JobActionResponse>(`/v1/admin/queue/failed/${jobId}/retry`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function resolveFailedJob(jobId: string, payload: JobActionRequest) {
  return request<JobActionResponse>(`/v1/admin/queue/failed/${jobId}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ──────────────────────────────────────────────
// Customer Devices & Login History
// ──────────────────────────────────────────────

export function getCustomerDevices(customerId: string) {
  return request<CustomerDevice[]>(`/v1/bank-admin/customers/${customerId}/devices`)
}

export function getCustomerLoginHistory(customerId: string) {
  return request<PaginatedData<LoginHistoryEntry>>(`/v1/bank-admin/customers/${customerId}/login-history`)
}

// ──────────────────────────────────────────────
// Corporate Login History & Audit Trail
// ──────────────────────────────────────────────

export function getCorporateLoginHistory(corporateId: string) {
  return request<PaginatedData<LoginHistoryEntry>>(`/v1/bank-admin/corporates/${corporateId}/login-history`)
}

export function getCorporateAuditTrail(corporateId: string) {
  return request<PaginatedData<AuditLogEntry>>(`/v1/bank-admin/corporates/${corporateId}/audit-trail`)
}

// ──────────────────────────────────────────────
// System Audit Logs
// ──────────────────────────────────────────────

export function getAuditLogs(params: AuditLogListParams = {}) {
  const qs = buildQueryString({ severity: params.severity, page: params.page ?? 0, size: params.size ?? 50 })
  return request<PaginatedData<AuditLogEntry>>(`/v1/bank-admin/audit-logs${qs}`)
}

// ──────────────────────────────────────────────
// Customer Limits
// ──────────────────────────────────────────────

export function getCustomerLimits(customerId: string) {
  return request<CustomerLimits>(`/v1/bank-admin/customers/${customerId}/limits`)
}

export function updateCustomerLimits(customerId: string, payload: CustomerLimitsUpdate) {
  return request<CustomerLimits>(`/v1/bank-admin/customers/${customerId}/limits`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function getLimitOverrides(params: { page?: number; size?: number } = {}) {
  const qs = buildQueryString({ page: params.page ?? 0, size: params.size ?? 50 })
  return request<PaginatedData<LimitOverrideItem>>(`/v1/bank-admin/customers/limits/overrides${qs}`)
}

// ──────────────────────────────────────────────
// Roles & Permissions
// ──────────────────────────────────────────────
export function getRoles() {
  return request<PaginatedData<Role>>('/v1/bank-admin/roles')
}
export function getRole(roleId: string) {
  return request<Role>(`/v1/bank-admin/roles/${roleId}`)
}
export function createRole(payload: { name: string; description: string; permissions: string[] }) {
  return request<Role>('/v1/bank-admin/roles', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
export function assignRole(roleId: string, adminId: string) {
  return request<{ success: boolean }>(`/v1/bank-admin/roles/${roleId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ adminId })
  })
}
export function getPermissions() {
  return request<PaginatedData<Permission>>('/v1/bank-admin/roles/permissions')
}

// ──────────────────────────────────────────────
// Savings
// ──────────────────────────────────────────────
export function getSavingsProducts() {
  return request<SavingsProduct[]>('/v1/bank-admin/savings/products')
}
export function createSavingsProduct(payload: SavingsProductPayload) {
  return request<SavingsProduct>('/v1/bank-admin/savings/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
export function updateSavingsProduct(productId: string, payload: SavingsProductPayload) {
  return request<SavingsProduct>(`/v1/bank-admin/savings/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
export function activateSavingsProduct(productId: string, adminId: string) {
  return request<{ success: boolean }>(`/v1/bank-admin/savings/products/${productId}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId }),
  })
}
export function deactivateSavingsProduct(productId: string, adminId: string) {
  return request<{ success: boolean }>(`/v1/bank-admin/savings/products/${productId}/deactivate`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId }),
  })
}
export function getSavingsGoals() {
  return request<PaginatedData<SavingsGoal>>('/v1/bank-admin/savings/goals')
}
export function suspendSavingsGoal(goalId: string, adminId: string) {
  return request<{ success: boolean }>(`/v1/bank-admin/savings/goals/${goalId}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId }),
  })
}
export function reactivateSavingsGoal(goalId: string, adminId: string) {
  return request<{ success: boolean }>(`/v1/bank-admin/savings/goals/${goalId}/reactivate`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId }),
  })
}

// ──────────────────────────────────────────────
// Loans
// ──────────────────────────────────────────────
export function getLoanProducts() {
  return request<LoanProduct[]>('/v1/bank-admin/loans/products')
}
export function createLoanProduct(payload: LoanProductPayload) {
  return request<LoanProduct>('/v1/bank-admin/loans/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
export function updateLoanProduct(productId: string, payload: LoanProductPayload) {
  return request<LoanProduct>(`/v1/bank-admin/loans/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
export function activateLoanProduct(productId: string, adminId: string) {
  return request<{ success: boolean }>(`/v1/bank-admin/loans/products/${productId}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId }),
  })
}
export function deactivateLoanProduct(productId: string, adminId: string) {
  return request<{ success: boolean }>(`/v1/bank-admin/loans/products/${productId}/deactivate`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId }),
  })
}
export function getLoanApplications(params: { status?: string; page?: number; size?: number } = {}) {
  const qs = buildQueryString({ status: params.status, page: params.page ?? 0, size: params.size ?? 20 })
  return request<PaginatedData<LoanApplication>>(`/v1/bank-admin/loans/applications${qs}`)
}
export function approveLoanApplication(applicationId: string, payload: { adminId: string; approvedAmount: number; notes: string }) {
  return request<{ success: boolean }>(`/v1/bank-admin/loans/applications/${applicationId}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
export function declineLoanApplication(applicationId: string, payload: { adminId: string; declineReason: string; notes: string }) {
  return request<{ success: boolean }>(`/v1/bank-admin/loans/applications/${applicationId}/decline`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
export function disburseLoan(applicationId: string, adminId: string) {
  return request<{ success: boolean }>(`/v1/bank-admin/loans/applications/${applicationId}/disburse`, {
    method: 'POST',
    body: JSON.stringify({ adminId }),
  })
}

// ──────────────────────────────────────────────
// Reference Data
// ──────────────────────────────────────────────
export function getCountries(page = 0) {
  return request<PaginatedData<ReferenceCountry>>(`/v1/bank-admin/reference/countries?page=${page}&size=100`)
}
export function getStates(page = 0) {
  return request<PaginatedData<ReferenceState>>(`/v1/bank-admin/reference/states?page=${page}&size=100`)
}
export function getTowns(page = 0) {
  return request<PaginatedData<ReferenceTown>>(`/v1/bank-admin/reference/towns?page=${page}&size=100`)
}
export function getSectors(page = 0) {
  return request<PaginatedData<ReferenceSector>>(`/v1/bank-admin/reference/sectors?page=${page}&size=100`)
}

// ──────────────────────────────────────────────
// Devices
// ──────────────────────────────────────────────
export function revokeCustomerDevice(customerId: string, deviceId: string) {
  return request<{ success: boolean }>(`/v1/bank-admin/customers/${customerId}/devices/${deviceId}`, {
    method: 'DELETE'
  })
}


// ==========================================
// NEW/UPDATED API ENDPOINTS (from OpenAPI)
// ==========================================

// --- Roles & Permissions ---
export function getMyPermissions() {
  return request<any>('/v1/bank-admin/roles/my-permissions')
}

export function updateRolePermissions(roleId: string, data: { permissions: string[]; adminId: string }) {
  return request<any>(`/v1/bank-admin/roles/${roleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export function deleteRole(roleId: string) {
  return request<any>(`/v1/bank-admin/roles/${roleId}`, {
    method: 'DELETE'
  })
}

export function updateRole(roleId: string, data: any) {
  return request<any>(`/v1/bank-admin/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}


// --- Loans ---
export function getLoanProductRequirements(productId: string) {
  return request<any>(`/v1/bank-admin/loans/products/${productId}/requirements`)
}

export function updateLoanProductRequirements(productId: string, data: any) {
  return request<any>(`/v1/bank-admin/loans/products/${productId}/requirements`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export function getLoanApplicationRequirements(applicationId: string) {
  return request<any>(`/v1/bank-admin/loans/applications/${applicationId}/requirements`)
}

export function getLoanApplicationDetails(applicationId: string) {
  return request<any>(`/v1/bank-admin/loans/applications/${applicationId}`)
}

export function sendLoanOfferLetter(applicationId: string, payload: { recipientEmail: string | null }) {
  return request<{ success: boolean }>(`/v1/bank-admin/loans/applications/${applicationId}/offer-letter`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}


// --- Transactions ---
export function getAllTransactions(params?: Record<string, string | number>) {
  const qs = params ? buildQueryString(params) : ''
  return request<PaginatedData<TransactionItem>>(`/v1/bank-admin/transactions/all${qs}`)
}


// --- Cards (New Module) ---
export function getCardProducts(params?: Record<string, string | number>) {
  const qs = params ? buildQueryString(params) : ''
  return request<CardProduct[]>(`/v1/bank-admin/cards/products${qs}`)
}

export function createCardProduct(data: CardProductPayload) {
  return request<{ id: string; code: string }>('/v1/bank-admin/cards/products', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export function updateCardProduct(productId: string, data: CardProductPayload) {
  return request<{ id: string; code: string }>(`/v1/bank-admin/cards/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export function activateCardProduct(productId: string, adminId: string) {
  return request<{ id: string; active: boolean }>(`/v1/bank-admin/cards/products/${productId}/activate`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId })
  })
}

export function deactivateCardProduct(productId: string, adminId: string) {
  return request<{ id: string; active: boolean }>(`/v1/bank-admin/cards/products/${productId}/deactivate`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId })
  })
}

export function getCardProductRequirements(productId: string) {
  return request<CardProductRequirement[]>(`/v1/bank-admin/cards/products/${productId}/requirements`)
}

export function updateCardProductRequirements(productId: string, requirements: CardProductRequirement[], adminId: string) {
  return request<CardProductRequirement[]>(`/v1/bank-admin/cards/products/${productId}/requirements`, {
    method: 'PUT',
    body: JSON.stringify({ adminId, requirements })
  })
}

export function getCardRequests(params?: Record<string, string | number>) {
  const qs = params ? buildQueryString(params) : ''
  return request<PaginatedData<CardRequest>>(`/v1/bank-admin/cards/requests${qs}`)
}

export function getCardRequestDetails(requestId: string) {
  return request<CardRequestDetails>(`/v1/bank-admin/cards/requests/${requestId}/details`)
}

export function updateCardRequestStatus(requestId: string, status: string, adminId: string) {
  return request<{ id: string; status: string }>(`/v1/bank-admin/cards/requests/${requestId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, adminId })
  })
}


// --- Promotions ---
export function getPromotions() {
  return request<Promotion[]>('/v1/bank-admin/promotions')
}

export function createPromotion(payload: PromotionPayload) {
  return request<{ id: string; title: string }>('/v1/bank-admin/promotions', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function updatePromotion(promotionId: string, payload: PromotionPayload) {
  return request<{ id: string; title: string }>(`/v1/bank-admin/promotions/${promotionId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

// --- Broadcasts ---
export function getBroadcasts(params?: Record<string, string | number>) {
  const qs = params ? buildQueryString(params) : ''
  return request<PaginatedData<Broadcast>>(`/v1/bank-admin/broadcasts${qs}`)
}

export function createBroadcast(payload: CreateBroadcastRequest) {
  return request<{ id: string; title: string; status: string; target: string; channel: string }>('/v1/bank-admin/broadcasts', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function sendBroadcast(broadcastId: string) {
  return request<{ id: string; status: string; sentAt: string }>(`/v1/bank-admin/broadcasts/${broadcastId}/send`, {
    method: 'POST'
  })
}

export function getBroadcastDetail(broadcastId: string) {
  return request<BroadcastDetail>(`/v1/bank-admin/broadcasts/${broadcastId}`)
}

// --- Logs ---
export function getApiLogs(params?: Record<string, string | number>) {
  const qs = params ? buildQueryString(params) : ''
  return request<PaginatedData<ApiLog>>(`/v1/bank-admin/logs${qs}`)
}

export function getApiTrace(traceId: string) {
  return request<ApiLog[]>(`/v1/bank-admin/logs/${traceId}`)
}

export function getLogViewer() {
  return request<string>('/v1/bank-admin/log-viewer')
}

// --- Customers (New) ---
export function syncCoreBanking() {
  return request<any>('/v1/bank-admin/customers/sync-core-banking', {
    method: 'POST',
    body: JSON.stringify({})
  })
}

// ──────────────────────────────────────────────
// Dashboard Summary
// ──────────────────────────────────────────────

export function getDashboardSummary() {
  return request<DashboardSummary>('/v1/bank-admin/dashboard/summary')
}

// ──────────────────────────────────────────────
// Customer Operations (New)
// ──────────────────────────────────────────────

export function syncCustomerTier(customerId: string, payload: SyncTierRequest) {
  return request<{ id: string; tier: string }>(`/v1/bank-admin/customers/${customerId}/sync-tier`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function unlockCustomerAccount(customerId: string, payload: UnlockAccountRequest) {
  return request<{ id: string; status: string }>(`/v1/bank-admin/customers/${customerId}/unlock`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function resendCustomerOtp(customerId: string, payload: OtpResendRequest) {
  return request<null>(`/v1/bank-admin/customers/${customerId}/otp-resend`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function dispatchCustomerOtp(customerId: string, payload: OtpDispatchRequest) {
  return request<null>(`/v1/bank-admin/customers/${customerId}/otp-dispatch`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function resetCustomerSecurity(customerId: string, payload: ResetSecurityRequest) {
  return request<null>(`/v1/bank-admin/customers/${customerId}/reset-security`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function overrideCustomerIdentity(customerId: string, payload: IdentityOverrideRequest) {
  return request<{ id: string }>(`/v1/bank-admin/customers/${customerId}/identity`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function getCustomerCorporateAccounts(customerId: string) {
  return request<CorporateAccountLink[]>(`/v1/bank-admin/customers/${customerId}/corporate-accounts`)
}

// ──────────────────────────────────────────────
// Identity Documents
// ──────────────────────────────────────────────

export function getIdentityDocuments(params?: Record<string, string | number>) {
  const qs = params ? buildQueryString(params) : ''
  return request<PaginatedData<IdentityDocument>>(`/v1/bank-admin/identity/documents${qs}`)
}

export function reviewIdentityDocument(documentId: string, payload: ReviewIdentityDocumentRequest) {
  return request<{ id: string; status: string }>(`/v1/bank-admin/identity/documents/${documentId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// ──────────────────────────────────────────────
// Sole Signatory
// ──────────────────────────────────────────────

export function linkCorporateSignatory(corporateId: string, payload: LinkSignatoryRequest) {
  return request<{ id: string }>(`/v1/bank-admin/corporates/${corporateId}/link-signatory`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function unlinkCorporateSignatory(corporateId: string) {
  return request<null>(`/v1/bank-admin/corporates/${corporateId}/link-signatory`, {
    method: 'DELETE',
  })
}

// ──────────────────────────────────────────────
// Card Dispatch
// ──────────────────────────────────────────────

export function dispatchCardRequest(requestId: string, payload: CardDispatchRequest) {
  return request<{ id: string; status: string }>(`/v1/bank-admin/cards/requests/${requestId}/dispatch`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

// --- Identity provider settings ---
export function getIdentityProviderSettings() {
  return request<IdentityProviderSettings>('/v1/bank-admin/settings/identity/providers')
}

export function setBvnProvider(provider: IdentityProvider) {
  return request<IdentityProviderSettings>('/v1/bank-admin/settings/identity/providers/bvn', {
    method: 'PUT',
    body: JSON.stringify({ provider }),
  })
}

/** NIN verification is ISW-only on the backend. */
export function setNinProvider(provider: 'ISW') {
  return request<IdentityProviderSettings>('/v1/bank-admin/settings/identity/providers/nin', {
    method: 'PUT',
    body: JSON.stringify({ provider }),
  })
}

export function setFaceProvider(provider: IdentityProvider) {
  return request<IdentityProviderSettings>('/v1/bank-admin/settings/identity/providers/face', {
    method: 'PUT',
    body: JSON.stringify({ provider }),
  })
}

export function setFaceMatchThreshold(threshold: number) {
  return request<IdentityProviderSettings>('/v1/bank-admin/settings/identity/face-threshold', {
    method: 'PUT',
    body: JSON.stringify({ threshold }),
  })
}

// --- Push notifications (admin) ---
export function sendCustomerPush(payload: CustomerPushRequest) {
  return request<CustomerPushResponse>('/v1/bank-admin/push/customer', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Returns 202; dispatch is asynchronous on the backend. */
export function sendPushBroadcast(payload: PushBroadcastRequest) {
  return request<unknown>('/v1/bank-admin/push/broadcast', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// --- VAS settings (accounts, charges, cashback) ---
export function getVasSettings() {
  return request<VasSettingsResponse>('/v1/bank-admin/settings/vas')
}

export function updateVasAccounts(payload: VasAccountsUpdate) {
  return request<unknown>('/v1/bank-admin/settings/vas/accounts', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** Flat fees in NGN. billCharge is the fallback for any category not set individually. */
export function updateVasCharges(payload: VasChargesUpdate) {
  return request<unknown>('/v1/bank-admin/settings/vas/charges', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** Rates are decimal fractions: 0.055 = 5.5% of the transaction amount. */
export function updateVasCashback(payload: VasCashbackUpdate) {
  return request<unknown>('/v1/bank-admin/settings/vas/cashback', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** Set any single vas.* key directly, e.g. vas.charge.cable_tv. */
export function setVasEntry(key: string, value: string) {
  if (!key.startsWith('vas.')) throw new Error('VAS config keys must start with vas.')
  return request<unknown>(`/v1/bank-admin/settings/vas/entry/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })
}

// --- GL accounts ---
export function getGlAccounts() {
  return request<GlAccounts>('/v1/bank-admin/settings/gl')
}

/** All fields optional — only what is sent gets updated. */
export function updateGlAccounts(payload: GlAccounts) {
  return request<GlAccounts>('/v1/bank-admin/settings/gl', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

/** Credentials and X-Admin-Username are supplied by the trusted API proxy. */
export function updateCbaProductCodes(payload: CbaProductCodes) {
  return request<unknown>('/v1/bank-admin/settings/cba/product-codes', {
    method: 'PUT',
    body: JSON.stringify(validateProductCodes(payload)),
  }, true)
}

type FeeEnvelope<T> = { status: 'success' | 'error'; data?: T; message?: string; code?: string }

async function feeRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await request<FeeEnvelope<T>>(path, init, true)
  const body = response.data
  if (!body || body.status !== 'success' || body.data === undefined) {
    throw new ApiError(body?.message ?? 'Fee request failed', 200, body?.code)
  }
  return body.data
}

export function getFeeSummary() { return feeRequest<FeeSummary>('/v1/bank-admin/fees/summary') }
export function getFeeCharges(params: { status?: FeeStatus; page?: number; size?: number } = {}) {
  return feeRequest<PaginatedData<FeeCharge>>(`/v1/bank-admin/fees/charges${buildQueryString(params)}`)
}
export function getFeeBatches(params: { page?: number; size?: number } = {}) {
  return feeRequest<PaginatedData<FeeBatch>>(`/v1/bank-admin/fees/batches${buildQueryString(params)}`)
}
export function getFeeSettings() { return feeRequest<FeeSettings>('/v1/bank-admin/settings/fees') }
export async function updateFeeSettings(payload: FeeSettingsUpdate) {
  const response = await request<FeeEnvelope<unknown>>('/v1/bank-admin/settings/fees', { method: 'PUT', body: JSON.stringify(payload) }, true)
  if (!response.data || response.data.status !== 'success') throw new ApiError(response.data?.message ?? 'Unable to update fee settings', 200, response.data?.code)
}
export function debitPendingFees() { return feeRequest<FeeBatch>('/v1/bank-admin/fees/debit', { method: 'POST' }) }

export function getComplaints(params: { status?: import('./types').ComplaintStatus; page?: number; size?: number } = {}) {
  const qs = buildQueryString({ status: params.status, page: params.page ?? 0, size: params.size ?? 20 })
  return request<import('./types').ComplaintPage>(`/v1/bank-admin/complaints${qs}`)
}

export function getComplaint(id: string) {
  return request<import('./types').Complaint>(`/v1/bank-admin/complaints/${encodeURIComponent(id)}`)
}

export function respondToComplaint(id: string, payload: {
  adminId: string; response: string; status?: Exclude<import('./types').ComplaintStatus, 'OPEN'>
}) {
  return request<import('./types').ComplaintResponseResult>(`/v1/bank-admin/complaints/${encodeURIComponent(id)}/respond`, {
    method: 'POST', body: JSON.stringify(payload),
  })
}
