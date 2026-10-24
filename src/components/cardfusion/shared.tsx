import { useState } from 'react'
import { AlertTriangle, Check, Copy, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'

export function Notice({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const styles = tone === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`border rounded-xl px-4 py-3 text-sm ${styles}`}>{children}</div>
}

export const inputClass = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300'

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-500 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  )
}

// One-time secrets (temporary passwords, office tokens) are shown once and never stored.
export function OneTimeSecret({ label, value, warning, onDone }: { label: string; value: string; warning: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800">
        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
        <p>{warning}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 break-all select-all">{value}</code>
          <Button variant="secondary" size="sm" onClick={copy} aria-label={`Copy ${label.toLowerCase()}`}>
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
      <Button fullWidth onClick={onDone}>I have saved it</Button>
    </div>
  )
}

/** Page section heading with its actions; actions wrap under the text on phones. */
export function SectionHeader({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold text-slate-700">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{text}</p>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button variant="secondary" size="sm" onClick={onClick} disabled={loading} aria-label="Refresh">
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> <span className="hidden sm:inline">Refresh</span>
    </Button>
  )
}

export function Tile({ label, value, sub, tone }: { label: string; value: number | string; sub: string; tone?: 'amber' | 'red' }) {
  const box = tone === 'amber' ? 'bg-amber-50 border-amber-100' : tone === 'red' ? 'bg-red-50 border-red-100' : 'bg-white border-slate-100'
  const ink = tone === 'amber' ? 'text-amber-700' : tone === 'red' ? 'text-red-700' : 'text-slate-800'
  return (
    <div className={`rounded-2xl border shadow-sm p-3 sm:p-4 min-w-0 ${box}`}>
      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-slate-500 leading-tight">{label}</p>
      <p className={`text-xl sm:text-2xl font-black mt-1 ${ink}`}>{value}</p>
      <p className="hidden sm:block text-xs text-slate-500 truncate">{sub}</p>
    </div>
  )
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

export function Avatar({ name }: { name: string }) {
  return <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black shrink-0">{initials(name)}</span>
}
