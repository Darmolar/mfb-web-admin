import { ADMIN_API_KEY, API_BASE_URL } from './config'
import type {
  Role,
  Permission,
  SavingsProduct,
  SavingsGoal,
  LoanProduct,
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
  return request<PaginatedData<SavingsProduct>>('/v1/bank-admin/savings/products')
}
export function getSavingsGoals() {
  return request<PaginatedData<SavingsGoal>>('/v1/bank-admin/savings/goals')
}

// ──────────────────────────────────────────────
// Loans
// ──────────────────────────────────────────────
export function getLoanProducts() {
  return request<PaginatedData<LoanProduct>>('/v1/bank-admin/loans/products')
}
export function getLoanApplications() {
  return request<PaginatedData<LoanApplication>>('/v1/bank-admin/loans/applications')
}
export function approveLoanApplication(applicationId: string, adminId: string) {
  return request<{ success: boolean }>(`/v1/bank-admin/loans/applications/${applicationId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ adminId })
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
