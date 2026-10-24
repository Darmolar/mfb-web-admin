import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeftRight, ArrowRight, Banknote, CheckCircle2, ChevronRight, Clock, PiggyBank, RefreshCw, ShieldAlert, ShieldCheck,
  Users, XCircle,
} from 'lucide-react'
import moment from 'moment'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import {
  getComplianceStats, getCustomers, getDashboardSummary, getFeeSummary, getKycPending, getKycStats, getLoanApplications,
  getSavingsGoals, getTransactions,
} from '../../api'
import { allPages } from '../../api/pagination'
import { buildInbox, badgeCount } from '../../api/inbox'
import { readLoanApps } from '../../api/loans'
import { readSavingsGoals } from '../../api/savings'
import { compactNaira, inPeriod, naira, readTxns, trend, type TrendBucket, type Txn } from '../../api/transactions'
import {
  greeting, joinedSince, loanPipeline, readKycPending, readOverviewCustomers, readSummary, savingsTotals, tierBreakdown,
} from '../../api/overview'
import { INBOX_SOURCES } from '../layout/inboxSources'
import { Skeleton } from '../ui/Skeleton'

// Status colours are reserved for state and always shown with an icon and a label.
const STATUS = {
  success: { color: '#0ca30c', label: 'Successful' },
  pending: { color: '#fab219', label: 'Pending' },
  failed: { color: '#d03b3b', label: 'Failed' },
} as const
const SERIES = '#2a78d6'
type TrendPeriod = '7' | '30' | '90'

export function OverviewPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<TrendPeriod>('30')

  // Each source loads on its own so one slow or failing endpoint never blanks the page.
  const summary = useApi(async () => readSummary((await getDashboardSummary()).data), [])
  const inbox = useApi(() => buildInbox(INBOX_SOURCES), [])
  const kyc = useApi(async () => (await getKycStats()).data, [])
  const compliance = useApi(async () => (await getComplianceStats()).data, [])
  const kycPending = useApi(async () => readKycPending((await getKycPending()).data), [])
  const customers = useApi(async () => readOverviewCustomers(await allPages(page => getCustomers({ page, size: 100 }))), [])
  const transfers = useApi(async () => readTxns(await allPages(page => getTransactions({ page, size: 100 }))), [])
  const loans = useApi(async () => readLoanApps((await getLoanApplications({ size: 100 })).data), [])
  const goals = useApi(async () => readSavingsGoals((await getSavingsGoals({ size: 100 })).data), [])
  const fees = useApi(() => getFeeSummary(), [])

  const refreshAll = () => {
    for (const x of [summary, inbox, kyc, compliance, kycPending, customers, transfers, loans, goals, fees]) void x.refetch()
  }
  const refreshing = [summary, inbox, kyc, compliance, kycPending, customers, transfers, loans, goals, fees].some(x => x.loading)

  const s = summary.data
  const cs = useMemo(() => customers.data ?? [], [customers.data])
  const txns = useMemo(() => transfers.data ?? [], [transfers.data])
  const pipeline = useMemo(() => loanPipeline(loans.data ?? []), [loans.data])
  const saving = useMemo(() => savingsTotals(goals.data ?? []), [goals.data])

  const tx = useMemo(() => {
    const inRange = inPeriod(txns, period)
    const ok = inRange.filter(t => t.group === 'success')
    const bad = inRange.filter(t => t.group === 'failed' || t.group === 'reversed')
    const decided = ok.length + bad.length
    return {
      buckets: trend(inRange, period),
      count: inRange.length,
      value: ok.reduce((n, t) => n + t.amount, 0),
      rate: decided ? Math.round((ok.length / decided) * 100) : null,
      failed: bad.length,
      recent: [...txns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
      last: txns.reduce((m, t) => (t.createdAt > m ? t.createdAt : m), ''),
    }
  }, [txns, period])

  const firstName = user?.name?.split(/\s+/)[0] ?? ''
  const joined7 = joinedSince(cs, 7)
  const tiers = tierBreakdown(cs)
  const blocked = cs.filter(c => c.blocked).length
  const newest = [...cs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800">{greeting()}{firstName && `, ${firstName}`}</h1>
          <p className="text-sm text-slate-500">{moment().format('dddd, D MMMM YYYY')} · here is how the bank is doing.</p>
        </div>
        <button onClick={refreshAll} disabled={refreshing}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg px-3 py-1.5 cursor-pointer disabled:opacity-60">
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Needs attention */}
      <Panel title="Needs your attention" subtitle="Work waiting for a decision across the bank">
        {inbox.error && !inbox.data ? <Unavailable what="Pending work" /> : !inbox.data ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : inbox.data.items.length === 0 && inbox.data.failed.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
            <CheckCircle2 size={16} /> All clear. No reviews, approvals or complaints are waiting.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {inbox.data.items.map(item => (
              <Link key={item.key} to={item.to} className="group flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/60 hover:bg-amber-50 px-3 py-3">
                <span className="min-w-[2.5rem] h-10 px-2 rounded-lg bg-white text-amber-700 text-lg font-black flex items-center justify-center shadow-sm">{badgeCount(item.count)}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-800">{item.label}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{item.hint}</span>
                </span>
                <ArrowRight size={15} className="text-amber-700 opacity-60 group-hover:opacity-100 shrink-0" />
              </Link>
            ))}
          </div>
        )}
        {inbox.data && inbox.data.failed.length > 0 && (
          <p className="mt-3 text-[11px] text-slate-500">
            Couldn't check {inbox.data.failed.join(', ').toLowerCase()}, so there may be more waiting. Use Refresh to try again.
          </p>
        )}
      </Panel>

      {/* Key figures */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi to="/customers" icon={<Users size={16} />} label="Customers" loading={!s && !customers.data} failed={!!summary.error && !!customers.error}
          value={String(s?.totalCustomers ?? cs.length)} sub={customers.data ? `${joined7} joined this week` : 'Join dates unavailable'} />
        <Kpi to="/customers" icon={<CheckCircle2 size={16} />} label="Active customers" loading={!s} failed={!!summary.error}
          value={String(s?.activeCustomers ?? '—')} sub={blocked ? `${blocked} blocked from transacting` : 'None blocked'} tone={blocked ? 'amber' : undefined} />
        <Kpi to="/oversight" icon={<ArrowLeftRight size={16} />} label="Transfers today" loading={!s} failed={!!summary.error}
          value={String(s?.todayCount ?? '—')} sub={s?.todayVolume ? `${naira(s.todayVolume)} moved` : s?.todayCount === 0 ? 'Nothing moved yet today' : 'Amount not reported'} />
        <Kpi to="/oversight" icon={<ArrowLeftRight size={16} />} label={`Transfers, ${period} days`} loading={!transfers.data} failed={!!transfers.error}
          value={compactNaira(tx.value)} sub={tx.rate === null ? 'No completed transfers' : `${tx.count} transfers · ${tx.rate}% succeeded`}
          tone={tx.rate !== null && tx.rate < 90 ? 'amber' : undefined} />
        <Kpi to="/loans?tab=applications" icon={<Banknote size={16} />} label="Loan book" loading={!loans.data} failed={!!loans.error}
          value={compactNaira(pipeline.disbursed.amount)} sub={`${pipeline.disbursed.count} loan${pipeline.disbursed.count === 1 ? '' : 's'} disbursed`} />
        <Kpi to="/savings?tab=goals" icon={<PiggyBank size={16} />} label="Customer savings" loading={!goals.data} failed={!!goals.error}
          value={compactNaira(saving.saved)} sub={`${saving.active} active goal${saving.active === 1 ? '' : 's'} · ${saving.progress}% of target`} />
      </div>

      {/* Trend + customers */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel
          className="xl:col-span-2"
          title="Transfers over time"
          subtitle={tx.last ? `Last transfer ${moment(tx.last).fromNow()}` : 'Customer transfers by day'}
          action={
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              {(['7', '30', '90'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${period === p ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  {p} days
                </button>
              ))}
            </div>
          }
        >
          {transfers.error && !transfers.data ? <Unavailable what="Transfer figures" />
            : !transfers.data ? <Skeleton className="h-52 w-full rounded-xl" />
            : <TrendBars buckets={tx.buckets} />}
        </Panel>

        <Panel title="Customers" subtitle="By account tier" action={<SeeAll to="/customers" />}>
          {customers.error && !customers.data ? <Unavailable what="Customer figures" /> : !customers.data ? <Skeleton className="h-52 w-full rounded-xl" /> : (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {tiers.map(t => (
                  <div key={t.tier}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-600">Tier {t.tier}</span>
                      <span className="text-slate-500">{t.count} · {Math.round((t.count / cs.length) * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(t.count / cs.length) * 100}%`, background: SERIES }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Newest customers</p>
                <ul className="space-y-2">
                  {newest.map(c => (
                    <li key={c.id}>
                      <Link to={`/customers/${c.id}`} className="flex items-center gap-2.5 group">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">{initials(c.name)}</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-semibold text-slate-700 truncate group-hover:underline">{c.name}</span>
                          <span className="block text-[10px] text-slate-400">Tier {c.tier || '?'} · joined {moment(c.createdAt).fromNow()}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Risk, lending, fees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel title="KYC & compliance" subtitle="Tier upgrades and flagged activity" action={<SeeAll to="/compliance" label="Flags" />}>
          <div className="space-y-4">
            {kyc.data ? (
              <Split label="Tier upgrades" to="/kyc?tab=review" parts={[
                { label: 'Pending', value: kyc.data.pending, color: STATUS.pending.color },
                { label: 'Approved', value: kyc.data.approved, color: STATUS.success.color },
                { label: 'Rejected', value: kyc.data.rejected, color: STATUS.failed.color },
              ]} />
            ) : kyc.error ? <Unavailable what="Tier upgrade figures" /> : <Skeleton className="h-14 w-full rounded-xl" />}
            {compliance.data ? (
              <Split label="Compliance flags" to="/compliance" parts={[
                { label: 'Open', value: compliance.data.open, color: STATUS.failed.color },
                { label: 'Under review', value: compliance.data.underReview, color: STATUS.pending.color },
                { label: 'Resolved', value: compliance.data.resolved, color: STATUS.success.color },
              ]} />
            ) : compliance.error ? <Unavailable what="Compliance figures" /> : <Skeleton className="h-14 w-full rounded-xl" />}
            {kyc.data && (
              <p className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${kyc.data.highRisk > 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'}`}>
                {kyc.data.highRisk > 0 ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                {kyc.data.highRisk > 0 ? `${kyc.data.highRisk} high-risk KYC request${kyc.data.highRisk === 1 ? '' : 's'}` : 'No high-risk KYC requests'}
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Loan pipeline" subtitle="Applications by stage, with amounts" action={<SeeAll to="/loans?tab=applications" />}>
          {loans.error && !loans.data ? <Unavailable what="Loan figures" /> : !loans.data ? <Skeleton className="h-40 w-full rounded-xl" /> : (
            <ol className="space-y-2">
              {([
                ['Awaiting decision', pipeline.pending, 'amber'],
                ['Approved, not paid out', pipeline.approved, 'blue'],
                ['Disbursed (loan book)', pipeline.disbursed, 'green'],
                ['Closed', pipeline.closed, 'slate'],
                ['Declined', pipeline.declined, 'red'],
              ] as const).map(([label, st, tone]) => (
                <li key={label} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                  <span className={`w-1.5 self-stretch rounded-full ${TONE_BAR[tone]}`} aria-hidden="true" />
                  <span className="flex-1 text-xs font-semibold text-slate-600">{label}</span>
                  <span className="text-right">
                    <span className="block text-sm font-black text-slate-800">{st.count}</span>
                    <span className="block text-[10px] text-slate-400">{naira(st.amount)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Verification fees" subtitle="BVN, NIN, face and SMS charges not yet collected" action={<SeeAll to="/settings?tab=fees" label="Fees" />}>
          {!fees.data && fees.loading ? <Skeleton className="h-40 w-full rounded-xl" />
            : fees.error || !fees.data ? <Unavailable what="Fee figures" />
            : (
              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-black text-slate-800">{naira(fees.data.pendingTotal)}</p>
                  <p className="text-xs text-slate-500">Waiting to be debited · auto-debit {fees.data.autoDebitEnabled ? 'on' : 'off'}</p>
                </div>
                <ul className="space-y-2">
                  {Object.entries(fees.data.breakdown).sort((a, b) => (b[1]?.total ?? 0) - (a[1]?.total ?? 0)).map(([type, v]) => (
                    <li key={type}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-600">{feeLabel(type)}</span>
                        <span className="text-slate-500">{v?.count ?? 0} × · {naira(v?.total ?? 0)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${fees.data!.pendingTotal ? ((v?.total ?? 0) / fees.data!.pendingTotal) * 100 : 0}%`, background: SERIES }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </Panel>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Recent transfers" subtitle="Latest customer transfers" action={<SeeAll to="/oversight?tab=single" />}>
          {transfers.error && !transfers.data ? <Unavailable what="Recent transfers" /> : !transfers.data ? <ListPlaceholder /> : tx.recent.length === 0 ? <p className="text-xs text-slate-400">No transfers yet.</p> : (
            <ul className="divide-y divide-slate-50">
              {tx.recent.map(t => <TransferRow key={t.id || t.reference} t={t} />)}
            </ul>
          )}
        </Panel>

        <Panel title="Tier upgrades waiting" subtitle="Oldest first" action={<SeeAll to="/kyc?tab=review" label="Review" />}>
          {kycPending.error && !kycPending.data ? <Unavailable what="Waiting tier upgrades" /> : !kycPending.data ? <ListPlaceholder />
            : kycPending.data.length === 0 ? <p className="text-xs text-slate-400">No tier upgrades waiting.</p> : (
              <ul className="divide-y divide-slate-50">
                {[...kycPending.data].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, 6).map(k => (
                  <li key={k.id}>
                    <Link to="/kyc?tab=review" className="flex items-center gap-3 py-2.5 group">
                      <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black flex items-center justify-center shrink-0">{initials(k.name)}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-700 truncate group-hover:underline">{k.name}</span>
                        <span className="block text-[11px] text-slate-400">Tier {k.currentTier} → Tier {k.requestedTier}{k.accountNumber && <> · <span className="font-mono">{k.accountNumber}</span></>}</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className={`block text-[10px] font-bold uppercase ${k.risk === 'HIGH' ? 'text-red-600' : k.risk === 'MEDIUM' ? 'text-amber-700' : 'text-slate-400'}`}>{k.risk ? `${k.risk.toLowerCase()} risk` : ''}</span>
                        <span className="flex items-center justify-end gap-1 text-[11px] text-slate-500"><Clock size={10} /> {k.createdAt ? moment(k.createdAt).fromNow(true) : '—'}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </Panel>
      </div>
    </div>
  )
}

const TONE_BAR = { amber: 'bg-amber-400', blue: 'bg-blue-500', green: 'bg-emerald-500', slate: 'bg-slate-300', red: 'bg-red-400' } as const
const feeLabel = (type: string) => type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()).replace(/\b(bvn|nin|sms)\b/gi, m => m.toUpperCase())
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

function Panel({ title, subtitle, action, className = '', children }: {
  title: string; subtitle?: string; action?: React.ReactNode; className?: string; children: React.ReactNode
}) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function SeeAll({ to, label = 'See all' }: { to: string; label?: string }) {
  return (
    <Link to={to} className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold text-slate-500 hover:text-slate-800">
      {label} <ChevronRight size={12} />
    </Link>
  )
}

function Kpi({ to, icon, label, value, sub, tone, loading, failed }: {
  to: string; icon: React.ReactNode; label: string; value: string; sub: string; tone?: 'amber'; loading: boolean; failed?: boolean
}) {
  if (failed) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 min-w-0">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400"><span className="text-slate-500">{icon}</span> <span className="truncate">{label}</span></p>
        <p className="text-xl sm:text-2xl font-black text-slate-300 mt-1.5">—</p>
        <p className="text-[11px] text-slate-400">Unavailable right now</p>
      </div>
    )
  }
  if (loading) {
    return (
      <div aria-hidden="true" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
        <Skeleton className="h-2.5 w-20" /><Skeleton className="h-6 w-16" /><Skeleton className="h-2.5 w-24" />
      </div>
    )
  }
  return (
    <Link to={to} className="group bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow min-w-0">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span className="text-slate-500">{icon}</span> <span className="truncate">{label}</span>
      </p>
      <p className="text-xl sm:text-2xl font-black text-slate-800 mt-1.5 truncate">{value}</p>
      <p className={`text-[11px] truncate ${tone === 'amber' ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>{sub}</p>
    </Link>
  )
}

/** One stacked bar with a labelled legend; the counts sit in the legend so colour is never the only cue. */
function Split({ label, to, parts }: { label: string; to: string; parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((n, p) => n + p.value, 0)
  return (
    <Link to={to} className="block group">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="font-semibold text-slate-600 group-hover:underline">{label}</span>
        <span className="text-slate-400">{total} total</span>
      </div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 gap-[2px]">
        {total > 0 && parts.filter(p => p.value > 0).map(p => <span key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} title={`${p.label}: ${p.value}`} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
        {parts.map(p => (
          <span key={p.label} className="inline-flex items-center gap-1 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-sm" style={{ background: p.color }} aria-hidden="true" /> {p.label} <strong className="text-slate-700">{p.value}</strong>
          </span>
        ))}
      </div>
    </Link>
  )
}

/** Daily transfer counts stacked by outcome, with a hover tooltip per day. */
function TrendBars({ buckets }: { buckets: TrendBucket[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const totals = buckets.map(b => b.success + b.pending + b.failed)
  const max = Math.max(1, ...totals)
  const any = totals.some(Boolean)
  const step = Math.ceil(buckets.length / 6)
  const h = hover !== null ? buckets[hover] : null
  return (
    <div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
        {(['success', 'pending', 'failed'] as const).map(k => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS[k].color }} aria-hidden="true" />
            {k === 'success' ? <CheckCircle2 size={11} /> : k === 'pending' ? <Clock size={11} /> : <XCircle size={11} />} {STATUS[k].label}
          </span>
        ))}
      </div>
      <div className="relative">
        {!any && <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 z-10">No transfers in this period</p>}
        <div className="flex items-end gap-[2px] h-56 border-b border-slate-200" onMouseLeave={() => setHover(null)}>
          {buckets.map((b, i) => (
            <div key={b.key} className="flex-1 h-full flex flex-col justify-end cursor-default" onMouseEnter={() => setHover(i)}>
              <div className={`flex flex-col-reverse gap-[2px] rounded-t-[4px] overflow-hidden ${hover === i ? 'opacity-100' : hover !== null ? 'opacity-60' : ''}`}
                style={{ height: `${(totals[i] / max) * 100}%` }}>
                {(['success', 'pending', 'failed'] as const).map(k => b[k] > 0 && (
                  <span key={k} style={{ flexGrow: b[k], background: STATUS[k].color }} />
                ))}
              </div>
            </div>
          ))}
        </div>
        {h && (
          <div className="absolute -top-2 bg-slate-800 text-white text-[11px] rounded-lg px-2.5 py-1.5 pointer-events-none shadow-lg whitespace-nowrap"
            style={{ left: `${((hover! + 0.5) / buckets.length) * 100}%`, transform: `translateX(${hover! / buckets.length > 0.7 ? '-100%' : hover! / buckets.length < 0.3 ? '0' : '-50%'})` }}>
            <p className="font-bold">{h.label}</p>
            <p>{h.success} successful · {naira(h.successValue)}</p>
            {h.pending > 0 && <p>{h.pending} pending</p>}
            {h.failed > 0 && <p>{h.failed} failed</p>}
            {totals[hover!] === 0 && <p className="text-white/70">No transfers</p>}
          </div>
        )}
        <div className="flex mt-1.5">
          {buckets.map((b, i) => (
            <span key={b.key} className="flex-1 text-center text-[10px] text-slate-400 whitespace-nowrap overflow-visible">{i % step === 0 ? b.label : ''}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function TransferRow({ t }: { t: Txn }) {
  const ok = t.group === 'success', bad = t.group === 'failed' || t.group === 'reversed'
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ok ? 'bg-emerald-50 text-emerald-600' : bad ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
        {ok ? <CheckCircle2 size={15} /> : bad ? <XCircle size={15} /> : <Clock size={15} />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-slate-700 truncate">
          {t.customerName || 'Unknown sender'} <span className="font-normal text-slate-400">→</span> {t.beneficiaryName || t.creditAccount || '—'}
        </span>
        <span className="block text-[11px] text-slate-400 truncate">
          {t.typeLabel}{t.bankName && ` · ${t.bankName}`} · {t.createdAt ? moment(t.createdAt).fromNow() : '—'}
          {bad && t.failureReason && <span className="text-red-500"> · {t.failureReason}</span>}
        </span>
      </span>
      <span className="text-right shrink-0">
        <span className="block text-sm font-bold text-slate-800">{naira(t.amount)}</span>
        <span className={`block text-[10px] font-bold uppercase ${ok ? 'text-emerald-600' : bad ? 'text-red-600' : 'text-amber-600'}`}>{t.status.toLowerCase()}</span>
      </span>
    </li>
  )
}

function Unavailable({ what }: { what: string }) {
  return <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-3">{what} could not be loaded right now. Use Refresh to try again.</p>
}

function ListPlaceholder() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-2/5" /><Skeleton className="h-2.5 w-3/5" /></div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}

