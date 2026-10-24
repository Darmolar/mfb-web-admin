// Readers and roll-ups for the Overview page.
// The live dashboard summary (checked 2026-10-24) sends activeCustomers / pendingKycCount / openComplianceFlags /
// todayTransactionCount / todayTransactionVolume; older builds sent activeAccounts / pendingKyc / complianceFlags.

import type { LoanApp } from './loans'
import type { SavingsGoalRecord } from './savings'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
const first = (o: Obj, ...keys: string[]) => keys.map(k => num(o[k])).find(n => n !== null) ?? null

export type Summary = {
  totalCustomers: number | null
  activeCustomers: number | null
  pendingKyc: number | null
  openFlags: number | null
  todayCount: number | null
  todayVolume: number | null
  generatedAt: string
}

export function readSummary(body: unknown): Summary {
  const o = isObj(body) ? body : {}
  return {
    totalCustomers: first(o, 'totalCustomers'),
    activeCustomers: first(o, 'activeCustomers', 'activeAccounts'),
    pendingKyc: first(o, 'pendingKycCount', 'pendingKyc'),
    openFlags: first(o, 'openComplianceFlags', 'complianceFlags'),
    todayCount: first(o, 'todayTransactionCount'),
    todayVolume: first(o, 'todayTransactionVolume'),
    generatedAt: str(o.generatedAt),
  }
}

export type OverviewCustomer = { id: string; name: string; tier: string; status: string; accountNumber: string; createdAt: string; blocked: boolean }

export function readOverviewCustomers(body: unknown): OverviewCustomer[] {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.content) ? body.content : []
  return list.filter(isObj).map(c => ({
    id: str(c.id),
    name: [str(c.firstName), str(c.middleName), str(c.lastName)].filter(Boolean).join(' ') || str(c.username) || 'Unnamed customer',
    tier: str(c.accountTier),
    status: str(c.status).toUpperCase(),
    accountNumber: str(c.accountNumber),
    createdAt: str(c.createdAt),
    blocked: c.txnBlocked === true,
  })).filter(c => c.id)
}

/** Customers per account tier, lowest tier first. */
export function tierBreakdown(customers: OverviewCustomer[]) {
  const counts = new Map<string, number>()
  for (const c of customers) counts.set(c.tier || '?', (counts.get(c.tier || '?') ?? 0) + 1)
  return [...counts.entries()].map(([tier, count]) => ({ tier, count })).sort((a, b) => a.tier.localeCompare(b.tier, undefined, { numeric: true }))
}

/** How many customers joined in the last `days` days. */
export function joinedSince(customers: OverviewCustomer[], days: number, now = Date.now()) {
  const from = now - days * 86_400_000
  return customers.filter(c => { const t = Date.parse(c.createdAt); return Number.isFinite(t) && t >= from }).length
}

export type KycPendingRow = { id: string; name: string; accountNumber: string; currentTier: string; requestedTier: string; risk: string; createdAt: string }

/** Pending KYC rows; the name now sits in a nested `customer`, older rows had `customerName`. */
export function readKycPending(body: unknown): KycPendingRow[] {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.content) ? body.content : []
  return list.filter(isObj).map(k => {
    const c = isObj(k.customer) ? k.customer : {}
    const name = [str(c.firstName), str(c.middleName), str(c.lastName)].filter(Boolean).join(' ') || str(k.customerName) || str(c.username)
    return {
      id: str(k.id), name: name || 'Unknown customer', accountNumber: str(c.accountNumber),
      currentTier: str(k.currentTier), requestedTier: str(k.requestedTier), risk: str(k.riskLevel).toUpperCase(), createdAt: str(k.createdAt),
    }
  }).filter(k => k.id)
}

/** Loan pipeline: count and money at each stage. Disbursed principal is the loan book (repayments aren't exposed). */
export function loanPipeline(apps: LoanApp[]) {
  const stage = (pred: (s: string) => boolean, amount: (a: LoanApp) => number) => {
    const xs = apps.filter(a => pred(a.status))
    return { count: xs.length, amount: xs.reduce((s, a) => s + amount(a), 0) }
  }
  return {
    pending: stage(s => s === 'PENDING' || s === 'PENDING_REVIEW', a => a.requested),
    approved: stage(s => s === 'APPROVED', a => a.approved ?? a.requested),
    disbursed: stage(s => s === 'DISBURSED', a => a.approved ?? a.requested),
    closed: stage(s => s === 'CLOSED', a => a.approved ?? a.requested),
    declined: stage(s => s === 'DECLINED' || s === 'REJECTED', a => a.requested),
  }
}

export function savingsTotals(goals: SavingsGoalRecord[]) {
  const active = goals.filter(g => g.status === 'ACTIVE')
  const saved = goals.reduce((s, g) => s + g.balance, 0)
  const target = goals.reduce((s, g) => s + g.target, 0)
  return { goals: goals.length, active: active.length, saved, target, progress: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0 }
}

/** "Good morning" etc. for the page greeting. */
export function greeting(date = new Date()) {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
