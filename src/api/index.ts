import { ADMIN_API_KEY, API_BASE_URL } from './config'
import type {
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

async function request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getStoredToken()

  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(ADMIN_API_KEY ? { 'X-Admin-Key': ADMIN_API_KEY } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })

  // Auto-logout on 401
  if (res.status === 401) {
    localStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem('mfb_admin_pre_auth')
    window.location.reload()
    throw new ApiError('Session expired. Please sign in again.', 401)
  }

  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.success) {
    throw new ApiError(body?.message ?? 'Request failed', res.status, body?.errorCode)
  }

  return body as ApiResponse<T>
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
  const qs = buildQueryString({ page: params.page ?? 0, size: params.size ?? 20 })
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
export function getCountries() {
  return request<PaginatedData<ReferenceCountry>>('/v1/bank-admin/reference/countries')
}
export function getStates() {
  return request<PaginatedData<ReferenceState>>('/v1/bank-admin/reference/states')
}
export function getTowns() {
  return request<PaginatedData<ReferenceTown>>('/v1/bank-admin/reference/towns')
}
export function getSectors() {
  return request<PaginatedData<ReferenceSector>>('/v1/bank-admin/reference/sectors')
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

export function updateRolePermissions(roleId: string, data: any) {
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
