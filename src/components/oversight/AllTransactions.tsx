import { useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Filter, RotateCcw } from 'lucide-react'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useApi } from '../../hooks/useApi'
import { getAllTransactions } from '../../api'
import { STATUS_FILTERS, TXN_TYPES, naira, readTxns, type Txn } from '../../api/transactions'
import moment from 'moment'
import { Skeleton, SkeletonTableRows } from '../ui/Skeleton'

const PAGE_SIZE = 50

type Filters = { customerId: string; type: string; status: string; from: string; to: string }
const EMPTY: Filters = { customerId: '', type: '', status: '', from: '', to: '' }

const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

export function AllTransactions() {
  const [draft, setDraft] = useState<Filters>(EMPTY)
  const [filters, setFilters] = useState<Filters>(EMPTY)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Txn | null>(null)

  const { data, loading, error, refetch } = useApi(
    async () => {
      const params: Record<string, string | number> = { page, size: PAGE_SIZE }
      for (const [k, v] of Object.entries(filters)) if (v.trim()) params[k] = v.trim()
      const res = (await getAllTransactions(params)).data
      return { rows: readTxns(res), total: res.totalElements ?? 0, totalPages: res.totalPages }
    },
    [page, filters],
  )

  const rows = data?.rows ?? []
  const total = data?.total ?? rows.length
  const totalPages = data?.totalPages ?? Math.max(1, Math.ceil(total / PAGE_SIZE))
  const active = Object.values(filters).filter(Boolean).length

  const apply = (e: FormEvent) => { e.preventDefault(); setPage(0); setFilters(draft) }
  const reset = () => { setDraft(EMPTY); setPage(0); setFilters(EMPTY) }

  const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200'
  const label = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest'

  return (
    <div className="space-y-5">
      <form onSubmit={apply} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 grid grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <label className="space-y-1 col-span-2">
          <span className={label}>Customer ID</span>
          <input className={input} value={draft.customerId} placeholder="All customers"
            onChange={e => setDraft(d => ({ ...d, customerId: e.target.value }))} />
        </label>
        <label className="space-y-1">
          <span className={label}>Type</span>
          <select className={input} value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}>
            <option value="">Any type</option>
            {Object.entries(TXN_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className={label}>Status</span>
          <select className={input} value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
            <option value="">Any status</option>
            {STATUS_FILTERS.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className={label}>From</span>
          <input type="date" className={input} value={draft.from} onChange={e => setDraft(d => ({ ...d, from: e.target.value }))} />
        </label>
        <label className="space-y-1">
          <span className={label}>To</span>
          <input type="date" className={input} value={draft.to} min={draft.from || undefined}
            onChange={e => setDraft(d => ({ ...d, to: e.target.value }))} />
        </label>
        <div className="col-span-2 lg:col-span-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={!active && !Object.values(draft).some(Boolean)}><RotateCcw size={13} /> Reset</Button>
          <Button type="submit" size="sm"><Filter size={13} /> Apply filters</Button>
        </div>
      </form>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">All transactions</h3>
          {loading ? <Skeleton className="h-3 w-16" /> : <span className="text-xs text-slate-400">{`${total.toLocaleString()} ${active ? 'matching' : 'total'}`}</span>}
        </div>

        {error && !loading ? (
          <div className="text-center py-16">
            <p className="text-sm text-red-500 mb-3">Could not load transactions: {error}</p>
            <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
          </div>
        ) : !loading && rows.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-16">No transactions match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  {['Date', 'Type', 'Reference', 'From → To', 'Amount', 'Status'].map(h =>
                    <th key={h} className="px-4 sm:px-6 py-3 font-bold whitespace-nowrap">{h}</th>)}
                </tr>
              </thead>
              <tbody aria-busy={loading || undefined}>
                {loading ? <SkeletonTableRows columns={6} rows={8} /> : rows.map(t => (
                  <tr key={t.id} onClick={() => setSelected(t)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 sm:px-6 py-3 text-xs text-slate-500 whitespace-nowrap">{t.createdAt ? moment(t.createdAt).format('DD MMM YYYY, HH:mm') : '—'}</td>
                    <td className="px-4 sm:px-6 py-3 min-w-[160px]">
                      <p className="text-xs font-semibold text-slate-700">{t.typeLabel}</p>
                      {t.description && <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{t.description}</p>}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-[11px] font-mono text-slate-500 max-w-[220px] truncate" title={t.reference}>{t.reference}</td>
                    <td className="px-4 sm:px-6 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">
                      {t.debitAccount || t.creditAccount ? `${t.debitAccount || '—'} → ${t.creditAccount || '—'}` : '—'}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm font-bold text-slate-700 tabular-nums whitespace-nowrap">{naira(t.amount)}</td>
                    <td className="px-4 sm:px-6 py-3">{t.status ? <Badge label={statusLabel(t.status)} variant={statusBadge(statusLabel(t.status))} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">Page {page + 1} of {Math.max(1, totalPages)}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={13} /> Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={loading || page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight size={13} />
            </Button>
          </div>
        </div>
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Transaction details" width="max-w-xl">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-black text-slate-800">{naira(selected.amount)}</p>
                <p className="text-sm text-slate-500">{selected.typeLabel}{selected.description && ` · ${selected.description}`}</p>
              </div>
              <Badge label={statusLabel(selected.status)} variant={statusBadge(statusLabel(selected.status))} size="md" />
            </div>
            {selected.failureReason && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Why it failed</p>
                <p className="text-sm text-red-700">{selected.failureReason}</p>
              </div>
            )}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {[
                ['Date', selected.createdAt ? moment(selected.createdAt).format('DD MMM YYYY, HH:mm:ss') : '—'],
                ['Fee', naira(selected.fee)],
                ['From account', selected.debitAccount || '—'],
                ['To account', selected.creditAccount || '—'],
                ['Reference', selected.reference],
                ['Customer ID', selected.customerId || '—'],
              ].map(([l, v]) => (
                <div key={l} className="min-w-0">
                  <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{l}</dt>
                  <dd className="text-sm font-semibold text-slate-700 mt-0.5 break-all">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Modal>
    </div>
  )
}
