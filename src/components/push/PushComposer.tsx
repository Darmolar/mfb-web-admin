import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { PushData } from '../../api/types'

export type PushMessage = { title: string; body: string; data?: PushData; saveInApp: boolean }

type DataRow = { key: string; value: string }

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1'

// eslint-disable-next-line react-refresh/only-export-components
export function usePushMessage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [rows, setRows] = useState<DataRow[]>([])
  const [saveInApp, setSaveInApp] = useState(true)

  const data: PushData | undefined = (() => {
    const entries = rows.filter(r => r.key.trim()).map(r => [r.key.trim(), r.value] as const)
    return entries.length ? Object.fromEntries(entries) : undefined
  })()

  const message: PushMessage = { title: title.trim(), body: body.trim(), data, saveInApp }
  const valid = message.title.length > 0 && message.body.length > 0
  const reset = () => { setTitle(''); setBody(''); setRows([]); setSaveInApp(true) }

  return { title, setTitle, body, setBody, rows, setRows, saveInApp, setSaveInApp, message, valid, reset }
}

type Props = ReturnType<typeof usePushMessage> & { disabled?: boolean }

/** Title / body / optional data pairs / save-in-app toggle. Shared by single-customer and broadcast sends. */
export function PushComposer({ title, setTitle, body, setBody, rows, setRows, saveInApp, setSaveInApp, disabled }: Props) {
  const updateRow = (i: number, patch: Partial<DataRow>) =>
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Title</label>
        <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Your payment is ready" maxLength={100} disabled={disabled} />
      </div>
      <div>
        <label className={labelCls}>Message</label>
        <textarea className={`${inputCls} resize-none`} rows={3} value={body} onChange={e => setBody(e.target.value)} placeholder="Tap to view details." maxLength={500} disabled={disabled} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={`${labelCls} mb-0`}>Data payload <span className="normal-case font-normal tracking-normal">(optional key-value pairs sent to the app)</span></label>
          <button
            type="button"
            onClick={() => setRows(rs => [...rs, { key: '', value: '' }])}
            disabled={disabled}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Plus size={12} /> Add pair
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="text-xs text-slate-400">No data attached. Example: <span className="font-mono">type = PROMO</span>, <span className="font-mono">url = /offers</span></p>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={inputCls} value={r.key} onChange={e => updateRow(i, { key: e.target.value })} placeholder="key" disabled={disabled} />
                <input className={inputCls} value={r.value} onChange={e => updateRow(i, { value: e.target.value })} placeholder="value" disabled={disabled} />
                <button type="button" onClick={() => setRows(rs => rs.filter((_, idx) => idx !== i))} disabled={disabled} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer shrink-0">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={saveInApp} onChange={e => setSaveInApp(e.target.checked)} disabled={disabled} className="rounded border-slate-300" />
        <span className="text-xs font-semibold text-slate-600">Also save as an in-app notification</span>
      </label>
    </div>
  )
}
