import { Users, ShieldCheck, ArrowLeftRight, Activity, TrendingUp, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '../ui/StatCard'
import { Card } from '../ui/Card'
import { Badge, statusBadge } from '../ui/Badge'
import { useApi } from '../../hooks/useApi'
import { getKycStats, getKycPending, getComplianceStats, getTransactions } from '../../api'
import type { KycStats, KycPendingItem, ComplianceStats, PaginatedData } from '../../api/types'
import moment from 'moment'

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`
  return `₦${n}`
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
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

  const kStats = kycStats.data
  const cStats = complianceStats.data

  return (
    <div className="space-y-6">
      {/* Stat cards — row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="KYC Pending"
          value={kycStats.loading ? '…' : kStats?.pending ?? 0}
          sub="Awaiting review"
          icon={<ShieldCheck size={18} />}
          accent="bg-amber-50 text-amber-600"
          onClick={() => navigate('/kyc')}
        />
        <StatCard
          label="KYC Approved"
          value={kycStats.loading ? '…' : kStats?.approved ?? 0}
          sub={`${kStats?.rejected ?? 0} rejected`}
          icon={<ShieldCheck size={18} />}
          accent="bg-blue-50 text-blue-600"
          onClick={() => navigate('/kyc')}
        />
        <StatCard
          label="High Risk"
          value={kycStats.loading ? '…' : kStats?.highRisk ?? 0}
          sub="Requires attention"
          icon={<AlertTriangle size={18} />}
          accent="bg-red-50 text-red-600"
          onClick={() => navigate('/compliance')}
        />
        <StatCard
          label="Compliance Open"
          value={complianceStats.loading ? '…' : cStats?.open ?? 0}
          sub={`${cStats?.underReview ?? 0} under review`}
          icon={<Activity size={18} />}
          accent="bg-emerald-50 text-emerald-600"
          onClick={() => navigate('/compliance')}
        />
      </div>

      {/* Stat cards — row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Compliance Resolved"
          value={complianceStats.loading ? '…' : cStats?.resolved ?? 0}
          sub="All time"
          icon={<TrendingUp size={18} />}
          accent="bg-emerald-50 text-emerald-600"
          onClick={() => navigate('/compliance')}
        />
        <StatCard
          label="Flags Under Review"
          value={complianceStats.loading ? '…' : cStats?.underReview ?? 0}
          sub="In progress"
          icon={<ArrowLeftRight size={18} />}
          accent="bg-purple-50 text-purple-600"
          onClick={() => navigate('/compliance')}
        />
        <StatCard
          label="KYC Total Processed"
          value={kycStats.loading ? '…' : ((kStats?.approved ?? 0) + (kStats?.rejected ?? 0))}
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
          {kycPending.loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
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
          {recentTx.loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
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
