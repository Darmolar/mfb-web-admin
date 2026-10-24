// Savings products and customer goals, read from the live shapes (checked 2026-10-24).
// Products carry a full interest/lock-in/overdraft configuration; edits must send all of it back unchanged
// unless the admin changed it, or a PUT silently resets settings the form doesn't show.

import type { SavingsProductPayload } from './types'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
const titleCase = (s: string) => (s ? s.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : '')

export const COMPOUNDING: Record<string, string> = { daily: 'Daily', monthly: 'Monthly', quarterly: 'Quarterly', semi_annual: 'Every 6 months', annually: 'Yearly' }
export const POSTING: Record<string, string> = { monthly: 'Monthly', quarterly: 'Quarterly', biannual: 'Every 6 months', annually: 'Yearly' }
export const CALCULATION: Record<string, string> = { daily_balance: 'Daily balance', average_daily_balance: 'Average daily balance' }
export const LOCKIN_UNITS: Record<string, string> = { days: 'days', weeks: 'weeks', months: 'months', years: 'years' }
export const optionLabel = (map: Record<string, string>, v: string) => map[v] ?? titleCase(v)

export type SavingsProductRecord = {
  id: string
  code: string
  name: string
  description: string
  minAmount: number | null
  maxAmount: number | null
  annualRatePercent: number | null
  minDurationDays: number | null
  maxDurationDays: number | null
  compoundingPeriod: string
  interestPostingPeriodType: string
  interestCalculationType: string
  minimumBalanceForInterestCalculation: number | null
  lockinPeriod: number | null
  lockinType: string
  minimumBalance: number | null
  allowPartialWithdrawal: boolean
  active: boolean
  /** Every field as returned, so an edit can send back what the form doesn't show. */
  raw: Obj
}

export function readSavingsProducts(body: unknown): SavingsProductRecord[] {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.content) ? body.content : []
  return list.filter(isObj).map(p => ({
    id: str(p.id),
    code: str(p.code),
    name: str(p.name) || 'Unnamed product',
    description: str(p.description),
    minAmount: num(p.minAmount),
    maxAmount: num(p.maxAmount),
    annualRatePercent: num(p.annualRatePercent) ?? num(p.interestRate),
    minDurationDays: num(p.minDurationDays),
    maxDurationDays: num(p.maxDurationDays),
    compoundingPeriod: str(p.compoundingPeriod) || 'monthly',
    interestPostingPeriodType: str(p.interestPostingPeriodType) || 'monthly',
    interestCalculationType: str(p.interestCalculationType) || 'daily_balance',
    minimumBalanceForInterestCalculation: num(p.minimumBalanceForInterestCalculation),
    lockinPeriod: num(p.lockinPeriod),
    lockinType: str(p.lockinType) || 'days',
    minimumBalance: num(p.minimumBalance),
    allowPartialWithdrawal: p.allowPartialWithdrawal === true,
    active: p.active === true || str(p.status).toUpperCase() === 'ACTIVE',
    raw: p,
  })).filter(p => p.id)
}

export type SavingsProductForm = {
  code: string; name: string; description: string
  minAmount: string; maxAmount: string; annualRatePercent: string; minDurationDays: string; maxDurationDays: string
  compoundingPeriod: string; interestPostingPeriodType: string; interestCalculationType: string; minimumBalanceForInterestCalculation: string
  lockinPeriod: string; lockinType: string; minimumBalance: string; allowPartialWithdrawal: boolean; active: boolean
}

export const EMPTY_SAVINGS_FORM: SavingsProductForm = {
  code: '', name: '', description: '', minAmount: '100', maxAmount: '', annualRatePercent: '', minDurationDays: '30', maxDurationDays: '',
  compoundingPeriod: 'monthly', interestPostingPeriodType: 'monthly', interestCalculationType: 'daily_balance', minimumBalanceForInterestCalculation: '0',
  lockinPeriod: '0', lockinType: 'days', minimumBalance: '0', allowPartialWithdrawal: true, active: false,
}

const s = (n: number | null) => (n === null ? '' : String(n))

export function savingsProductToForm(p: SavingsProductRecord): SavingsProductForm {
  return {
    code: p.code, name: p.name, description: p.description,
    minAmount: s(p.minAmount), maxAmount: s(p.maxAmount), annualRatePercent: s(p.annualRatePercent),
    minDurationDays: s(p.minDurationDays), maxDurationDays: s(p.maxDurationDays),
    compoundingPeriod: p.compoundingPeriod, interestPostingPeriodType: p.interestPostingPeriodType, interestCalculationType: p.interestCalculationType,
    minimumBalanceForInterestCalculation: s(p.minimumBalanceForInterestCalculation),
    lockinPeriod: s(p.lockinPeriod), lockinType: p.lockinType, minimumBalance: s(p.minimumBalance),
    allowPartialWithdrawal: p.allowPartialWithdrawal, active: p.active,
  }
}

// Settings the backend stores that the form doesn't expose; new products get the documented defaults.
const HIDDEN_DEFAULTS = {
  interestRateType: 'year', automaticOpeningBalance: 0, allowOverdraft: false, overdraftLimit: null, overdraftInterestRate: null,
  minimumOverdraftForInterest: null, daysInYear: '365', daysInMonth: '30', accountingRule: 'none',
}

/**
 * Builds the create/update payload. Blank maximums mean "no maximum" and are sent as null (as the live products
 * store them), never as 0. Fields the form doesn't show are carried over from the existing product.
 */
export function savingsProductPayload(f: SavingsProductForm, adminId: string, existing?: SavingsProductRecord | null):
  { payload: SavingsProductPayload & Record<string, unknown> } | { error: string } {
  const code = f.code.trim().toUpperCase()
  if (!/^[A-Z0-9_-]{2,40}$/.test(code)) return { error: 'Code must be 2–40 capital letters, digits, _ or - (e.g. M_PURSE).' }
  if (!f.name.trim()) return { error: 'Enter a product name.' }
  const read = (raw: string, label: string, opts: { min?: number; integer?: boolean; optional?: boolean } = {}) => {
    const t = raw.trim()
    if (t === '') { if (opts.optional) return null; throw new Error(`Enter ${label.toLowerCase()}.`) }
    const v = Number(t)
    if (!Number.isFinite(v) || v < (opts.min ?? 0)) throw new Error(`${label} must be ${opts.min ? `at least ${opts.min}` : '0 or more'}.`)
    if (opts.integer && !Number.isInteger(v)) throw new Error(`${label} must be a whole number.`)
    return Number(v.toFixed(2))
  }
  try {
    const minAmount = read(f.minAmount, 'Minimum deposit')!
    const maxAmount = read(f.maxAmount, 'Maximum deposit', { min: 1, optional: true })
    if (maxAmount !== null && minAmount > maxAmount) return { error: 'Minimum deposit cannot be more than the maximum.' }
    const annualRatePercent = read(f.annualRatePercent, 'Annual interest rate')!
    if (annualRatePercent > 100) return { error: 'Annual interest rate cannot exceed 100%.' }
    const minDurationDays = read(f.minDurationDays, 'Minimum duration', { min: 1, integer: true })!
    const maxDurationDays = read(f.maxDurationDays, 'Maximum duration', { min: 1, integer: true, optional: true })
    if (maxDurationDays !== null && minDurationDays > maxDurationDays) return { error: 'Minimum duration cannot be longer than the maximum.' }
    const lockinPeriod = read(f.lockinPeriod, 'Lock-in period', { integer: true, optional: true }) ?? 0
    const minimumBalance = read(f.minimumBalance, 'Minimum balance', { optional: true }) ?? 0
    const minimumBalanceForInterestCalculation = read(f.minimumBalanceForInterestCalculation, 'Minimum balance for interest', { optional: true }) ?? 0
    const carried = Object.fromEntries(Object.keys(HIDDEN_DEFAULTS).map(k => [k, existing && k in existing.raw ? existing.raw[k] : HIDDEN_DEFAULTS[k as keyof typeof HIDDEN_DEFAULTS]]))
    return {
      payload: {
        ...carried,
        code, name: f.name.trim(), description: f.description.trim(),
        minAmount, maxAmount: maxAmount as number, annualRatePercent, minDurationDays, maxDurationDays: maxDurationDays as number,
        compoundingPeriod: f.compoundingPeriod, interestPostingPeriodType: f.interestPostingPeriodType, interestCalculationType: f.interestCalculationType,
        minimumBalanceForInterestCalculation, lockinPeriod, lockinType: f.lockinType, minimumBalance,
        allowPartialWithdrawal: f.allowPartialWithdrawal,
        active: f.active, adminId,
      },
    }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

const PERIODS_PER_YEAR: Record<string, number> = { daily: 365, monthly: 12, quarterly: 4, semi_annual: 2, annually: 1 }

/** Interest earned on `amount` over `days` at an annual rate, compounded per the product setting. */
export function interestEstimate(amount: number, annualRatePercent: number, days: number, compounding = 'monthly') {
  const n = PERIODS_PER_YEAR[compounding] ?? 12
  const total = amount * (1 + annualRatePercent / 100 / n) ** (n * (days / 365))
  return Number((total - amount).toFixed(2))
}

export function lockinLabel(p: Pick<SavingsProductRecord, 'lockinPeriod' | 'lockinType'>) {
  return p.lockinPeriod ? `${p.lockinPeriod} ${optionLabel(LOCKIN_UNITS, p.lockinType)}` : 'None'
}

// ── Goals ────────────────────────────────────────────────

export type SavingsGoalRecord = {
  id: string
  name: string
  category: string
  productCode: string
  target: number
  balance: number
  progress: number
  ratePercent: number | null
  durationDays: number | null
  maturityDate: string
  daysToMaturity: number | null
  coreAccount: string
  status: string
  customerId: string
  customerName: string
  customerAccount: string
  customerPhone: string
  customerEmail: string
  createdAt: string
}

export function readSavingsGoals(body: unknown, now = new Date()): SavingsGoalRecord[] {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.content) ? body.content : []
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return list.filter(isObj).map(g => {
    const c = isObj(g.customer) ? g.customer : {}
    const target = num(g.targetAmount) ?? 0
    const balance = num(g.currentBalance) ?? num(g.currentAmount) ?? 0
    const maturityDate = str(g.maturityDate)
    const m = maturityDate ? new Date(`${maturityDate.slice(0, 10)}T00:00:00`).getTime() : NaN
    return {
      id: str(g.id),
      name: str(g.goalName) || str(g.name) || str(g.title) || 'Untitled goal',
      category: str(g.category).toUpperCase(),
      productCode: str(g.productCode),
      target, balance,
      progress: target > 0 ? Math.min(1, balance / target) : 0,
      ratePercent: num(g.interestRate),
      durationDays: num(g.durationDays),
      maturityDate,
      daysToMaturity: Number.isFinite(m) ? Math.round((m - today) / 86_400_000) : null,
      coreAccount: str(g.coreAccountNumber),
      status: (str(g.status) || 'ACTIVE').toUpperCase(),
      customerId: str(c.id) || str(g.customerId),
      customerName: [str(c.firstName), str(c.middleName), str(c.lastName)].filter(Boolean).join(' ') || str(c.username) || str(g.customerName),
      customerAccount: str(c.accountNumber),
      customerPhone: str(c.phoneNumber),
      customerEmail: str(c.email),
      createdAt: str(g.createdAt),
    }
  }).filter(g => g.id)
}

export const categoryLabel = (c: string) => (c ? titleCase(c) : 'Uncategorised')

export const GOAL_STATUS: Record<string, { label: string; variant: 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'purple'; hint: string }> = {
  ACTIVE: { label: 'Active', variant: 'green', hint: 'Saving and earning interest.' },
  SUSPENDED: { label: 'Suspended', variant: 'red', hint: 'Frozen by the bank: no deposits or withdrawals until reactivated.' },
  COMPLETED: { label: 'Completed', variant: 'blue', hint: 'Target reached.' },
  MATURED: { label: 'Matured', variant: 'purple', hint: 'Reached its maturity date.' },
  WITHDRAWN: { label: 'Withdrawn', variant: 'slate', hint: 'Funds paid out to the customer.' },
  CLOSED: { label: 'Closed', variant: 'slate', hint: 'Closed.' },
}
export const goalStatus = (s: string) => GOAL_STATUS[s] ?? { label: titleCase(s), variant: 'slate' as const, hint: '' }

export function maturityLabel(days: number | null) {
  if (days === null) return 'No maturity date'
  if (days < 0) return `Matured ${-days} day${days === -1 ? '' : 's'} ago`
  if (days === 0) return 'Matures today'
  if (days < 31) return `In ${days} day${days === 1 ? '' : 's'}`
  const months = Math.round(days / 30.4)
  return `In about ${months} month${months === 1 ? '' : 's'}`
}
