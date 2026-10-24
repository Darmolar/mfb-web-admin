import { Users, ShieldCheck, ArrowLeftRight, Activity, TrendingUp, AlertTriangle, Landmark, UserCheck, Banknote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '../ui/StatCard'
import { Card } from '../ui/Card'
import { Badge, statusBadge } from '../ui/Badge'
import { ListSkeleton, Skeleton } from '../ui/Skeleton'
import { useApi } from '../../hooks/useApi'
import { getKycStats, getKycPending, getComplianceStats, getTransactions, getDashboardSummary } from '../../api'
import type { KycStats, KycPendingItem, ComplianceStats, PaginatedData, DashboardSummary } from '../../api/types'
import moment from 'moment'

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`
  return `₦${n}`
}

type StatProps = React.ComponentProps<typeof StatCard> & { loading: boolean }

/** A StatCard, or a placeholder of the same shape until its first data arrives. */
function Stat({ loading, ...props }: StatProps) {
  if (!loading) return <StatCard {...props} />
  return (
    <div aria-hidden="true" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-start gap-4">
      <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
  )
}

export function OverviewPage() {
  const navigate = useNavigate()

  const kycStats = useApi<KycStats>(async () => {
    const res = await getKycStats()
    return res.data
  })

  const complianceStats = useApi<ComplianceStats>(async () => {
    const res = await getComplianceStats()
    return res.data
  })

  const kycPending = useApi<PaginatedData<KycPendingItem>>(async () => {
    const res = await getKycPending()
    return res.data
  })

  const recentTx = useApi<PaginatedData<Record<string, unknown>>>(async () => {
    const res = await getTransactions({ page: 0, size: 5 })
    return res.data
  })

  const summary = useApi<DashboardSummary>(async () => {
    const res = await getDashboardSummary()
    return res.data
  })

  const kStats = kycStats.data
  const cStats = complianceStats.data
  const s = summary.data

  return (
    <div className="space-y-6">
      {/* Platform summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat
          loading={summary.loading && !s}
          label="Total Customers"
          value={s?.totalCustomers ?? 0}
          sub="All registered"
          icon={<Users size={18} />}
          accent="bg-slate-100 text-slate-600"
          onClick={() => navigate('/customers')}
        />
        <Stat
          loading={summary.loading && !s}
          label="Active Accounts"
          value={s?.activeAccounts ?? 0}
          sub="Currently active"
          icon={<UserCheck size={18} />}
          accent="bg-blue-50 text-blue-600"
          onClick={() => navigate('/customers')}
        />
        <Stat
          loading={summary.loading && !s}
          label="Pending KYC"
          value={s?.pendingKyc ?? 0}
          sub="Awaiting review"
          icon={<ShieldCheck size={18} />}
          accent="bg-amber-50 text-amber-600"
          onClick={() => navigate('/kyc')}
        />
        <Stat
          loading={summary.loading && !s}
          label="Total Loan Book"
          value={fmt(s?.totalLoanBook ?? 0)}
          sub="Outstanding"
          icon={<Banknote size={18} />}
          accent="bg-emerald-50 text-emerald-600"
          onClick={() => navigate('/loans')}
        />
        <Stat
          loading={summary.loading && !s}
          label="Recent Signups"
          value={s?.recentSignups ?? 0}
          sub="Last 7 days"
          icon={<Landmark size={18} />}
          accent="bg-purple-50 text-purple-600"
          onClick={() => navigate('/customers')}
        />
      </div>

      {/* Stat cards — row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          loading={kycStats.loading && !kStats}
          label="KYC Pending"
          value={kStats?.pending ?? 0}
          sub="Awaiting review"
          icon={<ShieldCheck size={18} />}
          accent="bg-amber-50 text-amber-600"
          onClick={() => navigate('/kyc')}
        />
        <Stat
          loading={kycStats.loading && !kStats}
          label="KYC Approved"
          value={kStats?.approved ?? 0}
          sub={`${kStats?.rejected ?? 0} rejected`}
          icon={<ShieldCheck size={18} />}
          accent="bg-blue-50 text-blue-600"
          onClick={() => navigate('/kyc')}
        />
        <Stat
          loading={kycStats.loading && !kStats}
          label="High Risk"
          value={kStats?.highRisk ?? 0}
          sub="Requires attention"
          icon={<AlertTriangle size={18} />}
          accent="bg-red-50 text-red-600"
          onClick={() => navigate('/compliance')}
        />
        <Stat
          loading={complianceStats.loading && !cStats}
          label="Compliance Open"
          value={cStats?.open ?? 0}
          sub={`${cStats?.underReview ?? 0} under review`}
          icon={<Activity size={18} />}
          accent="bg-emerald-50 text-emerald-600"
          onClick={() => navigate('/compliance')}
        />
      </div>

      {/* Stat cards — row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat
          loading={complianceStats.loading && !cStats}
          label="Compliance Resolved"
          value={cStats?.resolved ?? 0}
          sub="All time"
          icon={<TrendingUp size={18} />}
          accent="bg-emerald-50 text-emerald-600"
          onClick={() => navigate('/compliance')}
        />
        <Stat
          loading={complianceStats.loading && !cStats}
          label="Flags Under Review"
          value={cStats?.underReview ?? 0}
          sub="In progress"
          icon={<ArrowLeftRight size={18} />}
          accent="bg-purple-50 text-purple-600"
          onClick={() => navigate('/compliance')}
        />
        <Stat
          loading={kycStats.loading && !kStats}
          label="KYC Total Processed"
          value={((kStats?.approved ?? 0) + (kStats?.rejected ?? 0))}
          sub="Approved + Rejected"
          icon={<Users size={18} />}
          accent="bg-slate-100 text-slate-600"
          onClick={() => navigate('/kyc')}
        />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pending KYC Applications</h3>
          {kycPending.loading && !kycPending.data ? (
            <ListSkeleton rows={4} avatar={false} className="-mx-4 sm:-mx-5" />
          ) : kycPending.error ? (
            <p className="text-xs text-red-500">{kycPending.error}</p>
          ) : (kycPending.data?.content ?? []).length === 0 ? (
            <p className="text-xs text-slate-400">No pending applications.</p>
          ) : (
            <div className="space-y-3">
              {(kycPending.data?.content ?? []).map(app => (
                <div key={app.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{app.customerName}</p>
                    <p className="text-xs text-slate-400">Tier {app.currentTier} → Tier {app.requestedTier}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge label={app.riskLevel} variant={statusBadge(app.riskLevel)} />
                    <Badge label={app.status} variant={statusBadge(app.status)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Transactions</h3>
          {recentTx.loading && !recentTx.data ? (
            <ListSkeleton rows={4} avatar={false} className="-mx-4 sm:-mx-5" />
          ) : recentTx.error ? (
            <p className="text-xs text-red-500">{recentTx.error}</p>
          ) : (recentTx.data?.content ?? []).length === 0 ? (
            <p className="text-xs text-slate-400">No recent transactions.</p>
          ) : (
            <div className="space-y-3">
              {(recentTx.data?.content ?? []).slice(0, 5).map((tx: any, i) => (
                <div key={String(tx.id ?? i)} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{String(tx.beneficiaryName ?? tx.narration ?? '—')}</p>
                    <p className="text-xs text-slate-400">{String(tx.transferType?.replace(/_/g, ' ') ?? '')} · {String(tx.channel ?? 'MOBILE')} · {String(tx.createdAt ? moment(tx.createdAt).fromNow() : '')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700">{typeof tx.amount === 'number' ? fmt(tx.amount) : '—'}</span>
                    {tx.status ? <Badge label={String(tx.status)} variant={statusBadge(String(tx.status))} /> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
