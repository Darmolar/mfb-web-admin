import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Banknote, Briefcase, Check, CheckCircle2, CircleHelp, Clock, FileText, Loader2, Mail,
  MessageSquare, ShieldAlert, UserRound, X as XIcon, XCircle,
} from 'lucide-react'
import moment from 'moment'
import {
  addLoanComment, approveLoanApplication, declineLoanApplication, disburseLoan, getLoanApplicationDetails,
  getLoanApplicationRequirements, getLoanComments, getLoanProductRequirements, getLoanProducts, sendLoanOfferLetter,
} from '../../api'
import { readRequirements } from '../../api/cards'
import {
  DECLINE_REASONS, appRepayment, eligibilityChecks, employmentLabel, loanActions, loanStatus, readLoanApp, readLoanProducts,
  repaymentEstimate, type CheckResult, type LoanApp, type LoanProductRecord,
} from '../../api/loans'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { CardSkeleton, LoadingRegion, Skeleton, StatCardsSkeleton } from '../ui/Skeleton'

const naira = (n: number | null | undefined) => (n == null ? '—' : `₦${n.toLocaleString('en-NG', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`)
const when = (v: string, f = 'DD MMM YYYY, HH:mm') => (v ? moment(v).format(f) : '')
const titleCase = (s: string) => (s ? s.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : '—')
const maskBvn = (b: string) => (b.length > 6 ? `${b.slice(0, 3)}•••••${b.slice(-3)}` : b || '—')
const errText = (e: unknown, f: string) => (e instanceof Error && e.message ? e.message : f)
const inputCls = 'w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'

type Requirement = { key: string; label: string; value: string; isFile: boolean }
type Comment = { id: string; text: string; author: string; at: string }

function readComments(body: unknown): Comment[] {
  const list = Array.isArray(body) ? body : body && typeof body === 'object' && Array.isArray((body as { content?: unknown }).content) ? (body as { content: unknown[] }).content : []
  return list.map((c, i) => {
    const o = (c ?? {}) as Record<string, unknown>
    const s = (k: string) => (typeof o[k] === 'string' ? (o[k] as string) : '')
    return { id: s('id') || String(i), text: s('comment') || s('text') || s('content'), author: s('adminName') || s('authorName') || s('createdBy') || 'Admin', at: s('createdAt') }
  }).filter(c => c.text)
}

export function LoanApplicationDetailsPage() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [reload, setReload] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [action, setAction] = useState<'approve' | 'decline' | 'disburse' | 'offer' | null>(null)

  const { data, loading, error, refetch } = useApi(async () => {
    const [appRes, answers, products] = await Promise.all([
      getLoanApplicationDetails(id),
      getLoanApplicationRequirements(id).then(r => r.data).catch(() => []),
      getLoanProducts().then(r => readLoanProducts(r.data)).catch(() => [] as LoanProductRecord[]),
    ])
    const app = readLoanApp(appRes.data)
    if (!app) throw new Error('This application could not be read.')
    const product = products.find(p => p.code === app.productCode) ?? null
    // Label each answer with the product's own field names where available.
    const fields = product ? await getLoanProductRequirements(product.id).then(r => readRequirements(r.data)).catch(() => []) : []
    const requirements: Requirement[] = (Array.isArray(answers) ? answers : []).map((a: Record<string, unknown>) => {
      const key = String(a.fieldKey ?? a.name ?? a.label ?? 'field')
      const value = String(a.value ?? a.fieldValue ?? a.fileUrl ?? a.content ?? '')
      const field = fields.find(f => f.fieldKey === key)
      return { key, label: field?.label || titleCase(key.replace(/([a-z])([A-Z])/g, '$1_$2')), value, isFile: (a.fieldType ?? field?.fieldType) === 'file' || /^https?:\/\//i.test(value) }
    })
    return { app, product, requirements }
  }, [id, reload])

  const comments = useApi(async () => readComments((await getLoanComments(id)).data), [id])

  if (loading && !data) {
    return (
      <LoadingRegion label="Loading application…" className="space-y-6">
        <Skeleton className="h-4 w-40" />
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-4"><Skeleton className="w-12 h-12 rounded-2xl" /><div className="space-y-2 flex-1"><Skeleton className="h-5 w-56" /><Skeleton className="h-3 w-72" /></div></div>
          <Skeleton className="h-6 w-full" />
        </div>
        <StatCardsSkeleton count={6} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6"><CardSkeleton lines={6} /><CardSkeleton lines={5} /></div>
          <div className="space-y-6"><CardSkeleton lines={8} /><CardSkeleton lines={5} /></div>
        </div>
      </LoadingRegion>
    )
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-sm text-red-500">{error || 'Application not found.'}</p>
        <div className="flex justify-center gap-2">
          <Button variant="secondary" onClick={refetch}>Retry</Button>
          <Button onClick={() => navigate('/loans?tab=applications')}>Back to applications</Button>
        </div>
      </div>
    )
  }

  const { app, product, requirements } = data
  const status = loanStatus(app.status)
  const acts = loanActions(app.status)
  const rep = appRepayment(app)
  const checks = eligibilityChecks(app, product)
  const done = (msg: string) => { setAction(null); setNotice(msg); setReload(n => n + 1) }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/loans?tab=applications')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer">
        <ArrowLeft size={14} /> Loan applications
      </button>

      {/* Header */}
      <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-sm font-black shrink-0">
              {(app.customer?.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800">{app.customer?.name || 'Unknown customer'}</h1>
                <Badge label={status.label} variant={status.variant} size="md" />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-mono">{app.number}</span> · {product?.name ?? app.productCode ?? 'Unknown product'} · Submitted {when(app.createdAt, 'DD MMM YYYY')}
              </p>
              {status.hint && <p className="text-xs text-slate-400 mt-0.5">{status.hint}</p>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {acts.canDecide && (
              <>
                <Button variant="danger" onClick={() => setAction('decline')}><XCircle size={15} /> Decline</Button>
                <Button variant="success" onClick={() => setAction('approve')}><CheckCircle2 size={15} /> Approve</Button>
              </>
            )}
            {acts.canSendOffer && <Button variant="secondary" onClick={() => setAction('offer')}><Mail size={15} /> Send offer letter</Button>}
            {acts.canDisburse && <Button onClick={() => setAction('disburse')}><Banknote size={15} /> Disburse</Button>}
          </div>
        </div>
        <LoanSteps app={app} />
      </section>

      {notice && (
        <div className="text-xs font-semibold rounded-xl px-4 py-3 border bg-emerald-50 border-emerald-100 text-emerald-700 flex justify-between gap-4">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Key figures */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Figure label="Requested" value={naira(app.requested)} />
        <Figure label="Approved" value={app.approved === null ? 'Not yet' : naira(app.approved)} tone={app.approved !== null ? 'green' : undefined} muted={app.approved === null} />
        <Figure label="Tenure" value={app.tenureMonths ? `${app.tenureMonths} months` : '—'} />
        <Figure label="Interest rate" value={app.monthlyRatePercent !== null ? `${app.monthlyRatePercent}% / month` : '—'} />
        <Figure label="Monthly instalment" value={naira(rep?.monthly)} />
        <Figure label="Total repayment" value={naira(rep?.total)} sub={rep ? `${naira(rep.interest)} interest` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <Card icon={<ShieldAlert size={15} />} title="Eligibility & affordability" subtitle={product ? `Checked against ${product.name} rules. Advisory only.` : 'Advisory only.'}>
            <Checks checks={checks} />
          </Card>

          <Card icon={<Briefcase size={15} />} title="Applicant details" subtitle="As entered on the application">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <Item label="Employment" value={employmentLabel(app.employmentType)} />
              <Item label="Occupation" value={app.occupation || '—'} />
              <Item label="Monthly income" value={naira(app.monthlyIncome)} />
              <Item label="Annual income" value={naira(app.annualIncome)} />
              <Item label="Source of funds" value={app.sourceOfFunds || '—'} />
              <Item label="Education" value={titleCase(app.educationLevel)} />
              <Item label="Contact email" value={app.email || '—'} />
            </dl>
          </Card>

          <Card icon={<FileText size={15} />} title="Documents & answers" subtitle={product ? `Requirements configured for ${product.name}` : undefined}>
            {requirements.length === 0 ? (
              <p className="text-sm text-slate-400">No extra documents or answers were required for this application.</p>
            ) : (
              <ul className="divide-y divide-slate-100 -my-2">
                {requirements.map(r => (
                  <li key={r.key} className="py-3 flex items-start justify-between gap-4">
                    <span className="text-sm text-slate-500">{r.label}</span>
                    {r.isFile && /^https?:\/\//i.test(r.value)
                      ? <a href={r.value} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline shrink-0">View file</a>
                      : <span className="text-sm font-semibold text-slate-700 text-right break-all">{r.value || '—'}{r.isFile && r.value && <span className="block text-[11px] font-normal text-slate-400">Upload ID</span>}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card icon={<MessageSquare size={15} />} title="Internal notes" subtitle="Visible to admins only">
            <Notes appId={app.id} comments={comments.data ?? []} loading={comments.loading && !comments.data} error={comments.error} onAdded={comments.refetch} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card icon={<UserRound size={15} />} title="Customer">
            {app.customer ? (
              <div className="space-y-4">
                {app.customer.blocked && (
                  <p className="flex items-start gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <ShieldAlert size={14} className="shrink-0 mt-0.5" /> Transactions blocked{app.customer.blockReason && `: ${app.customer.blockReason}`}
                  </p>
                )}
                <dl className="space-y-2.5">
                  <Row label="Account" value={<span className="font-mono">{app.customer.accountNumber || '—'}</span>} />
                  <Row label="Phone" value={app.customer.phone || '—'} />
                  <Row label="Email" value={app.customer.email || '—'} />
                  <Row label="BVN" value={maskBvn(app.customer.bvn)} />
                  <Row label="KYC tier" value={app.customer.tier ? `Tier ${app.customer.tier}` : '—'} />
                  <Row label="Account status" value={titleCase(app.customer.status)} />
                  <Row label="Core banking" value={app.customer.cbaVerified === null ? '—' : app.customer.cbaVerified ? 'Verified' : 'Not verified'} />
                  <Row label="Customer since" value={app.customer.createdAt ? `${when(app.customer.createdAt, 'DD MMM YYYY')} (${moment(app.customer.createdAt).fromNow(true)})` : '—'} />
                  {app.customer.employer && <Row label="Employer" value={app.customer.employer} />}
                  {app.customer.address && <Row label="Address" value={app.customer.address} />}
                </dl>
              </div>
            ) : <p className="text-sm text-slate-400">Customer details were not returned.</p>}
          </Card>

          <Card icon={<Clock size={15} />} title="Timeline">
            <Timeline app={app} />
          </Card>
        </div>
      </div>

      <DecisionModals app={app} product={product} action={action} onClose={() => setAction(null)} onDone={done} adminId={user?.adminId ?? ''} />
    </div>
  )
}

// ── Pieces ─────────────────────────────────────────────

function LoanSteps({ app }: { app: LoanApp }) {
  const declined = app.status === 'DECLINED' || app.status === 'REJECTED'
  const steps = [
    { label: 'Submitted', done: true },
    { label: declined ? 'Declined' : 'Approved', done: !['PENDING', 'PENDING_REVIEW'].includes(app.status), bad: declined },
    { label: 'Offer accepted', done: app.offerAccepted || ['DISBURSED', 'ACTIVE', 'CLOSED'].includes(app.status) },
    { label: 'Disbursed', done: ['DISBURSED', 'ACTIVE', 'CLOSED'].includes(app.status) },
    { label: 'Closed', done: app.status === 'CLOSED' },
  ].slice(0, declined ? 2 : 5)
  const current = steps.findIndex(s => !s.done)
  return (
    <ol className="flex items-start">
      {steps.map((s, i) => (
        <li key={s.label} className={`flex items-start ${i < steps.length - 1 ? 'flex-1' : ''}`}>
          <div className="flex flex-col items-center gap-1.5 min-w-0">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
              s.bad ? 'bg-red-500 text-white' : s.done ? 'bg-emerald-500 text-white' : i === current ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
              {s.bad ? <XIcon size={13} /> : s.done ? <Check size={13} /> : i + 1}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold text-center whitespace-nowrap ${s.done || i === current ? 'text-slate-700' : 'text-slate-400'}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <span className={`flex-1 h-0.5 mt-3.5 mx-1.5 sm:mx-2 rounded ${s.done && steps[i + 1].done ? 'bg-emerald-400' : 'bg-slate-100'}`} />}
        </li>
      ))}
    </ol>
  )
}

function Checks({ checks }: { checks: CheckResult[] }) {
  const tally = { pass: 0, warn: 0, fail: 0, unknown: 0 }
  checks.forEach(c => { tally[c.result]++ })
  const icon = {
    pass: <CheckCircle2 size={16} className="text-emerald-600" />,
    warn: <AlertTriangle size={16} className="text-amber-500" />,
    fail: <XCircle size={16} className="text-red-600" />,
    unknown: <CircleHelp size={16} className="text-slate-400" />,
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className="rounded-full px-2.5 py-1 bg-emerald-50 text-emerald-700">{tally.pass} passed</span>
        {tally.warn > 0 && <span className="rounded-full px-2.5 py-1 bg-amber-50 text-amber-700">{tally.warn} to review</span>}
        {tally.fail > 0 && <span className="rounded-full px-2.5 py-1 bg-red-50 text-red-700">{tally.fail} failed</span>}
        {tally.unknown > 0 && <span className="rounded-full px-2.5 py-1 bg-slate-100 text-slate-600">{tally.unknown} unknown</span>}
      </div>
      <ul className="space-y-3">
        {checks.map(c => (
          <li key={c.label} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0">{icon[c.result]}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">{c.label}</p>
              <p className="text-xs text-slate-500">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Timeline({ app }: { app: LoanApp }) {
  const items = [
    { label: 'Application submitted', at: app.createdAt },
    app.reviewedAt && { label: app.status === 'DECLINED' || app.status === 'REJECTED' ? 'Declined' : 'Reviewed', at: app.reviewedAt, note: app.declineReason ? `Reason: ${titleCase(app.declineReason)}` : app.adminNotes },
    app.offerAcceptedAt && { label: 'Offer accepted by customer', at: app.offerAcceptedAt },
    app.disbursementDate && { label: 'Disbursed', at: app.disbursementDate, note: app.coreLoanAccount ? `Loan account ${app.coreLoanAccount}` : '' },
    app.nextRepaymentDate && { label: 'Next repayment due', at: app.nextRepaymentDate, future: true },
  ].filter(Boolean) as { label: string; at: string; note?: string; future?: boolean }[]
  return (
    <div className="space-y-4">
      <ol className="relative border-l border-slate-100 ml-1.5 space-y-4">
        {items.map(it => (
          <li key={it.label} className="pl-4 relative">
            <span className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full ${it.future ? 'bg-white border-2 border-slate-300' : 'bg-slate-700'}`} />
            <p className="text-sm font-semibold text-slate-700">{it.label}</p>
            <p className="text-xs text-slate-400">{when(it.at)}</p>
            {it.note && <p className="text-xs text-slate-500 mt-0.5">{it.note}</p>}
          </li>
        ))}
      </ol>
      {!app.reviewedAt && !['PENDING', 'PENDING_REVIEW'].includes(app.status) && (
        <p className="text-[11px] text-slate-400">The backend didn't record who reviewed this application or when.</p>
      )}
    </div>
  )
}

function Notes({ appId, comments, loading, error, onAdded }: { appId: string; comments: { id: string; text: string; author: string; at: string }[]; loading: boolean; error: string | null; onAdded: () => void }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true); setErr(null)
    try { await addLoanComment(appId, text.trim()); setText(''); onAdded() } catch (x) { setErr(errText(x, 'The note could not be saved.')) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-4">
      {loading ? <div className="space-y-2"><Skeleton className="h-3 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
        : error ? <p className="text-xs text-red-500">Could not load notes: {error}</p>
          : comments.length === 0 ? <p className="text-sm text-slate-400">No notes yet. Add context for other reviewers.</p>
            : (
              <ul className="space-y-3">
                {comments.map(c => (
                  <li key={c.id} className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.text}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{c.author}{c.at && ` · ${when(c.at)}`}</p>
                  </li>
                ))}
              </ul>
            )}
      <form onSubmit={add} className="space-y-2">
        <textarea className={`${inputCls} resize-none`} rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="e.g. Called customer to confirm employer; documents verified." />
        {err && <p className="text-xs text-red-600">{err}</p>}
        <div className="flex justify-end">
          <Button size="sm" type="submit" disabled={busy || !text.trim()}>{busy && <Loader2 size={13} className="animate-spin" />} Add note</Button>
        </div>
      </form>
    </div>
  )
}

function DecisionModals({ app, product, action, onClose, onDone, adminId }: {
  app: LoanApp; product: LoanProductRecord | null; action: 'approve' | 'decline' | 'disburse' | 'offer' | null
  onClose: () => void; onDone: (msg: string) => void; adminId: string
}) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [openedFor, setOpenedFor] = useState<string | null>(null)

  // Reset the form each time a decision window opens (approved amount starts at the requested amount).
  if (action && action !== openedFor) {
    setOpenedFor(action)
    setAmount(String(app.requested)); setNotes(''); setReason(''); setEmail(''); setErr(null)
  }
  if (!action && openedFor) setOpenedFor(null)

  const value = Number(amount)
  const est = Number.isFinite(value) && value > 0 ? repaymentEstimate(value, app.monthlyRatePercent, app.tenureMonths) : null
  const amountError = !Number.isFinite(value) || value <= 0 ? 'Enter an amount greater than 0.'
    : value > app.requested ? `Cannot approve more than the ${naira(app.requested)} requested.`
      : product?.minAmount && value < product.minAmount ? `Below the product minimum of ${naira(product.minAmount)}.` : null

  async function run(fn: () => Promise<unknown>, msg: string) {
    setBusy(true); setErr(null)
    try { await fn(); onDone(msg) } catch (x) { setErr(errText(x, 'The action failed.')) } finally { setBusy(false) }
  }

  const footer = (label: string, variant: 'success' | 'danger' | 'primary', disabled: boolean, onClick: () => void) => (
    <div className="space-y-3">
      {err && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{err}</p>}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
        <Button variant="secondary" className="sm:flex-1 justify-center" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant={variant} className="sm:flex-1 justify-center" onClick={onClick} disabled={busy || disabled}>
          {busy && <Loader2 size={14} className="animate-spin" />} {label}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Modal open={action === 'approve'} onClose={onClose} title="Approve loan" width="max-w-lg"
        footer={footer(`Approve ${est ? naira(value) : ''}`, 'success', !!amountError || !notes.trim(), () =>
          run(() => approveLoanApplication(app.id, { adminId, approvedAmount: Number(value.toFixed(2)), notes: notes.trim() }), `Approved ${naira(value)} for ${app.customer?.name ?? 'the customer'}.`))}>
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600">Approved amount</span>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₦</span>
              <input className={`${inputCls} pl-7 text-base font-semibold`} inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <span className={`block text-[11px] ${amountError ? 'text-red-600' : 'text-slate-400'}`}>{amountError ?? `Requested ${naira(app.requested)}. You can approve less.`}</span>
          </label>
          {est && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniFigure label="Monthly" value={naira(est.monthly)} />
              <MiniFigure label="Interest" value={naira(est.interest)} />
              <MiniFigure label="Total repayment" value={naira(est.total)} />
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600">Decision notes <span className="text-red-400">*</span></span>
            <textarea className={`${inputCls} resize-none`} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Meets income and account-age rules; employer confirmed." />
          </label>
        </div>
      </Modal>

      <Modal open={action === 'decline'} onClose={onClose} title="Decline loan" width="max-w-lg"
        footer={footer('Decline application', 'danger', !reason || (reason === 'OTHER' && !notes.trim()), () =>
          run(() => declineLoanApplication(app.id, { adminId, declineReason: reason, notes: notes.trim() }), `Application ${app.number} declined.`))}>
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600">Reason <span className="text-red-400">*</span></span>
            <select className={inputCls} value={reason} onChange={e => setReason(e.target.value)}>
              <option value="">Choose a reason…</option>
              {Object.entries(DECLINE_REASONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600">Notes {reason === 'OTHER' && <span className="text-red-400">*</span>}</span>
            <textarea className={`${inputCls} resize-none`} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Context for the record and the customer" />
          </label>
        </div>
      </Modal>

      <Modal open={action === 'disburse'} onClose={onClose} title="Disburse loan" width="max-w-lg"
        footer={footer(`Disburse ${naira(app.approved ?? app.requested)}`, 'primary', false, () =>
          run(() => disburseLoan(app.id, adminId), `${naira(app.approved ?? app.requested)} disbursed to ${app.customer?.name ?? 'the customer'}.`))}>
        <div className="space-y-4">
          <div className="rounded-xl bg-slate-50 px-4 py-4 text-center">
            <p className="text-xs text-slate-500">Paying out</p>
            <p className="text-3xl font-black text-slate-800">{naira(app.approved ?? app.requested)}</p>
            <p className="text-xs text-slate-500 mt-1">to {app.customer?.name ?? 'customer'} · <span className="font-mono">{app.customer?.accountNumber ?? '—'}</span></p>
          </div>
          {!app.offerAccepted && (
            <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> The customer hasn't accepted the offer yet. Send the offer letter first unless they've agreed another way.
            </p>
          )}
          <p className="text-xs text-slate-500">This moves money into the customer's account and starts repayments. It can't be undone here.</p>
        </div>
      </Modal>

      <Modal open={action === 'offer'} onClose={onClose} title="Send offer letter" width="max-w-lg"
        footer={footer('Send offer letter', 'primary', !!email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()), () =>
          run(() => sendLoanOfferLetter(app.id, { recipientEmail: email.trim() || null }), `Offer letter sent to ${email.trim() || app.email || app.customer?.email || 'the customer'}.`))}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">The customer receives the loan offer to accept in the app.</p>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-600">Send to a different email (optional)</span>
            <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={app.email || app.customer?.email || 'customer@example.com'} />
            <span className="block text-[11px] text-slate-400">Leave empty to use {app.email || app.customer?.email || "the customer's email"}.</span>
          </label>
        </div>
      </Modal>
    </>
  )
}

function Card({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">{icon}</span>
        <div><h2 className="text-sm font-bold text-slate-700">{title}</h2>{subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}</div>
      </div>
      {children}
    </section>
  )
}

function Figure({ label, value, sub, tone, muted }: { label: string; value: string; sub?: string; tone?: 'green'; muted?: boolean }) {
  return (
    <div className={`rounded-2xl border shadow-sm p-4 ${tone === 'green' ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-lg font-black mt-1 tabular-nums ${muted ? 'text-slate-400' : tone === 'green' ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}

function MiniFigure({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-2 py-2.5"><p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p><p className="text-sm font-bold text-slate-800 tabular-nums">{value}</p></div>
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="min-w-0"><dt className="text-[11px] text-slate-400">{label}</dt><dd className="text-sm font-semibold text-slate-700 break-words">{value}</dd></div>
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-4 text-sm"><dt className="text-slate-400 shrink-0">{label}</dt><dd className="text-slate-700 font-medium text-right break-words min-w-0">{value}</dd></div>
}
