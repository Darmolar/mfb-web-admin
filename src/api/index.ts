import { parseKycProcesses, parseKycRequirements } from './kycConfiguration'
import { validateProductCodes, type CbaProductCodes } from './productCodes'
import { ADMIN_API_KEY, API_BASE_URL, PUBLIC_API_KEY } from './config'
import type {
  IdentityProvider, IdentityProviderSettings, SystemSettings,
  NotificationChannel, NotificationSetting, NotificationSettings,
  VasSettingsResponse, VasAccountsUpdate, VasChargesUpdate, VasCashbackUpdate, GlAccounts,
  CustomerPushRequest, CustomerPushResponse, PushBroadcastRequest,
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
  type IdentityVerificationListParams,
  type ImageRequestListParams,
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
  type CustomerDetailResponse,
  type CustomerAccount,
  type AddCustomerAccountRequest,
  type CustomerListItem,
  type CustomerListParams,
  type CustomerUpdateRequest,
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

/** Spell out field errors ({ data: { field: "must not be null" } }) so "Validation failed" is actionable. */
function errorMessage(body: any) {
  const message = body?.message ?? 'Request failed'
  const fields = body?.errorCode === 'VALIDATION_ERROR' && body?.data && typeof body.data === 'object' && !Array.isArray(body.data)
    ? Object.entries(body.data).filter(([, v]) => typeof v === 'string').map(([k, v]) => `${k} ${v}`)
    : []
  return fields.length ? `${message}: ${fields.join('; ')}` : message
}

async function request<T>(path: string, init: RequestInit = {}, allowHttpSuccess = false): Promise<ApiResponse<T>> {
  const isAuthRequest = path.startsWith('/v1/bank-admin/auth/')
  const token = isAuthRequest ? null : getStoredToken()

  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      ...(['POST', 'PUT', 'PATCH'].includes(init.method ?? '') && !(typeof FormData !== 'undefined' && init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
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
    throw new ApiError(errorMessage(body), res.status, body?.errorCode)
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

export async function getCustomerDetail(customerId: string): Promise<ApiResponse<CustomerDetail>> {
  const res = await request<CustomerDetailResponse | CustomerDetail>(`/v1/bank-admin/customers/${customerId}`)
  const data = res.data
  // Flatten `{ customer, accounts }` so profile tabs keep reading one object; the old flat shape passes through.
  if (data && 'customer' in data && data.customer) {
    return { ...res, data: { ...data.customer, accounts: data.accounts ?? [] } }
  }
  return res as ApiResponse<CustomerDetail>
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

/** Response shape is not contracted — callers should refetch the customer afterwards. */
export function updateCustomer(customerId: string, payload: CustomerUpdateRequest) {
  return request<unknown>(`/v1/bank-admin/customers/${customerId}`, {
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
// Role responses are read with src/api/roles.ts: the OpenAPI file gives no response shape.
export function getRoles() {
  return request<unknown>('/v1/bank-admin/roles')
}
export function getRole(roleId: string) {
  return request<unknown>(`/v1/bank-admin/roles/${roleId}`)
}
export function createRole(payload: { name: string; description: string; adminId: string }) {
  return request<unknown>('/v1/bank-admin/roles', {
    method: 'POST',
    body: JSON.stringify({ ...payload, permissions: [] })
  })
}
// Postman "Assign Role To Admin": adminUserId is the admin receiving the role, performedBy is the signed-in admin.
export function assignRole(roleId: string, payload: { adminUserId: string; performedBy: string }) {
  return request<unknown>(`/v1/bank-admin/roles/${roleId}/assign`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
export function getPermissions() {
  return request<unknown>('/v1/bank-admin/roles/permissions')
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
export function getSavingsGoals(params: { page?: number; size?: number } = {}) {
  const qs = buildQueryString({ page: params.page ?? 0, size: params.size ?? 100 })
  return request<PaginatedData<SavingsGoal>>(`/v1/bank-admin/savings/goals${qs}`)
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
  const qs = buildQueryString({ status: params.status, page: params.page ?? 0, size: params.size ?? 100 })
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

// The OpenAPI file says permissionIds, but GET /roles/permissions returns codes and both Postman
// examples send codes (as `permissions` and as `permissionCodes`), so send codes under both names.
export function updateRolePermissions(roleId: string, data: { permissionCodes: string[]; adminId: string }) {
  return request<any>(`/v1/bank-admin/roles/${roleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissions: data.permissionCodes, permissionCodes: data.permissionCodes, adminId: data.adminId })
  })
}

export function deleteRole(roleId: string) {
  return request<any>(`/v1/bank-admin/roles/${roleId}`, {
    method: 'DELETE'
  })
}

export function updateRole(roleId: string, data: { name: string; description: string; adminId: string }) {
  return request<any>(`/v1/bank-admin/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}


// --- Loans ---
export function getLoanProductRequirements(productId: string) {
  return request<any>(`/v1/bank-admin/loans/products/${productId}/requirements`)
}

// Same shape as card product requirements (Postman "Set Loan Product Requirements").
export function updateLoanProductRequirements(productId: string, requirements: CardProductRequirement[], adminId: string) {
  return request<unknown>(`/v1/bank-admin/loans/products/${productId}/requirements`, {
    method: 'PUT',
    body: JSON.stringify({ adminId, requirements })
  })
}

export function getLoanComments(applicationId: string) {
  return request<unknown>(`/v1/bank-admin/loans/applications/${applicationId}/comments`)
}

export function addLoanComment(applicationId: string, comment: string) {
  return request<unknown>(`/v1/bank-admin/loans/applications/${applicationId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ comment })
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

// OpenAPI documents { status, comment }; Postman sends { status, adminId }. Send all three.
export function updateCardRequestStatus(requestId: string, status: string, adminId: string, comment: string) {
  return request<{ id: string; status: string }>(`/v1/bank-admin/cards/requests/${requestId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment, adminId })
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
// Identity Verification Records (backend "Identity Verification Admin API", 2026-10-24)
// Responses are read with src/api/identityVerification.ts and src/api/approvals.ts.
// ──────────────────────────────────────────────

export function getIdentityVerifications(params: IdentityVerificationListParams = {}) {
  const qs = buildQueryString({
    name: params.name || undefined, idNumber: params.idNumber || undefined, idType: params.idType || undefined,
    page: params.page ?? 0, size: Math.min(params.size ?? 50, 100),
  })
  return request<unknown>(`/v1/bank-admin/identity${qs}`)
}

export function getIdentityVerification(recordId: string) {
  return request<unknown>(`/v1/bank-admin/identity/${encodeURIComponent(recordId)}`)
}

/** Re-fetches the record from the provider and overwrites it (including the image); logged by the server. */
export function reverifyIdentity(recordId: string) {
  return request<unknown>(`/v1/bank-admin/identity/${encodeURIComponent(recordId)}/reverify`, { method: 'POST' })
}

/** Submits a replacement face image; it only takes effect after a second admin approves it. */
export function requestIdentityImageUpdate(recordId: string, payload: { image: File; notes: string }) {
  const form = new FormData()
  form.append('image', payload.image)
  form.append('verified', 'true')
  if (payload.notes) form.append('notes', payload.notes)
  return request<unknown>(`/v1/bank-admin/identity/${encodeURIComponent(recordId)}/image`, {
    method: 'POST',
    body: form,
  })
}

export function getIdentityImageRequests(params: ImageRequestListParams = {}) {
  const qs = buildQueryString({ status: params.status || undefined, page: params.page ?? 0, size: Math.min(params.size ?? 100, 100) })
  return request<unknown>(`/v1/bank-admin/identity/image-requests${qs}`)
}

export function approveIdentityImageRequest(requestId: string, notes: string) {
  return request<unknown>(`/v1/bank-admin/identity/image-requests/${encodeURIComponent(requestId)}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ notes }),
  })
}

export function rejectIdentityImageRequest(requestId: string, notes: string) {
  return request<unknown>(`/v1/bank-admin/identity/image-requests/${encodeURIComponent(requestId)}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ notes }),
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

// --- System configuration (officer code, product code, face threshold) ---
function pickSetting(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && value !== '') {
      // Accept { value: x } wrappers as well as bare values.
      if (typeof value === 'object' && !Array.isArray(value) && 'value' in value) return (value as { value: unknown }).value
      return value
    }
  }
  return undefined
}

/**
 * Accepts the documented `{ data: { officerCode, productCode, faceThreshold } }` envelope,
 * a bare object, one level of extra nesting (e.g. `data.settings`), dotted system_config keys,
 * and string-encoded numbers.
 */
export function parseSystemSettings(raw: unknown): SystemSettings {
  const asRecord = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null)
  let root = asRecord(raw) ?? {}
  if (asRecord(root.data)) root = asRecord(root.data)!
  const sources = [root, ...['settings', 'config', 'systemConfig', 'data'].map(k => asRecord(root[k])).filter((r): r is Record<string, unknown> => !!r)]
  const find = (keys: string[]) => {
    for (const src of sources) {
      const v = pickSetting(src, keys)
      if (v !== undefined) return v
    }
    return undefined
  }
  const text = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() || null : null)
  const officer = find(['officerCode', 'defaultOfficerCode', 'accountOfficerCode', 'officer_code', 'cba.default.officer_code'])
  const product = find(['productCode', 'defaultProductCode', 'product_code', 'cba.default.product_code'])
  const threshold = find(['faceThreshold', 'faceMatchThreshold', 'threshold', 'face_threshold', 'identity.face.threshold'])
  const n = typeof threshold === 'number' ? threshold : typeof threshold === 'string' && threshold.trim() !== '' ? Number(threshold) : NaN
  return { officerCode: text(officer), productCode: text(product), faceThreshold: Number.isFinite(n) ? n : null }
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const res = await request<unknown>('/v1/bank-admin/settings', {}, true)
  return parseSystemSettings(res.data)
}

export function updateDefaultOfficerCode(value: string, adminId: string) {
  return request<unknown>('/v1/bank-admin/settings/officer-code', {
    method: 'PUT',
    body: JSON.stringify({ value: value.trim(), adminId }),
  }, true)
}

export function updateDefaultProductCode(value: string, adminId: string) {
  return request<unknown>('/v1/bank-admin/settings/product-code', {
    method: 'PUT',
    body: JSON.stringify({ value: value.trim(), adminId }),
  }, true)
}

/** threshold must be an integer 0–100. */
export function updateFaceThreshold(threshold: number, adminId: string) {
  return request<unknown>('/v1/bank-admin/settings/face-threshold', {
    method: 'PUT',
    body: JSON.stringify({ threshold, adminId }),
  }, true)
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

type FeeEnvelope<T> = { status?: 'success' | 'error'; success?: boolean; data?: T; message?: string; code?: string; errorCode?: string }

// Fee endpoints first answered { status: 'success', data }; the live backend (2026-10-24) uses the standard
// { success: true, data } envelope. Accept either.
async function feeRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await request<FeeEnvelope<T>>(path, init, true)
  const body = response.data
  const ok = body && (body.status === 'success' || body.success === true)
  if (!body || !ok || body.data === undefined) {
    throw new ApiError(body?.message ?? 'Fee request failed', 200, body?.code ?? body?.errorCode)
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

export interface SmsSetting { enabled: boolean; template: string; placeholders: string }
export interface SmsTypeMetadata { defaultTemplate: string; placeholders: string }
export interface SmsUpdate { type: string; enabled?: boolean; template?: string }

function smsBody<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
    return body.data as T
  }
  return body as T
}

export async function getSmsSettings() {
  const res = await request<unknown>('/v1/bank-admin/settings/notifications/sms', {}, true)
  const settings = smsBody<Record<string, SmsSetting>>(res.data)
  if (!settings || typeof settings !== 'object' || Array.isArray(settings) ||
      Object.values(settings).some(v => !v || typeof v.enabled !== 'boolean' || typeof v.template !== 'string' || typeof v.placeholders !== 'string')) {
    throw new Error('SMS settings response is invalid.')
  }
  return settings
}

export async function getSmsTypes() {
  const res = await request<unknown>('/v1/bank-admin/settings/notifications/sms/types', {}, true)
  const types = smsBody<Record<string, SmsTypeMetadata>>(res.data)
  if (!types || typeof types !== 'object' || Array.isArray(types) ||
      Object.values(types).some(v => !v || typeof v.defaultTemplate !== 'string' || typeof v.placeholders !== 'string')) {
    throw new Error('SMS type metadata response is invalid.')
  }
  return types
}

export function updateSmsType(type: string, update: Omit<SmsUpdate, 'type'>) {
  return request<unknown>(`/v1/bank-admin/settings/notifications/sms/${encodeURIComponent(type)}`, {
    method: 'PUT', body: JSON.stringify(update),
  }, true)
}

export function updateSmsSettings(updates: SmsUpdate[]) {
  return request<unknown>('/v1/bank-admin/settings/notifications/sms', {
    method: 'PUT', body: JSON.stringify({ updates }),
  }, true)
}

// --- Notification settings (SMS + email on/off; templates are read-only) ---
function parseNotificationChannel(raw: unknown): NotificationSetting[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  return Object.entries(raw as Record<string, unknown>).map(([type, value]) => {
    const v = (value && typeof value === 'object' ? value : { enabled: value }) as Record<string, unknown>
    const enabled = v.enabled === true || v.enabled === 'true' || v.enabled === 1
    const placeholderSource = v.placeholders
    const placeholders = Array.isArray(placeholderSource)
      ? placeholderSource.map(String)
      : typeof placeholderSource === 'string' ? placeholderSource.match(/\{[^{}]+\}/g) ?? [] : []
    return {
      type,
      enabled,
      template: typeof v.template === 'string' ? v.template : null,
      placeholders,
      description: typeof v.description === 'string' ? v.description : null,
    }
  })
}

/** Accepts the ApiResponse envelope or a bare `{ sms, email }` object; unknown shapes yield empty lists. */
export function parseNotificationSettings(raw: unknown): NotificationSettings {
  let root = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  if (!('sms' in root) && !('email' in root) && root.data && typeof root.data === 'object') {
    root = root.data as Record<string, unknown>
  }
  return { sms: parseNotificationChannel(root.sms), email: parseNotificationChannel(root.email) }
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const res = await request<unknown>('/v1/bank-admin/settings/notifications', {}, true)
  return parseNotificationSettings(res.data)
}

export function setNotificationEnabled(channel: NotificationChannel, type: string, enabled: boolean) {
  return request<unknown>(`/v1/bank-admin/settings/notifications/${channel}/${encodeURIComponent(type)}`, {
    method: 'PUT', body: JSON.stringify({ enabled }),
  }, true)
}

// Dynamic KYC configuration verified against the deployed API.
export function createKycProcess(payload: import('./dynamicKycTypes').CreateKycProcess) {
  return request<unknown>('/v1/bank-admin/kyc/processes', { method: 'POST', body: JSON.stringify(payload) })
}
export function updateKycProcess(code: string, payload: import('./dynamicKycTypes').UpdateKycProcess) {
  return request<unknown>(`/v1/bank-admin/kyc/processes/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(payload) })
}
export function createKycRequirement(code: string, payload: import('./dynamicKycTypes').CreateKycRequirement) {
  return request<unknown>(`/v1/bank-admin/kyc/processes/${encodeURIComponent(code)}/requirements`, { method: 'POST', body: JSON.stringify(payload) })
}
export function updateKycRequirement(id: string, payload: import('./dynamicKycTypes').UpdateKycRequirement) {
  return request<unknown>(`/v1/bank-admin/kyc/requirements/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) })
}
export function reviewKycSubmission(id: string, payload: import('./dynamicKycTypes').ReviewKycSubmission) {
  return request<unknown>(`/v1/bank-admin/kyc/submissions/${encodeURIComponent(id)}/review`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function getKycProcesses() {
  const response = await request<unknown>('/v1/bank-admin/kyc/processes')
  return parseKycProcesses(response.data)
}
export async function getKycRequirements(code: string) {
  const response = await request<unknown>(`/v1/bank-admin/kyc/processes/${encodeURIComponent(code)}/requirements`)
  return parseKycRequirements(response.data, code)
}
/** DELETE /bank-admin/kyc/processes/{code}. Past submissions stay with the bank; customers stop seeing the process. */
export function deleteKycProcess(code: string) {
  return request<unknown>(`/v1/bank-admin/kyc/processes/${encodeURIComponent(code)}`, { method: 'DELETE' }, true)
}
export function deleteKycRequirement(id: string) {
  return request<unknown>(`/v1/bank-admin/kyc/requirements/${encodeURIComponent(id)}`, { method: 'DELETE' }, true)
}
export type KycSubmissionRecord = Record<string, unknown> & { id: string }
export interface KycSubmissionPage { content: KycSubmissionRecord[]; totalPages: number; totalElements: number }
export async function getKycSubmissions(status: string, page: number) {
  const response = await request<KycSubmissionPage>('/v1/bank-admin/kyc/submissions' + buildQueryString({ status, page, size: 20 }))
  const data = response.data
  if (!data || !Array.isArray(data.content) || !Number.isInteger(data.totalPages) || !Number.isInteger(data.totalElements) ||
      data.content.some(row => !row || typeof row.id !== 'string' || !row.id)) throw new Error('Unable to read KYC submissions. Please retry.')
  return data
}
export async function getKycSubmission(id: string): Promise<Record<string, unknown>> {
  const response = await request<unknown>(`/v1/bank-admin/kyc/submissions/${encodeURIComponent(id)}`)
  if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) throw new Error('Unable to read this submission. Please retry.')
  return response.data as Record<string, unknown>
}
export async function getKycSubmissionFiles(id: string): Promise<unknown> {
  const data = (await request<unknown>(`/v1/bank-admin/kyc/submissions/${encodeURIComponent(id)}/files`)).data
  if (!data || typeof data !== 'object') throw new Error('Unable to read this submission’s documents. Please retry.')
  return data
}

// Stamp responses are intentionally unknown until the backend publishes a schema.
export function getBankStamp() {
  return request<unknown>('/v1/bank-admin/settings/bank-stamp', {}, true)
}
export function uploadBankStamp(file: File) {
  const body = new FormData()
  body.append('file', file)
  return request<unknown>('/v1/bank-admin/settings/bank-stamp', { method: 'PUT', body }, true)
}
// Only the enabled flag is configurable; the exact PATCH field name is awaiting backend confirmation,
// so the page re-reads the stamp after saving to confirm the change took effect.
export function updateBankStamp(payload: { enabled: boolean }) {
  return request<unknown>('/v1/bank-admin/settings/bank-stamp', { method: 'PATCH', body: JSON.stringify(payload) }, true)
}
export function deleteBankStamp() {
  return request<unknown>('/v1/bank-admin/settings/bank-stamp', { method: 'DELETE' }, true)
}

// CardFusion responses are undocumented; parse them with the readers in ./cardfusion.
const CARDFUSION = '/v1/bank-admin/cardfusion'
const CARDFUSION_PAGE = buildQueryString({ page: 0, size: 100 })

export function getCardFusionStaff() {
  return request<unknown>(`${CARDFUSION}/users${CARDFUSION_PAGE}`, {}, true)
}
export function createCardFusionStaff(payload: { name: string; email: string; staffCode: string; adminId: string }) {
  return request<unknown>(`${CARDFUSION}/users`, { method: 'POST', body: JSON.stringify(payload) }, true)
}
export function getCardFusionDevices() {
  return request<unknown>(`${CARDFUSION}/devices${CARDFUSION_PAGE}`, {}, true)
}
export function setCardFusionDeviceRevoked(hardwareId: string, revoked: boolean, adminId: string) {
  return request<unknown>(`${CARDFUSION}/devices/${encodeURIComponent(hardwareId)}/${revoked ? 'revoke' : 'unrevoke'}`, {
    method: 'PATCH',
    body: JSON.stringify({ adminId }),
  }, true)
}
export function createCardFusionOfficeToken(payload: { description: string; adminId: string }) {
  return request<unknown>(`${CARDFUSION}/office-tokens`, { method: 'POST', body: JSON.stringify(payload) }, true)
}
export function getCardFusionActivities() {
  return request<unknown>(`${CARDFUSION}/activities${CARDFUSION_PAGE}`, {}, true)
}
