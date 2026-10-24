import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw, Save } from 'lucide-react'
import { debitPendingFees, getFeeBatches, getFeeCharges, getFeeSettings, getFeeSummary, updateFeeSettings } from '../../api'
import type { FeeBatch, FeeCharge, FeeSettings, FeeSettingsUpdate, FeeStatus, FeeType } from '../../api/types'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { FormSkeleton, Skeleton, SkeletonTableRows, StatCardsSkeleton } from '../ui/Skeleton'

const TYPES: FeeType[] = ['SMS', 'BVN_VERIFICATION', 'NIN_VERIFICATION', 'FACE_VERIFICATION']
const STATUS_OPTIONS: Array<FeeStatus | 'ALL'> = ['ALL', 'PENDING', 'BATCHED', 'DEBITED', 'SKIPPED']
const money = (amount: number | undefined) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount ?? 0)
const show = (value: string | null | undefined) => value || '—'
const initialDraft = (): FeeSettingsUpdate => ({ smsFee: '', bvnFee: '', ninFee: '', faceFee: '', debitAccount: '', creditAccount: '', autoDebitEnabled: false, debitCron: '0 0 2 * * MON' })

function toDraft(settings: FeeSettings): FeeSettingsUpdate {
  return {
    smsFee: settings['fee.sms'] ?? '', bvnFee: settings['fee.bvn_verification'] ?? '', ninFee: settings['fee.nin_verification'] ?? '', faceFee: settings['fee.face_verification'] ?? '',
    debitAccount: settings['fee.debit.account'] ?? '', creditAccount: settings['fee.credit.account'] ?? '',
    autoDebitEnabled: settings['fee.auto_debit.enabled'] === 'true', debitCron: settings['fee.debit.cron'] ?? '0 0 2 * * MON',
  }
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return <div className="flex items-center justify-end gap-3 text-xs text-slate-600"><Button size="sm" variant="secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</Button><span>Page {page + 1} of {totalPages}</span><Button size="sm" variant="secondary" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Next</Button></div>
}

export function FeeManagement() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getFeeSummary>> | null>(null)
  const [draft, setDraft] = useState<FeeSettingsUpdate>(initialDraft)
  const [charges, setCharges] = useState<{ content: FeeCharge[]; totalPages?: number } | null>(null)
  const [batches, setBatches] = useState<{ content: FeeBatch[]; totalPages?: number } | null>(null)
  const [chargePage, setChargePage] = useState(0)
  const [batchPage, setBatchPage] = useState(0)
  const [chargeStatus, setChargeStatus] = useState<FeeStatus | 'ALL'>('PENDING')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [debiting, setDebiting] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const generation = useRef(0)

  const refresh = async () => {
    const current = ++generation.current
    setLoading(true)
    try {
      const [nextSummary, nextSettings, nextCharges, nextBatches] = await Promise.all([
        getFeeSummary(), getFeeSettings(), getFeeCharges({ status: chargeStatus === 'ALL' ? undefined : chargeStatus, page: chargePage, size: 20 }), getFeeBatches({ page: batchPage, size: 20 }),
      ])
      if (current !== generation.current) return
      setSummary(nextSummary); setDraft(toDraft(nextSettings)); setCharges(nextCharges); setBatches(nextBatches)
    } catch (error) {
      if (current === generation.current) setNotice({ ok: false, text: error instanceof Error ? error.message : 'Unable to load fee data.' })
    } finally { if (current === generation.current) setLoading(false) }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void refresh() }, [chargePage, batchPage, chargeStatus])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving) return
    if (draft.autoDebitEnabled && (!draft.debitAccount?.trim() || !draft.creditAccount?.trim())) { setNotice({ ok: false, text: 'Set both debit and credit accounts before enabling auto-debit.' }); return }
    setSaving(true); setNotice(null)
    try { await updateFeeSettings(draft); setNotice({ ok: true, text: 'Fee configuration updated.' }); await refresh() }
    catch (error) { setNotice({ ok: false, text: error instanceof Error ? error.message : 'Unable to update fee settings.' }) }
    finally { setSaving(false) }
  }
  const debit = async () => {
    if (debiting || !summary || summary.pendingTotal <= 0) return
    if (!window.confirm(`Post a debit of ${money(summary.pendingTotal)} for pending fees?`)) return
    setDebiting(true); setNotice(null)
    try {
      const batch = await debitPendingFees()
      if (batch.status === 'FAILED') setNotice({ ok: false, text: batch.failureReason ?? 'The bulk debit was rejected.' })
      else setNotice({ ok: true, text: `Bulk debit posted for ${money(batch.totalAmount)} across ${batch.chargeCount ?? 0} charges.` })
      await refresh()
    } catch (error) { setNotice({ ok: false, text: error instanceof Error ? error.message : 'Unable to post bulk debit.' }) }
    finally { setDebiting(false) }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold text-slate-800">Fee Management</h3><p className="text-xs text-slate-500 mt-1">Review fee charges, configure rates, and post pending fees to CBA.</p></div><Button variant="secondary" disabled={loading} onClick={() => void refresh()}>{loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh</Button></div>
    {notice && <p role={notice.ok ? 'status' : 'alert'} className={`rounded-xl p-3 text-sm ${notice.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{notice.text}</p>}
    {loading && !summary ? <StatCardsSkeleton count={4} className="grid gap-3 md:grid-cols-4" /> : <div className="grid gap-3 md:grid-cols-4">
      <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs text-slate-500">Pending total</p><p className="mt-1 text-xl font-bold text-slate-800">{summary ? money(summary.pendingTotal) : '—'}</p></div>
      <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs text-slate-500">Auto debit</p><p className="mt-1 font-bold text-slate-800">{summary?.autoDebitEnabled ? 'Enabled' : 'Disabled'}</p></div>
      <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs text-slate-500">Debit account</p><p className="mt-1 font-mono text-sm font-bold text-slate-800">{show(summary?.debitAccount)}</p></div>
      <div className="rounded-2xl border border-slate-100 bg-white p-4"><p className="text-xs text-slate-500">Credit account</p><p className="mt-1 font-mono text-sm font-bold text-slate-800">{show(summary?.creditAccount)}</p></div>
    </div>}
    <div className="grid gap-3 md:grid-cols-4">{TYPES.map(type => <div key={type} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-bold tracking-wide text-slate-500">{type.replace('_', ' ')}</p>{loading && !summary ? <Skeleton className="mt-2 h-3.5 w-28" /> : <p className="mt-1 text-sm font-semibold">{summary?.breakdown[type]?.count ?? 0} charges · {money(summary?.breakdown[type]?.total)}</p>}</div>)}</div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2"><AlertTriangle className="text-amber-700" size={18}/><p className="text-sm text-amber-900">Manual debit posts all pending fees. Confirm the accounts and total before continuing.</p></div><Button variant="danger" disabled={debiting || !summary || summary.pendingTotal <= 0} onClick={() => void debit()}>{debiting && <Loader2 size={14} className="animate-spin" />}{debiting ? 'Posting…' : 'Post pending debit'}</Button></div>
    {loading && !summary ? <FormSkeleton fields={7} /> : <form onSubmit={save} className="rounded-2xl border border-slate-100 bg-white p-5 space-y-4"><h4 className="font-bold text-slate-800">Fee configuration</h4><div className="grid gap-4 md:grid-cols-2">{([['smsFee','SMS fee'],['bvnFee','BVN verification fee'],['ninFee','NIN verification fee'],['faceFee','Face verification fee'],['debitAccount','Debit account'],['creditAccount','Credit account'],['debitCron','Debit schedule (cron)']] as const).map(([key,label]) => <label key={key} className="text-xs font-semibold text-slate-600">{label}<input required={key !== 'debitCron'} disabled={saving} value={draft[key] as string} onChange={e => setDraft(old => ({...old,[key]:e.target.value}))} className="mt-1 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-normal" /></label>)}</div><label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={!!draft.autoDebitEnabled} disabled={saving} onChange={e => setDraft(old => ({...old,autoDebitEnabled:e.target.checked}))}/> Enable automatic debit</label><div className="flex justify-end"><Button type="submit" disabled={saving}>{saving && <Loader2 size={14} className="animate-spin"/>}<Save size={14}/>Save fee settings</Button></div></form>}
    <section className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-bold text-slate-800">Fee charges</h4><select value={chargeStatus} onChange={e => { setChargePage(0); setChargeStatus(e.target.value as FeeStatus | 'ALL') }} className="rounded-lg border border-slate-200 p-2 text-sm">{STATUS_OPTIONS.map(status => <option key={status}>{status}</option>)}</select></div><div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Type','Provider','Amount','Reference','Status','Created'].map(v=><th key={v} className="px-4 py-3">{v}</th>)}</tr></thead><tbody>{loading && !charges ? <SkeletonTableRows columns={6} rows={4} /> : charges?.content.map(row=><tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3">{row.feeType}</td><td className="px-4 py-3">{show(row.provider)}</td><td className="px-4 py-3">{money(row.amount)}</td><td className="px-4 py-3 font-mono">{show(row.reference)}</td><td className="px-4 py-3"><Badge label={row.status} variant={row.status === 'PENDING' ? 'amber' : 'slate'} /></td><td className="px-4 py-3">{show(row.createdAt)}</td></tr>)}</tbody></table>{!loading && !charges?.content.length && <p className="p-6 text-center text-sm text-slate-500">No fee charges found.</p>}</div><Pager page={chargePage} totalPages={charges?.totalPages ?? 0} onChange={setChargePage}/></section>
    <section className="space-y-3"><h4 className="font-bold text-slate-800">Debit batches</h4><div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{['Amount','Charges','CBA reference','Status','Result','Created'].map(v=><th key={v} className="px-4 py-3">{v}</th>)}</tr></thead><tbody>{loading && !batches ? <SkeletonTableRows columns={6} rows={3} /> : batches?.content.map(row=><tr key={row.id ?? row.createdAt} className="border-t border-slate-100"><td className="px-4 py-3">{money(row.totalAmount)}</td><td className="px-4 py-3">{row.chargeCount ?? '—'}</td><td className="px-4 py-3 font-mono">{show(row.cbaReference)}</td><td className="px-4 py-3"><Badge label={row.status} variant={row.status === 'SUCCESS' ? 'green' : row.status === 'FAILED' ? 'red' : 'amber'} /></td><td className="px-4 py-3">{show(row.failureReason)}</td><td className="px-4 py-3">{show(row.createdAt)}</td></tr>)}</tbody></table>{!loading && !batches?.content.length && <p className="p-6 text-center text-sm text-slate-500">No debit batches found.</p>}</div><Pager page={batchPage} totalPages={batches?.totalPages ?? 0} onChange={setBatchPage}/></section>
  </div>
}
