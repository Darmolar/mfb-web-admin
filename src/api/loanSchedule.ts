// Loan repayment schedules: read the API rows, and check an admin's CSV before upload.
//   GET  /v1/bank-admin/loans/applications/{id}/schedule
//   POST /v1/bank-admin/loans/applications/{id}/schedule/csv  (DISBURSED loans only; replaces the schedule)

export type ScheduleRow = {
  installment: number
  dueDate: string
  principal: number
  interest: number
  total: number
  paid: number
  status: string
  paidAt: string
}

export const SCHEDULE_CSV_HEADER = 'installment_number,due_date,principal_due,interest_due,total_due'

/** The upload endpoint only accepts loans in this state; it answers 409 otherwise. */
export const canUploadSchedule = (status: string) => status === 'DISBURSED'
/** Loans that have been paid out can have a schedule to show. */
export const hasSchedulePhase = (status: string) => ['DISBURSED', 'ACTIVE', 'CLOSED'].includes(status)

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : 0)
const str = (v: unknown) => (typeof v === 'string' ? v : '')

export function readSchedule(body: unknown): ScheduleRow[] {
  const list = Array.isArray(body) ? body : []
  return list.map(r => {
    const o = (r ?? {}) as Record<string, unknown>
    return {
      installment: num(o.installmentNumber), dueDate: str(o.dueDate), principal: num(o.principalDue), interest: num(o.interestDue),
      total: num(o.totalDue), paid: num(o.amountPaid), status: str(o.status).toUpperCase() || 'PENDING', paidAt: str(o.paidAt),
    }
  }).sort((a, b) => a.installment - b.installment)
}

export function scheduleTotals(rows: ScheduleRow[]) {
  const unpaid = rows.filter(r => r.status !== 'PAID')
  return {
    principal: round2(rows.reduce((s, r) => s + r.principal, 0)),
    interest: round2(rows.reduce((s, r) => s + r.interest, 0)),
    total: round2(rows.reduce((s, r) => s + r.total, 0)),
    paid: round2(rows.reduce((s, r) => s + r.paid, 0)),
    outstanding: round2(unpaid.reduce((s, r) => s + r.total - r.paid, 0)),
    next: unpaid.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null,
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100
const DATE = /^\d{4}-\d{2}-\d{2}$/
const validDate = (s: string) => DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s
const AMOUNT = /^\d+(\.\d{1,2})?$/

/** Splits one CSV line, honouring quoted cells ("10,000.00") and dropping trailing empty cells from spreadsheet exports. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = '', quoted = false
  for (let k = 0; k < line.length; k++) {
    const ch = line[k]
    if (ch === '"') { if (quoted && line[k + 1] === '"') { cur += '"'; k++ } else quoted = !quoted }
    else if (ch === ',' && !quoted) { cells.push(cur.trim()); cur = '' }
    else cur += ch
  }
  cells.push(cur.trim())
  while (cells.length > 5 && cells[cells.length - 1] === '') cells.pop()
  return cells
}

const isHeader = (cells: string[]) => /installment|instalment|due|principal/i.test(cells.join(' ')) && !/^\d+$/.test(cells[0] ?? '')

export type ParsedSchedule = { rows: ScheduleRow[]; errors: string[]; warnings: string[] }

/**
 * Checks a schedule CSV the way the backend reads it (5 columns, optional header) and
 * reports every problem by line, so nothing reaches the customer half-right.
 */
export function parseScheduleCsv(text: string, expectedPrincipal?: number | null, disbursedOn?: string): ParsedSchedule {
  const errors: string[] = [], warnings: string[] = [], rows: ScheduleRow[] = []
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l, i) => ({ n: i + 1, cells: splitCsvLine(l) }))
    .filter(l => l.cells.some(c => c !== ''))
  // 5: only a row that names the columns is a header; anything else is checked as data.
  if (lines.length && isHeader(lines[0].cells)) lines.shift()
  if (!lines.length) return { rows, errors: ['The file has no instalment rows.'], warnings }

  for (const { n, cells } of lines) {
    if (cells.length !== 5) { errors.push(`Line ${n}: expected 5 columns, found ${cells.length}.`); continue }
    const [inst, due, p, i, t] = cells
    const lineErrors: string[] = []
    if (!/^\d+$/.test(inst) || Number(inst) < 1) lineErrors.push('instalment number must be a whole number from 1')
    if (!validDate(due)) lineErrors.push(`due date "${due}" must be a real date written YYYY-MM-DD`)
    for (const [label, v] of [['principal', p], ['interest', i], ['total', t]] as const) {
      if (!AMOUNT.test(v)) lineErrors.push(`${label} "${v}" must be an amount like 12500.00 (remove ₦ and thousand separators)`)
    }
    if (!lineErrors.length && Number(t) <= 0) lineErrors.push('total must be more than 0')
    if (!lineErrors.length && Math.abs(Number(p) + Number(i) - Number(t)) > 0.01) {
      lineErrors.push(`total ${t} is not principal + interest (${round2(Number(p) + Number(i)).toFixed(2)})`)
    }
    if (lineErrors.length) { errors.push(`Line ${n}: ${lineErrors.join('; ')}.`); continue }
    rows.push({ installment: Number(inst), dueDate: due, principal: Number(p), interest: Number(i), total: Number(t), paid: 0, status: 'PENDING', paidAt: '' })
  }

  const numbers = rows.map(r => r.installment).sort((a, b) => a - b)
  const dupes = [...new Set(numbers.filter((x, k) => numbers.indexOf(x) !== k))]
  if (dupes.length) errors.push(`Instalment number${dupes.length > 1 ? 's' : ''} ${dupes.join(', ')} appear${dupes.length > 1 ? '' : 's'} more than once.`)
  else if (!errors.length && numbers.some((x, k) => x !== k + 1)) errors.push('Instalments must be numbered 1, 2, 3… with no gaps.')

  const byNumber = rows.slice().sort((a, b) => a.installment - b.installment)
  if (byNumber.some((r, k) => k > 0 && r.dueDate <= byNumber[k - 1].dueDate)) warnings.push('Due dates are not in increasing order of instalment number.')
  const disbursedDay = (disbursedOn || '').slice(0, 10)
  if (validDate(disbursedDay) && byNumber.some(r => r.dueDate <= disbursedDay)) warnings.push(`Some due dates are on or before the disbursement date (${disbursedDay}).`)
  const principal = round2(rows.reduce((s, r) => s + r.principal, 0))
  if (expectedPrincipal && rows.length && !errors.length && Math.abs(principal - expectedPrincipal) > 0.01) {
    warnings.push(`Principal adds up to ₦${principal.toLocaleString('en-NG')}, but the approved amount is ₦${expectedPrincipal.toLocaleString('en-NG')}.`)
  }
  return { rows: byNumber, errors, warnings }
}

/** The file actually sent: always with a header, so it reads the same whether or not the server skips line 1. */
export function scheduleToCsv(rows: ScheduleRow[]): string {
  return [SCHEDULE_CSV_HEADER, ...rows.map(r => [r.installment, r.dueDate, r.principal.toFixed(2), r.interest.toFixed(2), r.total.toFixed(2)].join(','))].join('\n') + '\n'
}

/**
 * A starting template: flat-rate monthly instalments (the product's own maths) from the
 * month after disbursement. The admin edits it to match the core banking schedule.
 */
export function scheduleTemplate(amount: number, months: number, monthlyRatePercent: number, start: string): ScheduleRow[] {
  if (!(amount > 0) || !(months >= 1)) return []
  const base = new Date(`${(start || new Date().toISOString()).slice(0, 10)}T00:00:00Z`)
  const interest = round2(amount * monthlyRatePercent / 100)
  const principal = round2(amount / months)
  return Array.from({ length: months }, (_, k) => {
    const d = new Date(base); d.setUTCMonth(d.getUTCMonth() + k + 1)
    if (d.getUTCDate() !== base.getUTCDate()) d.setUTCDate(0) // 31 Jan + 1 month → 28/29 Feb
    const p = k === months - 1 ? round2(amount - principal * (months - 1)) : principal
    return { installment: k + 1, dueDate: d.toISOString().slice(0, 10), principal: p, interest, total: round2(p + interest), paid: 0, status: 'PENDING', paidAt: '' }
  })
}
