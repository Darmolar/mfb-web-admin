import { useState } from 'react'
import { Check, Copy, MapPin, ShieldAlert } from 'lucide-react'
import moment from 'moment'
import { Badge, statusBadge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { naira, type Txn } from '../../api/transactions'

const statusLabel = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()
const maskBvn = (bvn: string) => (bvn.length > 6 ? `${bvn.slice(0, 3)}•••••${bvn.slice(-3)}` : bvn)
const isTransfer = (t: Txn) => !!(t.beneficiaryName || t.bankName || t.type.startsWith('TRANSFER') || ['TO_OTHER_BANK', 'TO_MEMPHIS', 'INTERNAL'].includes(t.type))

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [done, setDone] = useState(false)
  if (!value) return null
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation()
        void navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) })
      }}
      className="inline-flex items-center text-slate-300 hover:text-slate-600 cursor-pointer align-middle"
      title={done ? 'Copied' : label}
      aria-label={done ? 'Copied' : label}
    >
      {done ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  )
}

/** Full details of one transaction or transfer: who, to whom, why it failed, and what's needed to trace it. */
export function TxnDetailsModal({ txn, onClose }: { txn: Txn | null; onClose: () => void }) {
  return (
    <Modal open={!!txn} onClose={onClose} title={txn && isTransfer(txn) ? 'Transfer details' : 'Transaction details'} width="max-w-2xl">
      {txn && <Body t={txn} />}
    </Modal>
  )
}

function Body({ t }: { t: Txn }) {
  const c = t.customer
  const transfer = isTransfer(t)
  const total = t.amount + (t.fee ?? 0)
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-black text-slate-800">{naira(t.amount)}</p>
          <p className="text-sm text-slate-500">
            {t.typeLabel}{t.description && ` · ${t.description}`} · {t.createdAt ? moment(t.createdAt).format('DD MMM YYYY, HH:mm:ss') : '—'}
          </p>
        </div>
        <Badge label={statusLabel(t.status)} variant={statusBadge(statusLabel(t.status))} size="md" />
      </div>

      {t.failureReason && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Why it failed</p>
          <p className="text-sm text-red-700">{t.failureReason}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-100 px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{transfer ? 'From (sender)' : 'Customer'}</p>
          <p className="text-sm font-semibold text-slate-800">{c?.name || t.customerName || 'Unknown customer'}</p>
          <p className="text-xs text-slate-500 font-mono">{t.debitAccount || c?.accountNumber || '—'}</p>
          {c && (
            <dl className="mt-2 space-y-0.5 text-xs">
              {c.phone && <Row label="Phone" value={c.phone} />}
              {c.email && <Row label="Email" value={c.email} />}
              {c.bvn && <Row label="BVN" value={maskBvn(c.bvn)} />}
              {c.tier && <Row label="Tier" value={`Tier ${c.tier}`} />}
              {c.status && <Row label="Account" value={statusLabel(c.status)} />}
            </dl>
          )}
          {c?.blocked && (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 rounded-full px-2 py-0.5">
              <ShieldAlert size={11} /> Transactions blocked{c.blockReason && `: ${c.blockReason}`}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-100 px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{transfer ? 'To (recipient)' : 'Paid to'}</p>
          <p className="text-sm font-semibold text-slate-800">{t.beneficiaryName || (transfer ? '—' : t.description || '—')}</p>
          <p className="text-xs text-slate-500 font-mono">{t.creditAccount || '—'}</p>
          {(t.bankName || t.bankCode) && <p className="text-xs text-slate-500 mt-0.5">{t.bankName}{t.bankCode && ` (code ${t.bankCode})`}</p>}
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <Field label="Amount" value={naira(t.amount)} />
        <Field label="Fee" value={naira(t.fee)} />
        <Field label="Total debited" value={naira(total)} />
        <Field label="Reference" value={<span className="inline-flex items-center gap-1.5 break-all">{t.reference} <CopyButton value={t.reference} label="Copy reference" /></span>} />
        {transfer && (
          <Field
            label="Session ID"
            value={t.sessionId
              ? <span className="inline-flex items-center gap-1.5 break-all">{t.sessionId} <CopyButton value={t.sessionId} label="Copy session ID" /></span>
              : <span className="text-amber-700 font-medium">Not recorded</span>}
          />
        )}
        {t.ipAddress && <Field label="IP address" value={t.ipAddress} />}
      </dl>

      {transfer && (
        <div className="bg-slate-50 rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Where it was made</p>
          {t.location ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" /> {t.location.lat.toFixed(4)}, {t.location.lng.toFixed(4)}
              </span>
              <a href={`https://www.google.com/maps?q=${t.location.lat},${t.location.lng}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
                View on Google Maps
              </a>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Not captured for this transfer.</p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-2"><dt className="text-slate-400 w-14 shrink-0">{label}</dt><dd className="text-slate-600 break-all">{value}</dd></div>
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</dt>
      <dd className="text-sm font-semibold text-slate-700 mt-0.5">{value}</dd>
    </div>
  )
}
