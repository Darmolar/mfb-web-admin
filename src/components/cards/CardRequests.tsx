import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronRight, CreditCard, Eye, Loader2, RefreshCw, Search, Truck, UserRound, Wallet, X as XIcon } from 'lucide-react'
import moment from 'moment'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { dispatchCardRequest, getCardRequests, updateCardRequestStatus } from '../../api'
import {
  CARD_STATUS, cardRequestActions, maskBvn, naira, readCardRequests, type CardRequestRecord,
} from '../../api/cards'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { LoadingRegion, Skeleton } from '../ui/Skeleton'

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300'
const when = (v: string, fmt = 'DD MMM YYYY, HH:mm') => (v ? moment(v).format(fmt) : '—')
const statusInfo = (s: string) => CARD_STATUS[s] ?? { variant: 'slate' as const, label: s.charAt(0) + s.slice(1).toLowerCase(), hint: '' }

export function CardRequests() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('ALL')
  const [mobileSearch, setMobileSearch] = useState('')
  const [view, setView] = useState<CardRequestRecord | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [comment, setComment] = useState('')
  const [courierRef, setCourierRef] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const { data, loading, error, refetch } = useApi(async () => readCardRequests((await getCardRequests({ size: '100' })).data), [])
  // Placeholders only on the first load; a refresh keeps the current list on screen.
  const initialLoad = loading && !data
  const all = useMemo(() => data?.requests ?? [], [data])

  const counts = useMemo(() => all.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {}), [all])
  // Statuses that need the bank's action first, then the rest in a sensible order.
  const order = ['REQUESTED', 'PENDING', 'APPROVED', 'ISSUED', 'DELIVERED', 'ACTIVE', 'FROZEN', 'REJECTED', 'TERMINATED']
  const statuses = Object.keys(counts).sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
  const rows = filter === 'ALL' ? all : all.filter(r => r.status === filter)
  const term = mobileSearch.trim().toLowerCase()
  const mobileRows = term
    ? rows.filter(r => [r.customerName, r.linkedAccount, r.reference, r.productName, r.customerPhone].join(' ').toLowerCase().includes(term))
    : rows

  function open(r: CardRequestRecord) {
    setView(r)
    setDecision(null)
    setComment('')
    setCourierRef('')
    setDeliveryDate('')
    setActionError(null)
  }

  async function act(fn: () => Promise<unknown>, done: string) {
    setBusy(true)
    setActionError(null)
    try {
      await fn()
      setNotice({ ok: true, text: done })
      setView(null)
      refetch()
    } catch (err) {
      setActionError(err instanceof Error && err.message ? err.message : 'The action failed.')
    } finally {
      setBusy(false)
    }
  }

  const columns: ColumnDef<CardRequestRecord>[] = [
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: r => (
        <div className="min-w-[160px]">
          <p className="font-semibold text-slate-700">{r.customerName}</p>
          <p className="text-[11px] text-slate-400 font-mono">{r.linkedAccount || r.customerUsername || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Card',
      accessorKey: 'productName',
      cell: r => (
        <div className="min-w-[150px]">
          <p className="text-xs font-semibold text-slate-700">{r.productName}</p>
          <p className="text-[11px] text-slate-400">{r.maskedPan || r.cardType || ''}</p>
        </div>
      ),
    },
    {
      header: 'Fee',
      accessorKey: 'issuanceFee',
      cell: r => (
        <div className="text-xs whitespace-nowrap">
          <p className="text-slate-700">{naira(r.issuanceFee)}</p>
          <p className={r.feePaid ? 'text-emerald-600' : 'text-amber-600'}>{r.feePaid ? 'Paid' : 'Not paid'}</p>
        </div>
      ),
    },
    {
      header: 'Delivery',
      accessorKey: 'deliveryAddress',
      cell: r => <span className="text-xs text-slate-500 line-clamp-2 max-w-[220px]">{r.deliveryAddress || 'Branch pickup'}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: r => <Badge label={statusInfo(r.status).label} variant={statusInfo(r.status).variant} />,
    },
    {
      header: 'Requested',
      accessorKey: 'createdAt',
      cell: r => <span className="text-xs text-slate-400 whitespace-nowrap">{when(r.createdAt, 'DD MMM YYYY')}</span>,
    },
    {
      header: '',
      sortable: false,
      cell: r => {
        const { canDecide, canDispatch } = cardRequestActions(r.status)
        return (
          <Button size="sm" variant={canDecide || canDispatch ? 'primary' : 'secondary'} onClick={() => open(r)}>
            <Eye size={13} /> {canDecide ? 'Review' : canDispatch ? 'Dispatch' : 'View'}
          </Button>
        )
      },
    },
  ]

  const actions = view ? cardRequestActions(view.status) : { canDecide: false, canDispatch: false }
  // Other open requests from the same customer for the same product: likely double taps in the app.
  const duplicates = view
    ? all.filter(r => r.id !== view.id && r.customerId === view.customerId && r.productName === view.productName
        && cardRequestActions(r.status).canDecide).length
    : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Customer card requests</h3>
          <p className="text-xs text-slate-500 mt-0.5">Approve new requests, record dispatch, and look up any card a customer has asked for.</p>
        </div>
        <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer" title="Refresh"><RefreshCw size={13} /></button>
      </div>

      {notice && (
        <div className={`text-xs font-semibold rounded-xl px-4 py-3 border flex justify-between gap-4 ${notice.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 cursor-pointer">Dismiss</button>
        </div>
      )}

      {initialLoad && (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit" aria-hidden="true">
          {['w-14', 'w-24', 'w-16', 'w-16'].map((w, i) => <Skeleton key={i} className={`h-7 rounded-lg ${w}`} />)}
        </div>
      )}
      {!error && all.length > 0 && (
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          {['ALL', ...statuses].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${filter === s ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {s === 'ALL' ? 'All' : statusInfo(s).label}
              <span className="ml-1.5 text-[10px] text-slate-400">{s === 'ALL' ? all.length : counts[s]}</span>
            </button>
          ))}
        </div>
      )}

      {initialLoad && (
        // Phone placeholder mirrors the stacked request cards below.
        <LoadingRegion label="Loading card requests…" className="sm:hidden space-y-3">
          <Skeleton className="h-11 w-full rounded-xl" />
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
              <div className="flex items-center justify-between gap-2"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="h-4 w-16 rounded-full" /></div>
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
          ))}
        </LoadingRegion>
      )}
      {error && (
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-red-500 mb-3">{error}</p>
          <Button size="sm" variant="secondary" onClick={refetch}>Retry</Button>
        </div>
      )}
      {!initialLoad && !error && (
        // Phones get a stacked list so status and the action stay visible without sideways scrolling.
        <div className="sm:hidden space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={mobileSearch}
              onChange={e => setMobileSearch(e.target.value)}
              placeholder="Search name, account, reference…"
              className="w-full pl-9 pr-3 py-2.5 text-base bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          {mobileRows.length === 0 && <p className="text-center text-xs text-slate-400 py-8">No matching requests.</p>}
          {mobileRows.map(r => {
            const { canDecide, canDispatch } = cardRequestActions(r.status)
            return (
              <button key={r.id} onClick={() => open(r)} className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 cursor-pointer active:bg-slate-50">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-800 truncate">{r.customerName}</p>
                    <Badge label={statusInfo(r.status).label} variant={statusInfo(r.status).variant} />
                  </div>
                  <p className="text-xs text-slate-500 truncate">{r.productName}{r.maskedPan && ` · ${r.maskedPan.slice(-4)}`}</p>
                  <p className="text-[11px] text-slate-400">
                    {naira(r.issuanceFee)} <span className={r.feePaid ? 'text-emerald-600' : 'text-amber-600'}>{r.feePaid ? 'paid' : 'not paid'}</span> · {when(r.createdAt, 'DD MMM')}
                  </p>
                  {(canDecide || canDispatch) && <p className="text-[11px] font-bold text-slate-700">{canDecide ? 'Needs review' : 'Ready to dispatch'}</p>}
                </div>
                <ChevronRight size={16} className="text-slate-300 shrink-0" />
              </button>
            )
          })}
        </div>
      )}
      {!error && (
        <div className="hidden sm:block">
        <DataTable<CardRequestRecord>
          columns={columns}
          data={rows}
          loading={initialLoad}
          searchPlaceholder="Search name, account, reference…"
          searchFields={['customerName', 'linkedAccount', 'reference', 'productName', 'customerUsername', 'customerPhone']}
          emptyMessage={filter === 'ALL' ? 'No card requests yet.' : `No ${statusInfo(filter).label.toLowerCase()} requests.`}
        />
        </div>
      )}

      <Modal
        open={!!view}
        onClose={() => setView(null)}
        title="Card request"
        width="max-w-3xl"
        footer={view && (actions.canDecide || actions.canDispatch) ? (
          <div className="space-y-3">
            {actions.canDecide && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Choice
                    active={decision === 'APPROVED'}
                    tone="green"
                    icon={<Check size={16} />}
                    title="Approve"
                    text="Send for printing"
                    onClick={() => { setDecision('APPROVED'); setComment('') }}
                  />
                  <Choice
                    active={decision === 'REJECTED'}
                    tone="red"
                    icon={<XIcon size={16} />}
                    title="Reject"
                    text="Give a reason"
                    onClick={() => { setDecision('REJECTED'); setComment('') }}
                  />
                </div>
                {decision && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {(decision === 'APPROVED' ? APPROVE_NOTES : REJECT_NOTES).map(note => (
                        <button
                          key={note}
                          type="button"
                          onClick={() => setComment(note)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer ${comment === note ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                        >
                          {note}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className={`${inputCls} resize-none`}
                      rows={2}
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder={decision === 'APPROVED' ? 'Comment for the record' : 'Reason (shared with the customer)'}
                    />
                    <Button
                      fullWidth
                      variant={decision === 'APPROVED' ? 'success' : 'danger'}
                      disabled={busy || !comment.trim()}
                      onClick={() => act(
                        () => updateCardRequestStatus(view.id, decision, user!.adminId, comment.trim()),
                        `${view.customerName}'s request ${decision === 'APPROVED' ? 'approved' : 'rejected'}.`,
                      )}
                      className="justify-center py-2.5"
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : decision === 'APPROVED' ? <Check size={14} /> : <XIcon size={14} />}
                      {decision === 'APPROVED' ? `Approve ${view.productName}` : 'Reject this request'}
                    </Button>
                  </div>
                )}
              </>
            )}

            {actions.canDispatch && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Truck size={15} /> Record dispatch</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">Courier reference</span>
                    <input className={inputCls} value={courierRef} onChange={e => setCourierRef(e.target.value)} placeholder="e.g. DHL-NG-2026-443322" />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">Expected delivery</span>
                    <input type="date" className={inputCls} value={deliveryDate} min={moment().format('YYYY-MM-DD')} onChange={e => setDeliveryDate(e.target.value)} />
                  </label>
                </div>
                <Button
                  fullWidth
                  className="justify-center py-2.5"
                  disabled={busy || !courierRef.trim() || !deliveryDate}
                  onClick={() => act(
                    () => dispatchCardRequest(view.id, { adminId: user!.adminId, courierReference: courierRef.trim(), expectedDeliveryDate: deliveryDate }),
                    `Dispatch recorded for ${view.customerName}.`,
                  )}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />} Record dispatch &amp; notify customer
                </Button>
              </div>
            )}

            {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{actionError}</p>}
          </div>
        ) : undefined}
      >
        {view && (
          <div>
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="w-11 h-11 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-sm font-black shrink-0">
                  {initials(view.customerName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base sm:text-lg font-bold text-slate-800 truncate">{view.customerName}</p>
                    <Badge label={statusInfo(view.status).label} variant={statusInfo(view.status).variant} size="md" />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {view.reference ? <>Ref <span className="font-mono text-slate-500">{view.reference}</span> · </> : null}
                    Requested {when(view.createdAt)}
                  </p>
                </div>
              </div>

              <StatusSteps status={view.status} />

              {/* Warnings that matter for the decision */}
              {(!view.feePaid || duplicates > 0) && (
                <div className="space-y-2">
                  {!view.feePaid && (
                    <Alert>The {naira(view.issuanceFee)} issuance fee has not been paid yet.</Alert>
                  )}
                  {duplicates > 0 && (
                    <Alert>
                      This customer has {duplicates} other open request{duplicates > 1 ? 's' : ''} for the same card. Check it isn't a duplicate.
                    </Alert>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,15rem)_1fr] gap-4">
                <CardPreview request={view} />
                <InfoPanel icon={<UserRound size={14} />} title="Customer" rows={[
                  ['Username', view.customerUsername || '—'],
                  ['Phone', view.customerPhone || '—'],
                  ['Email', view.customerEmail || '—'],
                  ['BVN', view.customerBvn ? maskBvn(view.customerBvn) : '—'],
                  ['Account tier', view.customerTier ? `Tier ${view.customerTier}` : '—'],
                ]} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoPanel icon={<Wallet size={14} />} title="Fees & daily limits" rows={[
                  ['Issuance fee', <span key="fee" className="inline-flex items-center gap-2">{naira(view.issuanceFee)} <FeeChip paid={view.feePaid} /></span>],
                  ['ATM', naira(view.atmLimit)],
                  ['POS', naira(view.posLimit)],
                  ['Web / online', naira(view.webLimit)],
                ]} />
                <InfoPanel icon={<Truck size={14} />} title="Delivery & timeline" rows={[
                  ['Deliver to', view.deliveryAddress || 'Branch pickup'],
                  ['Courier ref.', view.courierReference || '—'],
                  ['Dispatched', when(view.dispatchedAt)],
                  ['Expected', when(view.expectedDeliveryDate, 'DD MMM YYYY')],
                  ['Activated', when(view.activatedAt)],
                ]} />
              </div>
            </div>

          </div>
        )}
      </Modal>
    </div>
  )
}

const APPROVE_NOTES = ['Approved for printing', 'Customer details verified']
const REJECT_NOTES = ['Issuance fee not paid', 'Delivery address incomplete', 'Duplicate request']

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

const STEPS = ['Requested', 'Approved', 'Dispatched', 'Active']
const STEP_INDEX: Record<string, number> = { REQUESTED: 0, PENDING: 0, APPROVED: 1, REJECTED: 1, ISSUED: 2, DELIVERED: 2, ACTIVE: 3, FROZEN: 3, TERMINATED: 3 }

/** Where the request is in its life: rejected stops at step 2; frozen/terminated replace the last step. */
function StatusSteps({ status }: { status: string }) {
  const at = STEP_INDEX[status] ?? 0
  const labels = STEPS.map((l, i) =>
    i === 1 && status === 'REJECTED' ? 'Rejected' : i === 3 && (status === 'FROZEN' || status === 'TERMINATED') ? statusInfo(status).label : l)
  const bad = status === 'REJECTED' || status === 'TERMINATED'
  return (
    <ol className="flex items-center">
      {labels.map((label, i) => {
        const done = i < at || (i === at && status !== 'REQUESTED' && status !== 'PENDING')
        const current = i === at
        const dot = current && bad ? 'bg-red-500 text-white' : current && status === 'FROZEN' ? 'bg-slate-500 text-white'
          : done ? 'bg-emerald-500 text-white' : current ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-400'
        return (
          <li key={label} className={`flex items-center ${i < labels.length - 1 ? 'flex-1' : ''}`}>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${dot}`}>
                {done && !bad ? <Check size={12} /> : current && bad ? <XIcon size={12} /> : i + 1}
              </span>
              <span className={`text-[10px] sm:text-[11px] font-semibold whitespace-nowrap ${current ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
            </div>
            {i < labels.length - 1 && <span className={`flex-1 h-0.5 mx-1.5 sm:mx-2 mb-4 rounded ${i < at ? 'bg-emerald-400' : 'bg-slate-100'}`} />}
          </li>
        )
      })}
    </ol>
  )
}

const SCHEME_STYLE: Record<string, string> = {
  VERVE: 'from-emerald-700 to-emerald-900',
  MASTERCARD: 'from-slate-700 to-slate-900',
  VISA: 'from-indigo-700 to-indigo-950',
}

function CardPreview({ request }: { request: CardRequestRecord }) {
  const last4 = request.maskedPan ? request.maskedPan.replace(/\D/g, '').slice(-4) : ''
  return (
    <div className={`relative rounded-2xl p-4 text-white bg-gradient-to-br ${SCHEME_STYLE[request.cardType] ?? 'from-slate-600 to-slate-800'} aspect-[1.586] w-full max-w-[17rem] mx-auto md:mx-0 shadow-md flex flex-col justify-between overflow-hidden`}>
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="flex items-start justify-between relative">
        <div className="pr-2">
          <p className="text-[11px] font-semibold text-white/80 leading-tight">{request.productName}</p>
          {!request.maskedPan && <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-widest bg-white/15 rounded px-1.5 py-0.5">Not yet issued</span>}
        </div>
        <CreditCard size={18} className="text-white/70 shrink-0" />
      </div>
      <p className="font-mono text-base tracking-widest relative">•••• •••• •••• {last4 || '••••'}</p>
      <div className="flex items-end justify-between relative text-[10px]">
        <div>
          <p className="text-white/60 uppercase tracking-wider">Linked account</p>
          <p className="font-mono text-xs">{request.linkedAccount || '—'}</p>
        </div>
        <div className="text-right">
          {request.expiry && <p className="font-mono text-xs">{request.expiry}</p>}
          <p className="font-black tracking-wider text-xs">{request.cardType || 'CARD'}</p>
        </div>
      </div>
    </div>
  )
}

function InfoPanel({ icon, title, rows }: { icon: React.ReactNode; title: string; rows: [string, React.ReactNode][] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
      <p className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
        <span className="w-6 h-6 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-500">{icon}</span>
        {title}
      </p>
      <dl className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 text-sm">
            <dt className="text-slate-400 shrink-0">{label}</dt>
            <dd className="text-slate-700 font-medium text-right break-words min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function FeeChip({ paid }: { paid: boolean }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  )
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  )
}

function Choice({ active, tone, icon, title, text, onClick }: {
  active: boolean; tone: 'green' | 'red'; icon: React.ReactNode; title: string; text: string; onClick: () => void
}) {
  const on = tone === 'green' ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100' : 'border-red-500 bg-red-50 text-red-800 ring-2 ring-red-100'
  const iconOn = tone === 'green' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-3 text-left rounded-xl border px-3 py-2.5 sm:py-3 transition-colors cursor-pointer ${active ? on : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
    >
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? iconOn : 'bg-slate-100 text-slate-500'}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{title}</span>
        <span className="block text-[11px] opacity-70 truncate">{text}</span>
      </span>
    </button>
  )
}
