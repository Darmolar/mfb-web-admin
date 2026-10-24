// One reader for both transaction endpoints (checked live 2026-10-24):
//  - /bank-admin/transactions/all: every money movement; rows carry txnType, reference, description, customerId.
//  - /bank-admin/transactions: customer transfers; rows carry transferType, transactionReference, a nested customer,
//    beneficiary/bank details, failureReason and, sometimes, latitude/longitude.
// Neither endpoint sends a channel, so none is shown.

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)

export const TXN_TYPES: Record<string, string> = {
  TRANSFER_OUTWARD: 'Transfer to other bank',
  TRANSFER_MEMPHIS: 'Transfer to Memphis account',
  TRANSFER_INTERNAL: 'Own-account transfer',
  AIRTIME: 'Airtime',
  DATA: 'Data',
  ELECTRICITY: 'Electricity',
  CABLE_TV: 'Cable TV',
  LOAN: 'Loan',
}

export const TRANSFER_TYPES: Record<string, string> = {
  TO_OTHER_BANK: 'Other bank',
  TO_MEMPHIS: 'Memphis account',
  INTERNAL: 'Own account',
}

const titleCase = (s: string) => s.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

export const typeLabel = (t: string) => TXN_TYPES[t] ?? TRANSFER_TYPES[t] ?? (t ? titleCase(t) : '—')

export type StatusGroup = 'success' | 'pending' | 'failed' | 'reversed' | 'other'

/** Loans share this list, so their APPROVED/DISBURSED/CLOSED states are grouped with payment states. */
export function statusGroup(status: string): StatusGroup {
  const s = status.toUpperCase()
  if (['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'DISBURSED', 'CLOSED'].includes(s)) return 'success'
  if (['PENDING', 'PROCESSING', 'APPROVED', 'INITIATED'].includes(s)) return 'pending'
  if (['FAILED', 'DECLINED', 'REJECTED', 'CANCELLED'].includes(s)) return 'failed'
  if (s === 'REVERSED') return 'reversed'
  return 'other'
}

export const STATUS_FILTERS = ['SUCCESS', 'PENDING', 'FAILED', 'APPROVED', 'DISBURSED', 'CLOSED']

export type Txn = {
  id: string
  reference: string
  type: string
  typeLabel: string
  status: string
  group: StatusGroup
  amount: number
  fee: number | null
  createdAt: string
  debitAccount: string
  creditAccount: string
  description: string
  customerId: string
  customerName: string
  customerAccount: string
  beneficiaryName: string
  bankName: string
  failureReason: string
  ipAddress: string
  /** Only when the app actually captured it; never a default. */
  location: { lat: number; lng: number } | null
}

export function readTxn(v: unknown): Txn | null {
  if (!isObj(v)) return null
  const id = str(v.id)
  const reference = str(v.reference) || str(v.transactionReference)
  if (!id && !reference) return null
  const c = isObj(v.customer) ? v.customer : {}
  const type = str(v.txnType) || str(v.transferType) || str(v.type)
  const status = str(v.status).toUpperCase()
  const lat = num(v.latitude), lng = num(v.longitude)
  return {
    id: id || reference,
    reference: reference || id,
    type,
    typeLabel: typeLabel(type),
    status,
    group: statusGroup(status),
    amount: num(v.amount) ?? 0,
    fee: num(v.fee),
    createdAt: str(v.createdAt),
    debitAccount: str(v.debitAccount),
    creditAccount: str(v.creditAccount),
    description: str(v.description) || str(v.narration),
    customerId: str(c.id) || str(v.customerId),
    customerName: [str(c.firstName), str(c.lastName)].filter(Boolean).join(' ') || str(c.username),
    customerAccount: str(c.accountNumber),
    beneficiaryName: str(v.beneficiaryName),
    bankName: str(v.bankName),
    failureReason: str(v.failureReason),
    ipAddress: str(v.ipAddress),
    location: lat !== null && lng !== null && !(lat === 0 && lng === 0) ? { lat, lng } : null,
  }
}

export function readTxns(body: unknown): Txn[] {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.content) ? body.content : []
  return list.map(readTxn).filter((t): t is Txn => t !== null)
}

export type TxnSummary = {
  count: number
  byGroup: Record<StatusGroup, { count: number; value: number }>
  byType: { type: string; label: string; count: number; value: number }[]
}

export function summarise(txns: Txn[]): TxnSummary {
  const empty = () => ({ count: 0, value: 0 })
  const byGroup: TxnSummary['byGroup'] = { success: empty(), pending: empty(), failed: empty(), reversed: empty(), other: empty() }
  const types = new Map<string, { type: string; label: string; count: number; value: number }>()
  for (const t of txns) {
    byGroup[t.group].count++
    byGroup[t.group].value += t.amount
    const row = types.get(t.type) ?? { type: t.type, label: t.typeLabel, count: 0, value: 0 }
    row.count++
    // Volume by type counts money that actually moved.
    if (t.group === 'success') row.value += t.amount
    types.set(t.type, row)
  }
  return { count: txns.length, byGroup, byType: [...types.values()].sort((a, b) => b.count - a.count) }
}

export const naira = (n: number | null | undefined) =>
  n === null || n === undefined ? '—' : `₦${n.toLocaleString('en-NG', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`

export const compactNaira = (n: number) =>
  n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : n >= 1_000 ? `₦${Math.round(n / 1_000)}K` : naira(n)

const csvCell = (v: unknown) => {
  const s = String(v ?? '')
  // Prefix formula-like values so a spreadsheet does not execute them.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function transfersCsv(txns: Txn[]) {
  const head = ['Reference', 'Date', 'Status', 'Type', 'Amount', 'Fee', 'Sender', 'Sender account', 'Beneficiary', 'Beneficiary account', 'Bank', 'Narration', 'Failure reason']
  const rows = txns.map(t => [t.reference, t.createdAt, t.status, t.typeLabel, t.amount, t.fee ?? '', t.customerName, t.debitAccount, t.beneficiaryName, t.creditAccount, t.bankName, t.description, t.failureReason])
  return [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
}

// ── Overview analytics ─────────────────────────────────────────

export type Period = 'today' | '7' | '30' | '90' | 'all'

export const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Today' }, { id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '90 days' }, { id: 'all', label: 'All time' },
]

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Start of the period (local time), or null for all time. */
export function periodStart(period: Period, now = new Date()): Date | null {
  if (period === 'all') return null
  const start = startOfDay(now)
  if (period !== 'today') start.setDate(start.getDate() - (Number(period) - 1))
  return start
}

export function inPeriod(txns: Txn[], period: Period, now = new Date()) {
  const start = periodStart(period, now)
  return start ? txns.filter(t => t.createdAt && new Date(t.createdAt) >= start) : txns
}

export type TrendBucket = { key: string; label: string; success: number; pending: number; failed: number; successValue: number; pendingValue: number; failedValue: number }

/** Daily buckets (weekly when the span is over ~9 weeks), with empty days filled so gaps show. */
export function trend(txns: Txn[], period: Period, now = new Date()): TrendBucket[] {
  const dated = txns.filter(t => t.createdAt && !Number.isNaN(new Date(t.createdAt).getTime()))
  const start = periodStart(period, now) ?? (dated.length ? startOfDay(new Date(Math.min(...dated.map(t => new Date(t.createdAt).getTime())))) : startOfDay(now))
  const end = startOfDay(now)
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
  const weekly = spanDays > 63
  const step = weekly ? 7 : 1
  const buckets: TrendBucket[] = []
  const index = new Map<string, TrendBucket>()
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + step)) {
    const b = { key: dayKey(d), label: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + (weekly ? ' wk' : ''), success: 0, pending: 0, failed: 0, successValue: 0, pendingValue: 0, failedValue: 0 }
    buckets.push(b)
    for (let i = 0; i < step; i++) { const x = new Date(d); x.setDate(x.getDate() + i); index.set(dayKey(x), b) }
  }
  for (const t of dated) {
    const b = index.get(dayKey(new Date(t.createdAt)))
    if (!b) continue
    const g = t.group === 'success' ? 'success' : t.group === 'pending' ? 'pending' : t.group === 'other' ? null : 'failed'
    if (!g) continue
    b[g]++
    b[`${g}Value` as 'successValue'] += t.amount
  }
  return buckets
}

/** Transactions per hour of the day (0–23), local time. */
export function byHour(txns: Txn[]) {
  const hours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }))
  for (const t of txns) {
    const d = new Date(t.createdAt)
    if (!Number.isNaN(d.getTime())) hours[d.getHours()].count++
  }
  return hours
}

/** Transfer destinations: other banks by name, Memphis-to-Memphis and own-account grouped. */
export function byDestination(transfers: Txn[]) {
  const m = new Map<string, { label: string; count: number; value: number }>()
  for (const t of transfers) {
    const label = t.type === 'TO_OTHER_BANK' ? (t.bankName || 'Other bank (unknown)') : t.type === 'INTERNAL' ? 'Own account' : 'Memphis accounts'
    const row = m.get(label) ?? { label, count: 0, value: 0 }
    row.count++
    if (t.group === 'success') row.value += t.amount
    m.set(label, row)
  }
  return [...m.values()].sort((a, b) => b.count - a.count)
}

export function failureReasons(txns: Txn[]) {
  const m = new Map<string, number>()
  for (const t of txns) if ((t.group === 'failed' || t.group === 'reversed') && t.failureReason) m.set(t.failureReason, (m.get(t.failureReason) ?? 0) + 1)
  return [...m.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)
}

export function typeStats(txns: Txn[]) {
  const m = new Map<string, { type: string; label: string; count: number; success: number; value: number }>()
  for (const t of txns) {
    const row = m.get(t.type) ?? { type: t.type, label: t.typeLabel, count: 0, success: 0, value: 0 }
    row.count++
    if (t.group === 'success') { row.success++; row.value += t.amount }
    m.set(t.type, row)
  }
  return [...m.values()].map(r => ({ ...r, rate: r.count ? Math.round((r.success / r.count) * 100) : 0 })).sort((a, b) => b.value - a.value || b.count - a.count)
}
