import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowLeftRight, Banknote, CheckCircle2, Clock, Coins, RefreshCw, Users, XCircle,
} from 'lucide-react'
import moment from 'moment'
import { useApi } from '../../hooks/useApi'
import { getAllTransactions, getTransactions } from '../../api'
import { allPages } from '../../api/pagination'
import {
  PERIODS, byDestination, byHour, compactNaira, failureReasons, inPeriod, naira, readTxns, trend, typeStats,
  type Period, type StatusGroup, type TrendBucket, type Txn,
} from '../../api/transactions'
import { CardSkeleton, Skeleton, StatCardsSkeleton } from '../ui/Skeleton'

// Status palette (reserved for state, always shown with an icon + label) and one series hue for magnitudes.
const STATUS = {
  success: { color: '#0ca30c', label: 'Successful', icon: <CheckCircle2 size={12} /> },
  pending: { color: '#fab219', label: 'Pending', icon: <Clock size={12} /> },
  failed: { color: '#d03b3b', label: 'Failed / reversed', icon: <XCircle size={12} /> },
} as const
const SERIES = '#2a78d6'

const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()
const STATUS_TEXT: Record<StatusGroup, string> = {
  success: 'text-emerald-700 bg-emerald-50', pending: 'text-amber-700 bg-amber-50', failed: 'text-red-700 bg-red-50', reversed: 'text-rose-700 bg-rose-50', other: 'text-slate-600 bg-slate-100',
}

export function TransactionOverview() {
  const [period, setPeriod] = useState<Period>('30')
  const [metric, setMetric] = useState<'count' | 'value'>('count')

  // Both lists, every page: /all has every money movement; /transactions adds names, banks and failure reasons.
  const { data, loading, error, refetch } = useApi(async () => {
    const [all, transfers] = await Promise.all([
      allPages(page => getAllTransactions({ page, size: 100 })),
      allPages(page => getTransactions({ page, size: 100 })).catch(() => ({ content: [], totalElements: 0 })),
    ])
    const tx = readTxns(transfers)
    const byRef = new Map(tx.map(t => [t.reference, t]))
    // Enrich /all rows with what only the transfer list carries.
    const txns = readTxns(all).map(t => {
      const x = byRef.get(t.reference)
      return x ? { ...t, failureReason: t.failureReason || x.failureReason, customerName: t.customerName || x.customerName, beneficiaryName: x.beneficiaryName, bankName: x.bankName } : t
    })
    return { txns, transfers: tx, loadedAt: Date.now() }
  }, [])

  const view = useMemo(() => {
    const txns = inPeriod(data?.txns ?? [], period)
    const transfers = inPeriod(data?.transfers ?? [], period)
    const ok = txns.filter(t => t.group === 'success')
    const pend = txns.filter(t => t.group === 'pending')
    const bad = txns.filter(t => t.group === 'failed' || t.group === 'reversed')
    const sum = (xs: Txn[]) => xs.reduce((s, t) => s + t.amount, 0)
    const decided = ok.length + bad.length
    return {
      txns, transfers, ok, pend, bad,
      moved: sum(ok), pendingValue: sum(pend), failedValue: sum(bad),
      fees: ok.reduce((s, t) => s + (t.fee ?? 0), 0),
      rate: decided ? Math.round((ok.length / decided) * 100) : null,
      avg: ok.length ? sum(ok) / ok.length : 0,
      customers: new Set(txns.map(t => t.customerId).filter(Boolean)).size,
      trend: trend(txns, period),
      types: typeStats(txns),
      hours: byHour(txns),
      destinations: byDestination(transfers),
      reasons: failureReasons(transfers),
      largest: [...ok].sort((a, b) => b.amount - a.amount).slice(0, 5),
      recentFailures: [...bad].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    }
  }, [data, period])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-80 max-w-full rounded-xl" />
        <StatCardsSkeleton count={6} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3" />
        <CardSkeleton chart />
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <CardSkeleton lines={8} className="xl:col-span-3" />
          <CardSkeleton lines={5} className="xl:col-span-2" />
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <CardSkeleton chart />
          <CardSkeleton lines={4} />
        </div>
      </div>
    )
  }
  if (error && !data) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-3">Could not load transactions: {error}</p>
        <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
      </div>
    )
  }

  const v = view
  const periodLabel = PERIODS.find(p => p.id === period)!.label.toLowerCase()

  return (
    <div className="space-y-6">
      {/* Filters: one row above the charts */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 max-w-full overflow-x-auto">
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${period === p.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          {data && <span>Updated {moment(data.loadedAt).format('HH:mm')}</span>}
          <button onClick={refetch} className="inline-flex items-center gap-1 hover:text-slate-600 cursor-pointer">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi icon={<Banknote size={15} />} label="Value moved" value={compactNaira(v.moved)} sub={`${v.ok.length} successful`} />
        <Kpi icon={<ArrowLeftRight size={15} />} label="Transactions" value={v.txns.length.toLocaleString()} sub={`avg ${compactNaira(v.avg)}`} />
        <Kpi icon={<CheckCircle2 size={15} />} label="Success rate" value={v.rate === null ? '—' : `${v.rate}%`} sub="of completed attempts" tone={v.rate !== null && v.rate < 90 ? 'amber' : 'green'} />
        <Kpi icon={<Clock size={15} />} label="Pending" value={String(v.pend.length)} sub={`${compactNaira(v.pendingValue)} in progress`} tone={v.pend.length ? 'amber' : undefined} />
        <Kpi icon={<XCircle size={15} />} label="Failed" value={String(v.bad.length)} sub={`${compactNaira(v.failedValue)} not processed`} tone={v.bad.length ? 'red' : undefined} />
        <Kpi icon={<Coins size={15} />} label="Fees earned" value={naira(v.fees)} sub={<span className="inline-flex items-center gap-1"><Users size={11} /> {v.customers} active customers</span>} />
      </div>

      {v.txns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <p className="text-sm font-semibold text-slate-700">No transactions in the last {periodLabel}</p>
          <p className="text-xs text-slate-400 mt-1">Choose a longer period to see activity.</p>
        </div>
      ) : (
        <>
          {/* Trend */}
          <Card title="Activity over time" subtitle={`${metric === 'count' ? 'Number of transactions' : 'Naira value'} per ${v.trend.length && v.trend[0].label.endsWith('wk') ? 'week' : 'day'}`}
            action={
              <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
                {(['count', 'value'] as const).map(m => (
                  <button key={m} onClick={() => setMetric(m)} className={`px-2.5 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${metric === m ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}>
                    {m === 'count' ? 'Count' : 'Value'}
                  </button>
                ))}
              </div>
            }>
            <TrendChart buckets={v.trend} metric={metric} />
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <Card className="xl:col-span-3" title="By transaction type" subtitle="Value counts successful transactions only">
              <div className="space-y-3.5">
                {v.types.map(t => {
                  const max = Math.max(1, ...v.types.map(x => x.value))
                  return (
                    <div key={t.type} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] sm:grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-700 truncate">{t.label}</p>
                        <p className="text-[11px] text-slate-400">{t.count} · <span className={t.rate < 90 ? 'text-amber-700' : ''}>{t.rate}% success</span></p>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden" title={`${t.label}: ${naira(t.value)}`}>
                        <div className="h-full rounded-r" style={{ width: `${(t.value / max) * 100}%`, background: SERIES }} />
                      </div>
                      <p className="text-xs font-bold text-slate-700 tabular-nums w-20 text-right">{compactNaira(t.value)}</p>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="xl:col-span-2" title="Outcome" subtitle={`${v.txns.length} transactions`}>
              <StatusRing ok={v.ok.length} pending={v.pend.length} failed={v.bad.length} other={v.txns.length - v.ok.length - v.pend.length - v.bad.length} />
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card title="Busiest hours" subtitle="Transactions by hour of day">
              <HourChart hours={v.hours} />
            </Card>
            <Card title="Where transfers go" subtitle={`${v.transfers.length} transfers · value of successful ones`}>
              {v.destinations.length === 0 ? <p className="text-sm text-slate-400">No transfers in this period.</p> : (
                <div className="space-y-3">
                  {v.destinations.map(d => {
                    const max = Math.max(1, ...v.destinations.map(x => x.count))
                    return (
                      <div key={d.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3">
                        <p className="text-sm font-semibold text-slate-700 truncate">{d.label}</p>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full rounded-r" style={{ width: `${(d.count / max) * 100}%`, background: SERIES }} /></div>
                        <p className="text-xs text-slate-500 tabular-nums w-28 text-right"><span className="font-bold text-slate-700">{d.count}</span> · {compactNaira(d.value)}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card title="Largest successful transactions">
              <TxnList txns={v.largest} empty="No successful transactions in this period." />
            </Card>
            <Card title="Recent failures" subtitle={v.reasons.length ? undefined : 'Failure reasons are recorded for transfers only'}>
              {v.reasons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {v.reasons.slice(0, 4).map(r => (
                    <span key={r.reason} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full px-2.5 py-1">
                      <AlertTriangle size={11} /> {r.reason} <span className="text-red-500">×{r.count}</span>
                    </span>
                  ))}
                </div>
              )}
              <TxnList txns={v.recentFailures} empty="Nothing failed in this period." showReason />
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function Card({ title, subtitle, action, className = '', children }: { title: string; subtitle?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-bold text-slate-700">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: React.ReactNode; tone?: 'green' | 'amber' | 'red' }) {
  const t = tone === 'red' ? 'bg-red-50 border-red-100 [&_.v]:text-red-700' : tone === 'amber' ? 'bg-amber-50 border-amber-100 [&_.v]:text-amber-700'
    : tone === 'green' ? 'bg-emerald-50 border-emerald-100 [&_.v]:text-emerald-700' : 'bg-white border-slate-100 [&_.v]:text-slate-800'
  return (
    <div className={`rounded-2xl border shadow-sm p-4 ${t}`}>
      <div className="flex items-center gap-1.5 text-slate-500 mb-2">{icon}<p className="text-[10px] font-bold uppercase tracking-widest">{label}</p></div>
      <p className="v text-xl sm:text-2xl font-black tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>
    </div>
  )
}

/** Stacked daily bars (successful / pending / failed) on one axis, with a hover readout listing every series. */
function TrendChart({ buckets, metric }: { buckets: TrendBucket[]; metric: 'count' | 'value' }) {
  const [hover, setHover] = useState<number | null>(null)
  const val = (b: TrendBucket, k: 'success' | 'pending' | 'failed') => (metric === 'count' ? b[k] : b[`${k}Value` as 'successValue'])
  const totals = buckets.map(b => val(b, 'success') + val(b, 'pending') + val(b, 'failed'))
  const max = Math.max(1, ...totals)
  const nice = niceMax(max)
  const fmt = (n: number) => (metric === 'count' ? n.toLocaleString() : compactNaira(n))
  const every = Math.max(1, Math.ceil(buckets.length / 10))
  const h = hover !== null ? buckets[hover] : null

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-3">
        {(Object.keys(STATUS) as (keyof typeof STATUS)[]).map(k => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: STATUS[k].color }} /> {STATUS[k].label}
          </span>
        ))}
      </div>
      <div className="relative">
        {/* Recessive grid: 0, half, top */}
        <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
          {[nice, nice / 2, 0].map(g => (
            <div key={g} className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-10 text-right tabular-nums">{fmt(g)}</span>
              <span className="flex-1 border-t border-slate-100" />
            </div>
          ))}
        </div>
        <div className="relative h-56 pl-12 flex items-end gap-[2px] pb-6" onMouseLeave={() => setHover(null)}>
          {buckets.map((b, i) => (
            <button
              key={b.key}
              type="button"
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              aria-label={`${b.label}: ${val(b, 'success')} successful, ${val(b, 'pending')} pending, ${val(b, 'failed')} failed`}
              className="relative flex-1 h-full flex flex-col justify-end items-stretch group focus:outline-none"
            >
              <span className={`absolute inset-0 rounded ${hover === i ? 'bg-slate-100' : ''}`} />
              <span className="relative flex flex-col-reverse gap-[2px]" style={{ height: `${(totals[i] / nice) * 100}%` }}>
                {(['success', 'pending', 'failed'] as const).map(k => val(b, k) > 0 && (
                  <span key={k} className="w-full first:rounded-b-none last:rounded-t" style={{ flexGrow: val(b, k), background: STATUS[k].color, minHeight: 2 }} />
                ))}
              </span>
              {i % every === 0 && (
                // Every other label is hidden on phones so dates never overlap.
                <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 whitespace-nowrap ${(i / every) % 2 ? 'hidden sm:block' : ''}`}>
                  {b.label.replace(' wk', '')}
                </span>
              )}
            </button>
          ))}
        </div>
        {h && hover !== null && (
          <div
            className="absolute z-10 top-0 bg-white border border-slate-200 shadow-lg rounded-xl px-3 py-2 text-xs pointer-events-none min-w-[150px]"
            style={{ left: `calc(3rem + (100% - 3rem) * ${(hover + 0.5) / buckets.length})`, transform: hover > buckets.length / 2 ? 'translateX(-105%)' : 'translateX(8px)' }}
          >
            <p className="font-bold text-slate-700 mb-1">{h.label}</p>
            {(['success', 'pending', 'failed'] as const).map(k => (
              <p key={k} className="flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-1.5 text-slate-500"><span className="w-2 h-2 rounded-sm" style={{ background: STATUS[k].color }} />{STATUS[k].label}</span>
                <strong className="text-slate-800 tabular-nums">{fmt(val(h, k))}</strong>
              </p>
            ))}
            <p className="flex justify-between gap-4 border-t border-slate-100 mt-1 pt-1"><span className="text-slate-500">Total</span><strong className="text-slate-800">{fmt(totals[hover])}</strong></p>
          </div>
        )}
      </div>
    </div>
  )
}

function HourChart({ hours }: { hours: { hour: number; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...hours.map(h => h.count))
  const peak = hours.reduce((a, b) => (b.count > a.count ? b : a), hours[0])
  const hh = (n: number) => `${String(n).padStart(2, '0')}:00`
  return (
    <div>
      <p className="text-xs text-slate-500 mb-3">
        {peak.count ? <>Busiest at <strong className="text-slate-700">{hh(peak.hour)}–{hh((peak.hour + 1) % 24)}</strong> ({peak.count} transactions)</> : 'No activity.'}
        {hover !== null && <span className="ml-2 text-slate-700">· {hh(hover)}: <strong>{hours[hover].count}</strong></span>}
      </p>
      <div className="h-32 flex items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
        {hours.map(h => (
          <button
            key={h.hour}
            type="button"
            onMouseEnter={() => setHover(h.hour)}
            onFocus={() => setHover(h.hour)}
            aria-label={`${hh(h.hour)}: ${h.count} transactions`}
            className="flex-1 h-full flex items-end focus:outline-none"
          >
            <span className="w-full rounded-t" style={{ height: `${Math.max(h.count ? 4 : 0, (h.count / max) * 100)}%`, background: SERIES, opacity: hover === null || hover === h.hour ? 1 : 0.45 }} />
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
    </div>
  )
}

function StatusRing({ ok, pending, failed, other }: { ok: number; pending: number; failed: number; other: number }) {
  const total = Math.max(1, ok + pending + failed + other)
  const parts = [
    { k: 'success' as const, n: ok }, { k: 'pending' as const, n: pending }, { k: 'failed' as const, n: failed },
  ]
  const stops = parts.reduce<{ acc: number; list: string[] }>((s, p) => {
    if (!p.n) return s
    const to = s.acc + (p.n / total) * 100
    return { acc: to, list: [...s.list, `${STATUS[p.k].color} ${s.acc}% ${to}%`] }
  }, { acc: 0, list: [] })
  const stopsList = other ? [...stops.list, `#cbd5e1 ${stops.acc}% 100%`] : stops.list
  return (
    <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-6">
      <div className="w-36 h-36 rounded-full relative shrink-0" style={{ background: `conic-gradient(${stopsList.join(', ')})` }} role="img"
        aria-label={`${ok} successful, ${pending} pending, ${failed} failed`}>
        <div className="absolute inset-4 rounded-full bg-white flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-slate-800">{(ok + pending + failed + other).toLocaleString()}</p>
          <p className="text-[10px] text-slate-400">transactions</p>
        </div>
      </div>
      <div className="w-full space-y-2.5">
        {parts.map(p => (
          <div key={p.k} className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-xs text-slate-600">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ background: STATUS[p.k].color }}>{STATUS[p.k].icon}</span>
              {STATUS[p.k].label}
            </span>
            <span className="text-xs text-slate-500 tabular-nums"><strong className="text-slate-800">{p.n}</strong> · {Math.round((p.n / total) * 100)}%</span>
          </div>
        ))}
        {other > 0 && <p className="text-[11px] text-slate-400">{other} with another status</p>}
      </div>
    </div>
  )
}

function TxnList({ txns, empty, showReason }: { txns: Txn[]; empty: string; showReason?: boolean }) {
  if (!txns.length) return <p className="text-sm text-slate-400 py-6 text-center">{empty}</p>
  return (
    <ul className="divide-y divide-slate-100 -mx-1">
      {txns.map(t => (
        <li key={t.id} className="px-1 py-2.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">{t.typeLabel}{t.beneficiaryName && <span className="font-normal text-slate-500"> → {t.beneficiaryName}</span>}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {moment(t.createdAt).format('DD MMM, HH:mm')}{t.customerName && ` · ${t.customerName}`}{!t.customerName && t.debitAccount && ` · ${t.debitAccount}`}
            </p>
            {showReason && t.failureReason && <p className="text-[11px] text-red-600 mt-0.5">{t.failureReason}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-slate-800 tabular-nums">{naira(t.amount)}</p>
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${STATUS_TEXT[t.group]}`}>{statusLabel(t.status)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/** A round axis maximum (1, 2, 2.5, 5 × 10ⁿ) so gridline labels read cleanly. */
function niceMax(n: number) {
  const p = 10 ** Math.floor(Math.log10(n))
  return ([1, 2, 2.5, 5, 10].map(m => m * p).find(m => m >= n)) ?? n
}
