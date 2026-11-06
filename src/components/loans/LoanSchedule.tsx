import { useRef, useState } from 'react'
import { AlertTriangle, CalendarClock, Download, Loader2, Upload } from 'lucide-react'
import moment from 'moment'
import { getLoanSchedule, uploadLoanSchedule } from '../../api'
import {
  canUploadSchedule, hasSchedulePhase, parseScheduleCsv, readSchedule, scheduleTemplate, scheduleToCsv, scheduleTotals,
  type ParsedSchedule, type ScheduleRow,
} from '../../api/loanSchedule'
import type { LoanApp } from '../../api/loans'
import { useApi } from '../../hooks/useApi'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const naira = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const day = (s: string) => (s ? moment(s).format('DD MMM YYYY') : '—')
const ROW_STATUS: Record<string, { label: string; variant: 'green' | 'amber' | 'slate' | 'red' }> = {
  PAID: { label: 'Paid', variant: 'green' }, PARTIALLY_PAID: { label: 'Part paid', variant: 'amber' }, PENDING: { label: 'Pending', variant: 'slate' },
  OVERDUE: { label: 'Overdue', variant: 'red' },
}

export function LoanSchedule({ app, adminId, onUploaded }: { app: LoanApp; adminId: string; onUploaded: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const schedule = useApi(async () => (hasSchedulePhase(app.status) ? readSchedule((await getLoanSchedule(app.id)).data) : []), [app.id, app.status])
  const rows = schedule.data ?? []
  const totals = scheduleTotals(rows)
  const uploadable = canUploadSchedule(app.status)
  // Never offer an upload while the current schedule is unknown: it would skip the replace warning.
  const scheduleKnown = !!schedule.data && !schedule.loading && !schedule.error

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-start gap-3">
          <span className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0"><CalendarClock size={15} /></span>
          <div>
            <h2 className="text-sm font-bold text-slate-700">Repayment schedule</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">What the customer sees and repays against in the app</p>
          </div>
        </div>
        {uploadable && scheduleKnown && (
          <Button size="sm" variant={rows.length ? 'secondary' : 'primary'} onClick={() => setOpen(true)} disabled={!adminId}
            title={adminId ? undefined : 'Sign in again to upload: your admin ID is missing.'}>
            <Upload size={14} /> {rows.length ? 'Replace schedule' : 'Upload schedule'}
          </Button>
        )}
      </div>

      {!hasSchedulePhase(app.status) ? (
        <p className="text-sm text-slate-400">A schedule can be uploaded once the loan is disbursed.</p>
      ) : schedule.loading && !schedule.data ? (
        <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading schedule…</p>
      ) : schedule.error ? (
        <p className="text-sm text-red-600">The schedule could not be loaded: {schedule.error}</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-4 text-sm text-amber-800">
          <p className="font-semibold">No schedule uploaded yet</p>
          <p className="text-xs mt-1">The customer sees no instalments until one is uploaded.{uploadable ? ' Upload the schedule from core banking to show them what to repay and when.' : ''}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <Stat label="Instalments" value={String(rows.length)} />
            <Stat label="Total repayable" value={naira(totals.total)} />
            <Stat label="Outstanding" value={naira(totals.outstanding)} />
            <Stat label="Next due" value={totals.next ? `${day(totals.next.dueDate)}` : 'Fully paid'} sub={totals.next ? naira(totals.next.total - totals.next.paid) : undefined} />
          </div>
          <ScheduleTable rows={rows} showPaid />
        </div>
      )}

      <UploadModal open={open} app={app} adminId={adminId} replacing={rows.length > 0} onClose={() => setOpen(false)}
        onDone={msg => { setOpen(false); schedule.refetch(); onUploaded(msg) }} />
    </section>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800 mt-0.5 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 tabular-nums">{sub}</p>}
    </div>
  )
}

function ScheduleTable({ rows, showPaid }: { rows: ScheduleRow[]; showPaid?: boolean }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-xs tabular-nums">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400">
            <th className="px-1 py-2 font-semibold">#</th><th className="px-1 py-2 font-semibold">Due</th>
            <th className="px-1 py-2 font-semibold text-right">Principal</th><th className="px-1 py-2 font-semibold text-right">Interest</th>
            <th className="px-1 py-2 font-semibold text-right">Total</th>
            {showPaid && <><th className="px-1 py-2 font-semibold text-right">Paid</th><th className="px-1 py-2 font-semibold text-right">Status</th></>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(r => {
            const s = ROW_STATUS[r.status] ?? { label: r.status.toLowerCase().replace(/_/g, ' '), variant: 'slate' as const }
            return (
              <tr key={r.installment} className="text-slate-700">
                <td className="px-1 py-2 text-slate-400">{r.installment}</td>
                <td className="px-1 py-2 whitespace-nowrap">{day(r.dueDate)}</td>
                <td className="px-1 py-2 text-right">{naira(r.principal)}</td>
                <td className="px-1 py-2 text-right">{naira(r.interest)}</td>
                <td className="px-1 py-2 text-right font-semibold">{naira(r.total)}</td>
                {showPaid && <>
                  <td className="px-1 py-2 text-right">{naira(r.paid)}</td>
                  <td className="px-1 py-2 text-right"><Badge label={s.label} variant={s.variant} /></td>
                </>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function UploadModal({ open, app, adminId, replacing, onClose, onDone }: {
  open: boolean; app: LoanApp; adminId: string; replacing: boolean; onClose: () => void; onDone: (msg: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedSchedule | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const principal = app.approved ?? app.requested

  const reset = () => { setFileName(''); setParsed(null); setErr(null); if (input.current) input.current.value = '' }
  const close = () => { if (!busy) { reset(); onClose() } }

  const pick = async (f: File | undefined) => {
    setErr(null); setParsed(null); setFileName(f?.name ?? '')
    if (!f) return
    if (f.size > 1_000_000) { setErr('That file is too large for a repayment schedule (over 1 MB).'); return }
    setParsed(parseScheduleCsv(await f.text(), principal, app.disbursementDate))
  }

  const template = () => {
    const rows = scheduleTemplate(principal, app.tenureMonths || 1, app.monthlyRatePercent ?? 0, app.disbursementDate)
    const url = URL.createObjectURL(new Blob([scheduleToCsv(rows)], { type: 'text/csv' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `schedule-${app.number || app.id}.csv` })
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const upload = async () => {
    if (!parsed || parsed.errors.length || !parsed.rows.length) return
    setBusy(true); setErr(null)
    try {
      await uploadLoanSchedule(app.id, scheduleToCsv(parsed.rows), adminId)
      const next = parsed.rows[0]
      reset()
      onDone(`Schedule uploaded: ${parsed.rows.length} instalments. ${app.customer?.name ?? 'The customer'} was notified; next payment ${naira(next.total)} due ${day(next.dueDate)}.`)
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : 'The schedule could not be uploaded. Please try again.')
    } finally { setBusy(false) }
  }

  const ready = !!parsed && !parsed.errors.length && parsed.rows.length > 0
  return (
    <Modal open={open} onClose={close} title={replacing ? 'Replace repayment schedule' : 'Upload repayment schedule'} width="max-w-2xl"
      footer={
        <div className="space-y-3">
          {err && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{err}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button variant="secondary" className="sm:flex-1 justify-center" onClick={close} disabled={busy}>Cancel</Button>
            <Button className="sm:flex-1 justify-center" onClick={upload} disabled={busy || !ready}>
              {busy && <Loader2 size={14} className="animate-spin" />} {replacing ? 'Replace and notify customer' : 'Upload and notify customer'}
            </Button>
          </div>
        </div>
      }>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          A CSV with 5 columns per instalment: <span className="font-mono text-xs">instalment number, due date (YYYY-MM-DD), principal, interest, total</span>. A header row is optional.
        </p>
        {replacing && (
          <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" /> This deletes the current schedule and replaces it with the file. Payments already recorded against instalments may no longer line up.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer hover:bg-white focus-within:ring-2 focus-within:ring-slate-400">
            <Upload size={14} /> Choose CSV file
            <input ref={input} id="schedule-csv" type="file" accept=".csv,text/csv" className="sr-only" onChange={e => { const f = e.target.files?.[0]; e.currentTarget.value = ''; void pick(f) }} disabled={busy} />
          </label>
          <button type="button" onClick={template} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
            <Download size={13} /> Download a template for this loan
          </button>
          {fileName && <span className="text-xs text-slate-500 truncate max-w-full">{fileName}</span>}
        </div>

        {parsed && parsed.errors.length > 0 && (
          <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 space-y-1">
            <p className="font-semibold">Fix these in the file, then choose it again:</p>
            <ul className="list-disc pl-4 space-y-0.5">{parsed.errors.slice(0, 8).map(e => <li key={e}>{e}</li>)}</ul>
            {parsed.errors.length > 8 && <p>…and {parsed.errors.length - 8} more.</p>}
          </div>
        )}
        {parsed && !parsed.errors.length && parsed.warnings.length > 0 && (
          <ul role="status" className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 space-y-0.5">
            {parsed.warnings.map(w => <li key={w} className="flex gap-2"><AlertTriangle size={13} className="shrink-0 mt-0.5" /> {w}</li>)}
          </ul>
        )}
        {ready && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500">
              Preview: {parsed!.rows.length} instalments, {naira(scheduleTotals(parsed!.rows).total)} in total
            </p>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 px-2"><ScheduleTable rows={parsed!.rows} /></div>
          </div>
        )}
      </div>
    </Modal>
  )
}
