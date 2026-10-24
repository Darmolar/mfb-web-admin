import { useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, ChevronRight, Loader2, PauseCircle, PlayCircle, RefreshCw, Search, Target, UserRound } from 'lucide-react'
import moment from 'moment'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { StatCardsSkeleton } from '../ui/Skeleton'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { getSavingsGoals, getSavingsProducts, reactivateSavingsGoal, suspendSavingsGoal } from '../../api'
import { allPages } from '../../api/pagination'
import {
  categoryLabel, goalStatus, interestEstimate, maturityLabel, readSavingsGoals, readSavingsProducts, type SavingsGoalRecord,
} from '../../api/savings'

const naira = (n: number | null | undefined) => (n == null ? '—' : `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`)
const errText = (e: unknown, f: string) => (e instanceof Error && e.message ? e.message : f)

type Row = SavingsGoalRecord & { productName: string; productKnown: boolean }

export function SavingsGoals() {
  const { user } = useAuth()
  const [status, setStatus] = useState('ALL')
  const [category, setCategory] = useState('')
  const [mobileSearch, setMobileSearch] = useState('')
  const [selected, setSelected] = useState<Row | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, loading, error, refetch } = useApi(async () => {
    const [goals, products] = await Promise.all([
      allPages(page => getSavingsGoals({ page, size: 100 })),
      getSavingsProducts().then(r => readSavingsProducts(r.data)).catch(() => []),
    ])
    return { goals: readSavingsGoals(goals), products }
  }, [])

  const rows: Row[] = useMemo(() => (data?.goals ?? []).map(g => {
    const p = data?.products.find(x => x.code === g.productCode)
    return { ...g, productName: p?.name ?? g.productCode ?? '—', productKnown: !!p }
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data])

  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {})
  const categories = [...new Set(rows.map(r => r.category))].sort()
  const shown = rows.filter(r => (status === 'ALL' || r.status === status) && (!category || r.category === category))
  const term = mobileSearch.trim().toLowerCase()
  const mobileRows = term ? shown.filter(r => [r.name, r.customerName, r.customerAccount, r.coreAccount].join(' ').toLowerCase().includes(term)) : shown
  const open = (r: Row) => { setSelected(r); setConfirming(false); setActionError(null) }

  const active = rows.filter(r => r.status === 'ACTIVE')
  const totalSaved = rows.reduce((s, r) => s + r.balance, 0)
  const avgProgress = active.length ? active.reduce((s, r) => s + r.progress, 0) / active.length : 0
  const maturingSoon = active.filter(r => r.daysToMaturity !== null && r.daysToMaturity >= 0 && r.daysToMaturity <= 30)
  const unknownProducts = [...new Set(rows.filter(r => !r.productKnown && r.productCode).map(r => r.productCode))]

  async function toggle() {
    if (!selected || !user) return
    setBusy(true)
    setActionError(null)
    try {
      const suspending = selected.status === 'ACTIVE'
      if (suspending) await suspendSavingsGoal(selected.id, user.adminId)
      else await reactivateSavingsGoal(selected.id, user.adminId)
      setNotice(`${selected.customerName || 'Customer'}'s "${selected.name}" goal ${suspending ? 'suspended' : 'reactivated'}.`)
      setSelected(null)
      setConfirming(false)
      refetch()
    } catch (e) {
      setActionError(errText(e, 'The goal could not be updated.'))
    } finally {
      setBusy(false)
    }
  }

  const columns: ColumnDef<Row>[] = [
    {
      header: 'Goal',
      accessorKey: 'name',
      cell: r => (
        <div className="min-w-[150px]">
          <p className="text-sm font-semibold text-slate-700">{r.name}</p>
          <p className="text-[11px] text-slate-400">{categoryLabel(r.category)} · {r.productName}</p>
        </div>
      ),
    },
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: r => (
        <div className="min-w-[140px]">
          <p className="text-xs font-semibold text-slate-700">{r.customerName || 'Unknown customer'}</p>
          <p className="text-[11px] text-slate-400 font-mono">{r.customerAccount}</p>
        </div>
      ),
    },
    {
      header: 'Progress',
      accessorKey: 'progress',
      cell: r => (
        <div className="w-40">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="font-semibold text-slate-700">{naira(r.balance)}</span>
            <span className="text-slate-400">of {naira(r.target)}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(r.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full" style={{ width: `${r.progress * 100}%`, background: '#2a78d6' }} />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{Math.round(r.progress * 100)}% saved</p>
        </div>
      ),
    },
    { header: 'Interest', accessorKey: 'ratePercent', cell: r => <span className="text-xs text-slate-600 whitespace-nowrap">{r.ratePercent !== null ? `${r.ratePercent}% p.a.` : '—'}</span> },
    {
      header: 'Maturity',
      accessorKey: 'daysToMaturity',
      cell: r => (
        <div className="whitespace-nowrap text-xs">
          <p className="text-slate-700">{r.maturityDate ? moment(r.maturityDate).format('DD MMM YYYY') : '—'}</p>
          <p className={r.daysToMaturity !== null && r.daysToMaturity <= 30 ? 'text-amber-700' : 'text-slate-400'}>{maturityLabel(r.daysToMaturity)}</p>
        </div>
      ),
    },
    { header: 'Status', accessorKey: 'status', cell: r => <Badge label={goalStatus(r.status).label} variant={goalStatus(r.status).variant} /> },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Customer savings goals</h3>
          <p className="text-xs text-slate-500 mt-0.5">Goals customers are saving towards. Open one to see details or suspend it.</p>
        </div>
        <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer" title="Refresh"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
      </div>

      {notice && (
        <div className="text-xs font-semibold rounded-xl px-4 py-3 border bg-emerald-50 border-emerald-100 text-emerald-700 flex justify-between gap-4">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 cursor-pointer">Dismiss</button>
        </div>
      )}

      {loading && !data ? <StatCardsSkeleton count={4} className="grid grid-cols-2 lg:grid-cols-4 gap-3" /> : data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Total saved" value={naira(totalSaved)} sub={`across ${rows.length} goal${rows.length === 1 ? '' : 's'}`} />
          <Tile label="Active goals" value={String(active.length)} sub={counts.SUSPENDED ? `${counts.SUSPENDED} suspended` : 'none suspended'} />
          <Tile label="Average progress" value={`${Math.round(avgProgress * 100)}%`} sub="of target, active goals" />
          <Tile label="Maturing in 30 days" value={String(maturingSoon.length)} sub={naira(maturingSoon.reduce((s, r) => s + r.balance, 0))} tone={maturingSoon.length ? 'amber' : undefined} />
        </div>
      )}

      {unknownProducts.length > 0 && (
        <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          Some goals belong to product {unknownProducts.join(', ')}, which isn't in the savings product list. Their rules can't be checked here.
        </p>
      )}

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
            {['ALL', ...Object.keys(counts)].map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${status === s ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {s === 'ALL' ? 'All' : goalStatus(s).label}<span className="ml-1.5 text-[10px] text-slate-400">{s === 'ALL' ? rows.length : counts[s]}</span>
              </button>
            ))}
          </div>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700" value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
        </div>
      )}

      {error && !loading ? (
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-red-500 mb-3">{error}</p>
          <Button size="sm" variant="secondary" onClick={refetch}>Retry</Button>
        </div>
      ) : (
        <>
        {/* Phones get stacked cards so progress, maturity and status stay visible. */}
        {data && (
          <div className="sm:hidden space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={mobileSearch} onChange={e => setMobileSearch(e.target.value)} placeholder="Search goal, customer, account…"
                className="w-full pl-9 pr-3 py-2.5 text-base bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            {mobileRows.length === 0 && <p className="text-center text-xs text-slate-400 py-8">No goals match.</p>}
            {mobileRows.map(r => (
              <button key={r.id} onClick={() => open(r)} className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3 cursor-pointer active:bg-slate-50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{r.name}</p>
                    <p className="text-xs text-slate-500 truncate">{r.customerName || 'Unknown customer'} · {categoryLabel(r.category)}</p>
                  </div>
                  <Badge label={goalStatus(r.status).label} variant={goalStatus(r.status).variant} />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="font-semibold text-slate-700">{naira(r.balance)}</span><span className="text-slate-400">of {naira(r.target)}</span></div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.progress * 100}%`, background: '#2a78d6' }} /></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>{r.ratePercent !== null ? `${r.ratePercent}% p.a. · ` : ''}{maturityLabel(r.daysToMaturity)}</span>
                  <ChevronRight size={15} className="text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        )}
        <div className={data ? 'hidden sm:block' : ''}>
        <DataTable<Row>
          columns={columns}
          data={shown}
          loading={loading && !data}
          searchPlaceholder="Search goal, customer, account…"
          searchFields={['name', 'customerName', 'customerAccount', 'coreAccount', 'productName']}
          onRowClick={open}
          emptyMessage={rows.length ? 'No goals match these filters.' : 'No customer has created a savings goal yet.'}
        />
        </div>
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Savings goal" width="max-w-xl"
        footer={selected && (selected.status === 'ACTIVE' || selected.status === 'SUSPENDED') ? (
          <div className="space-y-3">
            {confirming && (
              <p className={`text-xs rounded-xl px-3 py-2.5 border ${selected.status === 'ACTIVE' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                {selected.status === 'ACTIVE'
                  ? `Suspending freezes this goal: ${selected.customerName || 'the customer'} can't add to it or withdraw until it's reactivated. Use this for fraud or compliance holds.`
                  : 'Reactivating lets the customer deposit and withdraw again under the product rules.'}
              </p>
            )}
            {actionError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{actionError}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button variant="secondary" className="sm:flex-1 justify-center" onClick={() => (confirming ? setConfirming(false) : setSelected(null))} disabled={busy}>
                {confirming ? 'Back' : 'Close'}
              </Button>
              <Button
                variant={selected.status === 'ACTIVE' ? 'danger' : 'success'}
                className="sm:flex-1 justify-center"
                disabled={busy}
                onClick={() => (confirming ? toggle() : setConfirming(true))}
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : selected.status === 'ACTIVE' ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                {confirming ? (selected.status === 'ACTIVE' ? 'Confirm suspension' : 'Confirm reactivation') : selected.status === 'ACTIVE' ? 'Suspend goal' : 'Reactivate goal'}
              </Button>
            </div>
          </div>
        ) : undefined}>
        {selected && <GoalDetails goal={selected} />}
      </Modal>
    </div>
  )
}

function GoalDetails({ goal: g }: { goal: Row }) {
  const st = goalStatus(g.status)
  const remaining = Math.max(0, g.target - g.balance)
  const projected = g.ratePercent !== null && g.daysToMaturity !== null && g.daysToMaturity > 0 ? interestEstimate(g.balance, g.ratePercent, g.daysToMaturity) : null
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0"><Target size={18} /></span>
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-800">{g.name}</p>
            <p className="text-xs text-slate-500">{categoryLabel(g.category)} · {g.productName}{!g.productKnown && g.productCode && ' (unknown product)'}</p>
          </div>
        </div>
        <Badge label={st.label} variant={st.variant} size="md" />
      </div>

      <div className="rounded-2xl border border-slate-100 p-4">
        <div className="flex items-end justify-between gap-3 mb-2">
          <div><p className="text-[11px] text-slate-400">Saved</p><p className="text-2xl font-black text-slate-800">{naira(g.balance)}</p></div>
          <div className="text-right"><p className="text-[11px] text-slate-400">Target</p><p className="text-sm font-bold text-slate-700">{naira(g.target)}</p></div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${g.progress * 100}%`, background: '#2a78d6' }} /></div>
        <p className="text-xs text-slate-500 mt-1.5">{Math.round(g.progress * 100)}% saved · {remaining > 0 ? `${naira(remaining)} to go` : 'Target reached'}</p>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <Item icon={<CalendarClock size={13} />} label="Matures" value={g.maturityDate ? `${moment(g.maturityDate).format('DD MMM YYYY')} · ${maturityLabel(g.daysToMaturity)}` : 'No maturity date'} />
        <Item label="Interest rate" value={g.ratePercent !== null ? `${g.ratePercent}% per year` : '—'} />
        {projected !== null && <Item label="Interest to maturity (estimate)" value={`≈ ${naira(projected)} on the current balance`} />}
        <Item label="Duration" value={g.durationDays ? `${g.durationDays} days` : '—'} />
        <Item label="Savings account" value={<span className="font-mono">{g.coreAccount || '—'}</span>} />
        <Item label="Started" value={g.createdAt ? moment(g.createdAt).format('DD MMM YYYY') : '—'} />
      </dl>

      <div className="rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><UserRound size={11} /> Customer</p>
        <p className="text-sm font-semibold text-slate-800">{g.customerName || 'Unknown customer'}</p>
        <p className="text-xs text-slate-500"><span className="font-mono">{g.customerAccount}</span>{g.customerPhone && ` · ${g.customerPhone}`}{g.customerEmail && ` · ${g.customerEmail}`}</p>
      </div>
      {st.hint && <p className="text-[11px] text-slate-400">{st.hint}</p>}
    </div>
  )
}

function Item({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-slate-400 flex items-center gap-1">{icon}{label}</dt>
      <dd className="text-sm font-semibold text-slate-700 break-words">{value}</dd>
    </div>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: 'amber' }) {
  return (
    <div className={`rounded-2xl border shadow-sm p-4 ${tone === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-2xl font-black mt-1 ${tone === 'amber' ? 'text-amber-700' : 'text-slate-800'}`}>{value}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  )
}
