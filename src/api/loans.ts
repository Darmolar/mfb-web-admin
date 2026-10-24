// Loan products and applications, read from the live shapes (checked 2026-10-24).
// Products are a bare array; applications are a Spring page whose rows nest the full customer.

import type { LoanProductPayload } from './types'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)

const titleCase = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

/**
 * Live products use FULL_TIME / PART_TIME; the mobile app (LoanPurposeScreen) sends EMPLOYED, SELF_EMPLOYED, BUSINESS_OWNER
 * and STUDENT. Both sets are offered until the backend settles on one.
 */
export const EMPLOYMENT_TYPES: Record<string, string> = {
  FULL_TIME: 'Full-time employed',
  PART_TIME: 'Part-time employed',
  EMPLOYED: 'Employed (app)',
  SELF_EMPLOYED: 'Self-employed',
  BUSINESS_OWNER: 'Business owner',
  STUDENT: 'Student',
}
export const employmentLabel = (t: string) => EMPLOYMENT_TYPES[t] ?? (t ? titleCase(t) : '—')

// ── Products ─────────────────────────────────────────────

export type LoanProductRecord = {
  id: string
  code: string
  name: string
  description: string
  minAmount: number | null
  maxAmount: number | null
  monthlyRatePercent: number | null
  minTenureMonths: number | null
  maxTenureMonths: number | null
  maxPreApprovedAmount: number | null
  minMonthlyIncome: number | null
  minAnnualIncome: number | null
  minAccountAgeDays: number | null
  employmentTypes: string[]
  active: boolean
}

export function readLoanProducts(body: unknown): LoanProductRecord[] {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.content) ? body.content : []
  return list.filter(isObj).map(p => ({
    id: str(p.id),
    code: str(p.code),
    name: str(p.name) || 'Unnamed product',
    description: str(p.description),
    minAmount: num(p.minAmount),
    maxAmount: num(p.maxAmount),
    monthlyRatePercent: num(p.monthlyRatePercent) ?? num(p.interestRate),
    minTenureMonths: num(p.minTenureMonths),
    maxTenureMonths: num(p.maxTenureMonths),
    maxPreApprovedAmount: num(p.maxPreApprovedAmount),
    minMonthlyIncome: num(p.minMonthlyIncome),
    minAnnualIncome: num(p.minAnnualIncome),
    minAccountAgeDays: num(p.minAccountAgeDays),
    employmentTypes: (Array.isArray(p.allowedEmploymentTypes) ? p.allowedEmploymentTypes.map(str) : str(p.allowedEmploymentTypes).split(','))
      .map(s => s.trim().toUpperCase()).filter(Boolean),
    active: p.active === true || str(p.status).toUpperCase() === 'ACTIVE',
  })).filter(p => p.id)
}

export type LoanProductForm = Record<
  'code' | 'name' | 'description' | 'minAmount' | 'maxAmount' | 'monthlyRatePercent' | 'minTenureMonths' | 'maxTenureMonths'
  | 'maxPreApprovedAmount' | 'minMonthlyIncome' | 'minAnnualIncome' | 'minAccountAgeDays', string
> & { employmentTypes: string[]; active: boolean }

export const EMPTY_LOAN_PRODUCT_FORM: LoanProductForm = {
  code: '', name: '', description: '', minAmount: '', maxAmount: '', monthlyRatePercent: '', minTenureMonths: '1', maxTenureMonths: '12',
  maxPreApprovedAmount: '', minMonthlyIncome: '', minAnnualIncome: '', minAccountAgeDays: '0', employmentTypes: [], active: false,
}

/** Editing starts from every saved value, so saving never silently resets a rule the form doesn't show. */
export function loanProductToForm(p: LoanProductRecord): LoanProductForm {
  const s = (n: number | null) => (n === null ? '' : String(n))
  return {
    code: p.code, name: p.name, description: p.description,
    minAmount: s(p.minAmount), maxAmount: s(p.maxAmount), monthlyRatePercent: s(p.monthlyRatePercent),
    minTenureMonths: s(p.minTenureMonths), maxTenureMonths: s(p.maxTenureMonths),
    maxPreApprovedAmount: s(p.maxPreApprovedAmount), minMonthlyIncome: s(p.minMonthlyIncome),
    minAnnualIncome: s(p.minAnnualIncome), minAccountAgeDays: s(p.minAccountAgeDays),
    employmentTypes: p.employmentTypes, active: p.active,
  }
}

export function loanProductPayload(f: LoanProductForm, adminId: string): { payload: LoanProductPayload } | { error: string } {
  const code = f.code.trim().toUpperCase()
  if (!/^[A-Z0-9_]{2,40}$/.test(code)) return { error: 'Code must be 2–40 capital letters, digits or underscores (e.g. PERSONAL_001).' }
  if (!f.name.trim()) return { error: 'Enter a product name.' }
  const n = (k: keyof LoanProductForm, label: string, opts: { min?: number; integer?: boolean; optional?: boolean } = {}) => {
    const raw = String(f[k]).trim()
    if (raw === '' && opts.optional) return 0
    const v = Number(raw)
    if (raw === '' || !Number.isFinite(v) || v < (opts.min ?? 0)) throw new Error(`${label} must be ${opts.min ? `at least ${opts.min}` : '0 or more'}.`)
    if (opts.integer && !Number.isInteger(v)) throw new Error(`${label} must be a whole number.`)
    return Number(v.toFixed(2))
  }
  try {
    const minAmount = n('minAmount', 'Minimum amount', { min: 1 })
    const maxAmount = n('maxAmount', 'Maximum amount', { min: 1 })
    if (minAmount > maxAmount) return { error: 'Minimum amount cannot be more than the maximum amount.' }
    const monthlyRatePercent = n('monthlyRatePercent', 'Monthly interest rate')
    if (monthlyRatePercent > 100) return { error: 'Monthly interest rate cannot exceed 100%.' }
    const minTenureMonths = n('minTenureMonths', 'Minimum tenure', { min: 1, integer: true })
    const maxTenureMonths = n('maxTenureMonths', 'Maximum tenure', { min: 1, integer: true })
    if (minTenureMonths > maxTenureMonths) return { error: 'Minimum tenure cannot be longer than the maximum tenure.' }
    const maxPreApprovedAmount = n('maxPreApprovedAmount', 'Maximum pre-approved amount', { optional: true })
    if (maxPreApprovedAmount > maxAmount) return { error: 'The pre-approved limit cannot exceed the maximum amount.' }
    return {
      payload: {
        code, name: f.name.trim(), description: f.description.trim(), minAmount, maxAmount, monthlyRatePercent, minTenureMonths, maxTenureMonths,
        maxPreApprovedAmount,
        minMonthlyIncome: n('minMonthlyIncome', 'Minimum monthly income', { optional: true }),
        minAnnualIncome: n('minAnnualIncome', 'Minimum annual income', { optional: true }),
        minAccountAgeDays: n('minAccountAgeDays', 'Minimum account age', { integer: true, optional: true }),
        allowedEmploymentTypes: f.employmentTypes.join(','),
        active: f.active,
        adminId,
      },
    }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ── Applications ─────────────────────────────────────────

export type LoanCustomer = {
  id: string; name: string; username: string; accountNumber: string; phone: string; email: string; bvn: string
  tier: string; status: string; blocked: boolean; blockReason: string; cbaVerified: boolean | null
  occupation: string; employer: string; address: string; createdAt: string
}

export type LoanApp = {
  id: string
  number: string
  status: string
  productCode: string
  requested: number
  approved: number | null
  tenureMonths: number | null
  monthlyRatePercent: number | null
  totalRepayment: number | null
  monthlyIncome: number | null
  annualIncome: number | null
  employmentType: string
  occupation: string
  sourceOfFunds: string
  educationLevel: string
  email: string
  customer: LoanCustomer | null
  adminNotes: string
  declineReason: string
  reviewedAt: string
  reviewedBy: string
  offerAccepted: boolean
  offerAcceptedAt: string
  disbursementDate: string
  nextRepaymentDate: string
  coreLoanAccount: string
  createdAt: string
  updatedAt: string
}

function readLoanCustomer(c: unknown): LoanCustomer | null {
  if (!isObj(c) || !str(c.id)) return null
  return {
    id: str(c.id),
    name: [str(c.firstName), str(c.middleName), str(c.lastName)].filter(Boolean).join(' ') || str(c.username),
    username: str(c.username), accountNumber: str(c.accountNumber), phone: str(c.phoneNumber), email: str(c.email), bvn: str(c.bvn),
    tier: str(c.accountTier), status: str(c.status).toUpperCase(), blocked: c.txnBlocked === true, blockReason: str(c.txnBlockReason),
    cbaVerified: typeof c.cbaVerified === 'boolean' ? c.cbaVerified : null,
    occupation: str(c.occupation), employer: str(c.employer), address: str(c.residentialAddress), createdAt: str(c.createdAt),
  }
}

export function readLoanApp(v: unknown): LoanApp | null {
  if (!isObj(v) || !str(v.id)) return null
  return {
    id: str(v.id),
    number: str(v.applicationNumber) || str(v.id).slice(0, 8).toUpperCase(),
    status: (str(v.status) || 'PENDING').toUpperCase(),
    productCode: str(v.loanProductCode) || str(v.productCode),
    requested: num(v.requestedAmount) ?? num(v.amount) ?? 0,
    approved: num(v.approvedAmount),
    tenureMonths: num(v.tenureMonths),
    monthlyRatePercent: num(v.interestRate),
    totalRepayment: num(v.totalRepayment),
    monthlyIncome: num(v.monthlyIncome),
    annualIncome: num(v.annualIncome),
    employmentType: str(v.employmentType).toUpperCase(),
    occupation: str(v.occupation), sourceOfFunds: str(v.sourceOfFunds), educationLevel: str(v.educationLevel), email: str(v.email),
    customer: readLoanCustomer(v.customer),
    adminNotes: str(v.adminNotes), declineReason: str(v.declineReason),
    reviewedAt: str(v.reviewedAt), reviewedBy: str(v.reviewedByAdminId),
    offerAccepted: v.offerAccepted === true, offerAcceptedAt: str(v.offerAcceptedAt),
    disbursementDate: str(v.disbursementDate), nextRepaymentDate: str(v.nextRepaymentDate), coreLoanAccount: str(v.coreLoanAccount),
    createdAt: str(v.createdAt) || str(v.appliedAt), updatedAt: str(v.updatedAt),
  }
}

export function readLoanApps(body: unknown) {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.content) ? body.content : []
  return list.map(readLoanApp).filter((a): a is LoanApp => a !== null)
}

/** Flat monthly interest, as the backend computes it (150,000 × (1 + 4% × 6) = 186,000). */
export function repaymentEstimate(amount: number, monthlyRatePercent: number | null, tenureMonths: number | null) {
  if (!tenureMonths || tenureMonths <= 0 || monthlyRatePercent === null) return null
  const total = Number((amount * (1 + (monthlyRatePercent / 100) * tenureMonths)).toFixed(2))
  return { total, interest: Number((total - amount).toFixed(2)), monthly: Number((total / tenureMonths).toFixed(2)) }
}

/** What the customer repays: the backend's own total when the loan is at the requested amount, else recomputed. */
export function appRepayment(a: LoanApp) {
  const principal = a.approved ?? a.requested
  if (a.totalRepayment !== null && a.tenureMonths && principal === a.requested) {
    const total = a.totalRepayment
    return { total, interest: Number((total - principal).toFixed(2)), monthly: Number((total / a.tenureMonths).toFixed(2)) }
  }
  return repaymentEstimate(principal, a.monthlyRatePercent, a.tenureMonths)
}

export type CheckResult = { label: string; result: 'pass' | 'warn' | 'fail' | 'unknown'; detail: string }

/** Share of monthly income taken by the instalment above which we flag affordability. */
export const AFFORDABILITY_LIMIT = 0.33

const n = (v: number) => `₦${v.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`

/** Checks an application against its product's rules and basic account health. Advisory only; the backend decides. */
export function eligibilityChecks(a: LoanApp, product: LoanProductRecord | null, now = new Date()): CheckResult[] {
  const checks: CheckResult[] = []
  const rep = appRepayment(a)
  if (product) {
    const lo = product.minAmount ?? 0, hi = product.maxAmount ?? Infinity
    checks.push({ label: 'Amount within product limits', result: a.requested >= lo && a.requested <= hi ? 'pass' : 'fail', detail: `${n(a.requested)} requested; product allows ${n(lo)}–${hi === Infinity ? 'no max' : n(hi)}` })
    if (a.tenureMonths !== null) {
      const tl = product.minTenureMonths ?? 1, th = product.maxTenureMonths ?? Infinity
      checks.push({ label: 'Tenure within product limits', result: a.tenureMonths >= tl && a.tenureMonths <= th ? 'pass' : 'fail', detail: `${a.tenureMonths} months; product allows ${tl}–${th === Infinity ? '∞' : th}` })
    }
    if (product.minMonthlyIncome) {
      checks.push(a.monthlyIncome === null
        ? { label: 'Minimum monthly income', result: 'unknown', detail: 'Income not provided' }
        : { label: 'Minimum monthly income', result: a.monthlyIncome >= product.minMonthlyIncome ? 'pass' : 'fail', detail: `${n(a.monthlyIncome)} declared; needs ${n(product.minMonthlyIncome)}` })
    }
    if (product.minAccountAgeDays && a.customer?.createdAt) {
      const days = Math.floor((now.getTime() - new Date(a.customer.createdAt).getTime()) / 86_400_000)
      checks.push({ label: 'Account age', result: days >= product.minAccountAgeDays ? 'pass' : 'fail', detail: `${days} days old; needs ${product.minAccountAgeDays}` })
    }
    if (product.employmentTypes.length && a.employmentType) {
      checks.push({ label: 'Employment type allowed', result: product.employmentTypes.includes(a.employmentType) ? 'pass' : 'fail', detail: `${employmentLabel(a.employmentType)}; allowed: ${product.employmentTypes.map(employmentLabel).join(', ')}` })
    }
    if (product.maxPreApprovedAmount && a.requested > product.maxPreApprovedAmount) {
      checks.push({ label: 'Above pre-approved limit', result: 'warn', detail: `Exceeds ${n(product.maxPreApprovedAmount)}; needs closer review` })
    }
  } else {
    checks.push({ label: 'Product rules', result: 'unknown', detail: `Product ${a.productCode || 'unknown'} not found, so limits can't be checked` })
  }
  if (rep && a.monthlyIncome) {
    const ratio = rep.monthly / a.monthlyIncome
    checks.push({ label: 'Affordability', result: ratio <= AFFORDABILITY_LIMIT ? 'pass' : 'warn', detail: `Instalment ${n(rep.monthly)} is ${Math.round(ratio * 100)}% of monthly income (guide: ≤ ${Math.round(AFFORDABILITY_LIMIT * 100)}%)` })
  }
  if (a.customer) {
    if (a.customer.blocked) checks.push({ label: 'Account not blocked', result: 'fail', detail: `Transactions blocked${a.customer.blockReason ? `: ${a.customer.blockReason}` : ''}` })
    if (a.customer.status && a.customer.status !== 'ACTIVE') checks.push({ label: 'Account active', result: 'fail', detail: `Account is ${titleCase(a.customer.status)}` })
    if (a.customer.cbaVerified === false) checks.push({ label: 'Core banking verified', result: 'warn', detail: 'Customer not verified on core banking' })
  }
  return checks
}

export const DECLINE_REASONS: Record<string, string> = {
  INSUFFICIENT_INCOME: 'Insufficient income',
  AFFORDABILITY: 'Repayment not affordable',
  POOR_CREDIT_HISTORY: 'Poor credit history',
  INCOMPLETE_DOCUMENTS: 'Incomplete or invalid documents',
  KYC_INCOMPLETE: 'KYC not complete',
  EXCEEDS_LIMIT: 'Exceeds product limits',
  OTHER: 'Other (explain in notes)',
}

export const LOAN_STATUS: Record<string, { label: string; variant: 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'purple'; hint: string }> = {
  PENDING: { label: 'Pending review', variant: 'amber', hint: 'Waiting for a decision.' },
  PENDING_REVIEW: { label: 'Pending review', variant: 'amber', hint: 'Waiting for a decision.' },
  APPROVED: { label: 'Approved', variant: 'blue', hint: 'Approved; disburse once the customer accepts the offer.' },
  DECLINED: { label: 'Declined', variant: 'red', hint: 'The application was declined.' },
  REJECTED: { label: 'Declined', variant: 'red', hint: 'The application was declined.' },
  DISBURSED: { label: 'Disbursed', variant: 'purple', hint: 'Funds paid out; repayments running.' },
  ACTIVE: { label: 'Active', variant: 'purple', hint: 'Funds paid out; repayments running.' },
  CLOSED: { label: 'Closed', variant: 'green', hint: 'Fully repaid or closed.' },
}
export const loanStatus = (s: string) => LOAN_STATUS[s] ?? { label: titleCase(s), variant: 'slate' as const, hint: '' }

export const LOAN_STATUS_FILTERS = ['PENDING', 'APPROVED', 'DISBURSED', 'CLOSED', 'DECLINED']

export function loanActions(status: string) {
  return {
    canDecide: status === 'PENDING' || status === 'PENDING_REVIEW',
    canDisburse: status === 'APPROVED',
    canSendOffer: status === 'APPROVED',
  }
}
