import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react'
import type { CardProductRequirement } from '../../api/types'
import { REQUIREMENT_FIELD_TYPES, cleanRequirements, readRequirements } from '../../api/cards'
import { Button } from './Button'
import { Modal } from './Modal'
import { LoadingRegion, Skeleton } from './Skeleton'

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'
const TYPE_LABELS: Record<string, string> = { text: 'Text', number: 'Number', date: 'Date', select: 'Dropdown', file: 'File upload' }
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

type Props = {
  /** Product being edited; null closes the editor. */
  target: { id: string; name: string } | null
  intro: string
  emptyText: string
  load: (id: string) => Promise<{ data: unknown }>
  save: (id: string, requirements: CardProductRequirement[]) => Promise<unknown>
  onClose: () => void
  onSaved: (message: string) => void
}

/** Edits the extra fields customers fill in when applying for a product (cards and loans share the format). */
export function RequirementsEditor({ target, intro, emptyText, load, save, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<CardProductRequirement[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedFor, setLoadedFor] = useState<string | null>(null)

  // Start a fresh load whenever a different product is opened.
  if (target && target.id !== loadedFor) {
    setLoadedFor(target.id)
    setRows([])
    setError(null)
    setLoading(true)
  }
  if (!target && loadedFor !== null) setLoadedFor(null)

  // Parents pass a fresh `load` on every render; keep the latest without re-fetching (which would wipe edits).
  const loadRef = useRef(load)
  useEffect(() => { loadRef.current = load }, [load])
  const targetId = target?.id

  useEffect(() => {
    if (!targetId) return
    let cancelled = false
    loadRef.current(targetId)
      .then(res => { if (!cancelled) setRows(readRequirements(res.data)) })
      .catch(e => { if (!cancelled) setError(`Could not load the current requirements: ${errText(e, 'unknown error')}. Saving would replace them.`) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [targetId])

  const update = (i: number, patch: Partial<CardProductRequirement>) => setRows(r => r.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const move = (i: number, by: number) => setRows(r => { const next = [...r]; const [row] = next.splice(i, 1); next.splice(i + by, 0, row); return next })

  async function submit() {
    if (!target) return
    const cleaned = cleanRequirements(rows)
    if ('error' in cleaned) { setError(cleaned.error); return }
    setSaving(true)
    setError(null)
    try {
      await save(target.id, cleaned.requirements)
      onSaved(`Requirements for ${target.name} saved (${cleaned.requirements.length} field${cleaned.requirements.length === 1 ? '' : 's'}).`)
      onClose()
    } catch (e) {
      setError(errText(e, 'The requirements could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title={`Application requirements · ${target?.name ?? ''}`} width="max-w-3xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500">{intro}</p>
        {loading ? (
          <LoadingRegion label="Loading requirements…" className="space-y-3">
            {[0, 1].map(i => (
              <div key={i} className="border border-slate-100 rounded-xl p-3 sm:p-4 space-y-3 bg-slate-50/40">
                <Skeleton className="h-2.5 w-16" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[0, 1, 2].map(j => <div key={j} className="space-y-1.5"><Skeleton className="h-2.5 w-24" /><Skeleton className="h-9 w-full rounded-lg" /></div>)}
                </div>
              </div>
            ))}
          </LoadingRegion>
        ) : (
          <div className="space-y-3">
            {rows.length === 0 && <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">{emptyText}</p>}
            {rows.map((r, i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-3 sm:p-4 space-y-3 bg-slate-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Field {i + 1}</span>
                  <div className="flex gap-1">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer" title="Move up"><ArrowUp size={13} /></button>
                    <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer" title="Move down"><ArrowDown size={13} /></button>
                    <button type="button" onClick={() => setRows(x => x.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-red-600 cursor-pointer" title="Remove"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Label shown to customer">
                    <input className={inputCls} value={r.label ?? ''} onChange={e => update(i, { label: e.target.value })} placeholder="Employment letter" />
                  </Field>
                  <Field label="Key">
                    <input className={`${inputCls} font-mono`} value={r.fieldKey ?? ''} onChange={e => update(i, { fieldKey: e.target.value })} placeholder="employmentLetter" />
                  </Field>
                  <Field label="Answer type">
                    <select className={inputCls} value={r.fieldType ?? 'text'} onChange={e => update(i, { fieldType: e.target.value })}>
                      {REQUIREMENT_FIELD_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                    </select>
                  </Field>
                  {r.fieldType === 'select' && (
                    <div className="sm:col-span-3">
                      <Field label="Dropdown options" hint="Separate with commas.">
                        <input className={inputCls} value={r.optionsCsv ?? ''} onChange={e => update(i, { optionsCsv: e.target.value })} placeholder="Option A, Option B" />
                      </Field>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <Field label="Help text">
                      <input className={inputCls} value={r.helpText ?? ''} onChange={e => update(i, { helpText: e.target.value })} placeholder="Shown under the field" />
                    </Field>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer sm:pt-6">
                    <input type="checkbox" className="accent-slate-700" checked={!!r.required} onChange={e => update(i, { required: e.target.checked })} />
                    Required
                  </label>
                </div>
              </div>
            ))}
            <Button type="button" size="sm" variant="secondary" onClick={() => setRows(x => [...x, { fieldKey: '', label: '', fieldType: 'text', required: true, optionsCsv: '', helpText: '' }])}>
              <Plus size={13} /> Add field
            </Button>
          </div>
        )}
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button variant="secondary" className="sm:flex-1 justify-center" onClick={onClose}>Cancel</Button>
          <Button className="sm:flex-1 justify-center" onClick={submit} disabled={saving || loading}>
            {saving && <Loader2 size={14} className="animate-spin" />} Save requirements
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </div>
  )
}
