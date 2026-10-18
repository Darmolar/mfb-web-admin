import { useState } from 'react'
import { AlertTriangle, Check, Copy } from 'lucide-react'
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
