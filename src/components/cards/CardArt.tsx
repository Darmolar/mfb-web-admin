import { CreditCard } from 'lucide-react'

const SCHEME_STYLE: Record<string, string> = {
  VERVE: 'from-emerald-700 to-emerald-900',
  MASTERCARD: 'from-slate-700 to-slate-900',
  VISA: 'from-indigo-700 to-indigo-950',
}

/** A bank-card drawing used for products (no number yet) and for issued requests (last 4 digits). */
export function CardArt({ name, scheme, last4, account, expiry, tag, muted, className = '' }: {
  name: string
  scheme: string
  last4?: string
  account?: string
  expiry?: string
  tag?: string
  muted?: boolean
  className?: string
}) {
  return (
    <div className={`relative rounded-2xl p-4 text-white bg-gradient-to-br ${SCHEME_STYLE[scheme] ?? 'from-slate-600 to-slate-800'} aspect-[1.586] w-full shadow-md flex flex-col justify-between overflow-hidden ${muted ? 'grayscale opacity-60' : ''} ${className}`}>
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -left-10 -bottom-12 w-36 h-36 rounded-full bg-white/5" />
      <div className="flex items-start justify-between relative">
        <div className="pr-2 min-w-0">
          <p className="text-[11px] font-semibold text-white/85 leading-tight truncate">{name || 'New card product'}</p>
          {tag && <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-widest bg-white/15 rounded px-1.5 py-0.5">{tag}</span>}
        </div>
        <CreditCard size={18} className="text-white/70 shrink-0" />
      </div>
      <div className="relative">
        <span className="block w-8 h-6 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 mb-2 opacity-90" aria-hidden="true" />
        <p className="font-mono text-sm sm:text-base tracking-widest">•••• •••• •••• {last4 || '••••'}</p>
      </div>
      <div className="flex items-end justify-between relative text-[10px]">
        <div className="min-w-0">
          {account !== undefined && (
            <>
              <p className="text-white/60 uppercase tracking-wider">Linked account</p>
              <p className="font-mono text-xs truncate">{account || '—'}</p>
            </>
          )}
          {account === undefined && <p className="text-white/60 uppercase tracking-wider">Memphis MFB</p>}
        </div>
        <div className="text-right">
          {expiry && <p className="font-mono text-xs">{expiry}</p>}
          <p className="font-black tracking-wider text-xs">{scheme || 'CARD'}</p>
        </div>
      </div>
    </div>
  )
}
