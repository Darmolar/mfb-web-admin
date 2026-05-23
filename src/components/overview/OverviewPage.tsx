import { Users, ShieldCheck, ArrowLeftRight, Building2, Activity, TrendingUp } from 'lucide-react'
import { StatCard } from '../ui/StatCard'
import { Card } from '../ui/Card'
import { Badge, statusBadge } from '../ui/Badge'
import { overviewStats, mockKYCApplications, mockTransactions } from '../../data/mockData'

function fmt(n: number) {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}K`
  return `₦${n}`
}

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Accounts"
          value={overviewStats.totalAccounts.toLocaleString()}
          sub="Retail + Corporate"
          icon={<Users size={18} />}
          accent="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Active Users"
          value={overviewStats.activeUsers.toLocaleString()}
          sub="Last 30 days"
          icon={<Activity size={18} />}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="KYC Pending"
          value={overviewStats.kycPending}
          sub="Awaiting review"
          icon={<ShieldCheck size={18} />}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Tx Volume Today"
          value={fmt(overviewStats.transactionVolumeToday)}
          sub="All channels"
          icon={<ArrowLeftRight size={18} />}
          accent="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Corporate Entities"
          value={overviewStats.corporateEntities}
          sub="Onboarded"
          icon={<Building2 size={18} />}
          accent="bg-slate-100 text-slate-600"
        />
        <StatCard
          label="Safety Score"
          value={`${overviewStats.safetyScore}%`}
          sub="System resilience"
          icon={<TrendingUp size={18} />}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="KYC Approved Today"
          value={overviewStats.approvedToday}
          sub={`${overviewStats.rejectedToday} rejected`}
          icon={<ShieldCheck size={18} />}
          accent="bg-blue-50 text-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recent KYC Applications</h3>
          <div className="space-y-3">
            {mockKYCApplications.map(app => (
              <div key={app.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{app.customerName}</p>
                  <p className="text-xs text-slate-400">{app.requestType} · {app.submittedAt}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge label={app.riskLevel} variant={statusBadge(app.riskLevel)} />
                  <Badge label={app.status} variant={statusBadge(app.status)} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {mockTransactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-700">{tx.beneficiary}</p>
                  <p className="text-xs text-slate-400">{tx.type} · {tx.channel} · {tx.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700">{fmt(tx.amount)}</span>
                  <Badge label={tx.status} variant={statusBadge(tx.status)} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
