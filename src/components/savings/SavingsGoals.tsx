import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { getSavingsGoals, suspendSavingsGoal, reactivateSavingsGoal } from '../../api'
import type { SavingsGoal, PaginatedData } from '../../api/types'

const fmt = (kobo: number | undefined | null) =>
  kobo == null ? '—' : `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

export function SavingsGoals() {
  const { user } = useAuth()

  const goals = useApi<PaginatedData<SavingsGoal>>(async () => {
    const res = await getSavingsGoals()
    return res.data
  })

  const handleToggle = async (goal: SavingsGoal) => {
    if (!user) return
    try {
      if (goal.status === 'ACTIVE') {
        await suspendSavingsGoal(goal.id, user.adminId)
      } else {
        await reactivateSavingsGoal(goal.id, user.adminId)
      }
      goals.refetch()
    } catch {
      /* silently ignore */
    }
  }

  const columns: ColumnDef<SavingsGoal>[] = [
    {
      header: 'Goal',
      accessorKey: 'goalName',
      cell: (goal) => (
        <>
          <p className="text-sm font-semibold text-slate-700">{goal.goalName ?? goal.name ?? '—'}</p>
          <p className="text-xs text-slate-400 font-mono">{goal.id?.slice(0, 10) ?? '—'}</p>
        </>
      ),
    },
    {
      header: 'Customer',
      accessorKey: 'customer',
      cell: (goal) => {
        const name = goal.customer
          ? `${goal.customer.firstName ?? ''} ${goal.customer.lastName ?? ''}`.trim() || '—'
          : goal.customerName ?? '—'
        const id = goal.customer?.id ?? goal.customerId
        return (
          <>
            <p className="text-xs text-slate-600">{name}</p>
            <p className="text-xs text-slate-400 font-mono">{id?.slice(0, 10) ?? '—'}</p>
          </>
        )
      },
    },
    {
      header: 'Progress',
      sortable: false,
      cell: (goal) => {
        const saved = goal.currentBalance ?? goal.currentAmount ?? 0
        const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((saved / goal.targetAmount) * 100)) : 0
        return (
          <div className="w-24">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>{isNaN(pct) ? 0 : pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      header: 'Target',
      accessorKey: 'targetAmount',
      cell: (goal) => <span className="text-sm text-slate-700">{fmt(goal.targetAmount)}</span>,
    },
    {
      header: 'Current',
      accessorKey: 'currentBalance',
      cell: (goal) => (
        <span className="text-sm text-emerald-600 font-semibold">
          {fmt(goal.currentBalance ?? goal.currentAmount ?? 0)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (goal) => <Badge label={goal.status} variant={statusBadge(goal.status)} />,
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      cell: (goal) => (
        <p className="text-xs text-slate-500">{goal.createdAt ? new Date(goal.createdAt).toLocaleDateString() : '—'}</p>
      ),
    },
    {
      header: 'Action',
      sortable: false,
      cell: (goal) =>
        (goal.status === 'ACTIVE' || goal.status === 'SUSPENDED') ? (
          <Button
            size="sm"
            variant={goal.status === 'ACTIVE' ? 'danger' : 'success'}
            onClick={() => handleToggle(goal)}
          >
            {goal.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
          </Button>
        ) : null,
    },
  ]

  if (goals.loading) {
    return <div className="px-6 py-12 text-center text-sm text-slate-400">Loading…</div>
  }

  if (goals.error) {
    return <div className="px-6 py-12 text-center text-sm text-red-500">{goals.error}</div>
  }

  return (
    <DataTable<SavingsGoal>
      columns={columns}
      data={goals.data?.content ?? []}
      searchPlaceholder="Search goals…"
      emptyMessage="No savings goals found."
    />
  )
}
