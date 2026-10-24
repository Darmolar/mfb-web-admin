import { useState } from 'react'
import { ArrowDown, ArrowUp, ListChecks, Loader2, Pencil, Plus, Power, PowerOff, RefreshCw, Trash2 } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import {
  activateCardProduct, createCardProduct, deactivateCardProduct, getCardProductRequirements, getCardProducts,
  updateCardProduct, updateCardProductRequirements,
} from '../../api'
import type { CardProductRequirement } from '../../api/types'
import {
  CARD_TYPES, EMPTY_PRODUCT_FORM, REQUIREMENT_FIELD_TYPES, cleanRequirements, naira, productPayload, productToForm,
  readCardProducts, readRequirements, type CardProductForm, type CardProductRecord,
} from '../../api/cards'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { LoadingRegion, Skeleton } from '../ui/Skeleton'

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

export function CardProducts() {
  const { user } = useAuth()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const { data, loading, error, refetch } = useApi(async () => readCardProducts((await getCardProducts({ size: '100' })).data), [])
  const products = data ?? []

  // Create / edit
  const [editing, setEditing] = useState<CardProductRecord | 'new' | null>(null)
  const [form, setForm] = useState<CardProductForm>(EMPTY_PRODUCT_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Activate / deactivate
  const [toggling, setToggling] = useState<CardProductRecord | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)

  // Requirements
  const [reqProduct, setReqProduct] = useState<CardProductRecord | null>(null)
  const [reqRows, setReqRows] = useState<CardProductRequirement[]>([])
  const [reqLoading, setReqLoading] = useState(false)
  const [reqSaving, setReqSaving] = useState(false)
  const [reqError, setReqError] = useState<string | null>(null)

  function openForm(p: CardProductRecord | 'new') {
    setEditing(p)
    setForm(p === 'new' ? EMPTY_PRODUCT_FORM : productToForm(p))
    setFormError(null)
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !editing) return
    const built = productPayload(form, user.adminId)
    if ('error' in built) { setFormError(built.error); return }
    setSaving(true)
    setFormError(null)
    try {
      if (editing === 'new') await createCardProduct(built.payload)
      else await updateCardProduct(editing.id, built.payload)
      setNotice({ ok: true, text: `${built.payload.name} ${editing === 'new' ? 'created' : 'updated'}.` })
      setEditing(null)
      refetch()
    } catch (err) {
      setFormError(errText(err, 'The product could not be saved.'))
    } finally {
      setSaving(false)
    }
  }

  async function confirmToggle() {
    if (!toggling || !user) return
    setToggleBusy(true)
    try {
      if (toggling.active) await deactivateCardProduct(toggling.id, user.adminId)
      else await activateCardProduct(toggling.id, user.adminId)
      setNotice({ ok: true, text: `${toggling.name} ${toggling.active ? 'deactivated' : 'activated'}.` })
      setToggling(null)
      refetch()
    } catch (err) {
      setNotice({ ok: false, text: errText(err, 'The status could not be changed.') })
      setToggling(null)
    } finally {
      setToggleBusy(false)
    }
  }

  async function openRequirements(p: CardProductRecord) {
    setReqProduct(p)
    setReqRows([])
    setReqError(null)
    setReqLoading(true)
    try {
      setReqRows(readRequirements((await getCardProductRequirements(p.id)).data))
    } catch (err) {
      setReqError(`Could not load the current requirements: ${errText(err, 'unknown error')}. Saving would replace them.`)
    } finally {
      setReqLoading(false)
    }
  }

  const updateRow = (i: number, patch: Partial<CardProductRequirement>) =>
    setReqRows(rows => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const moveRow = (i: number, by: number) =>
    setReqRows(rows => {
      const next = [...rows]
      const [row] = next.splice(i, 1)
      next.splice(i + by, 0, row)
      return next
    })

  async function saveRequirements() {
    if (!reqProduct || !user) return
    const cleaned = cleanRequirements(reqRows)
    if ('error' in cleaned) { setReqError(cleaned.error); return }
    setReqSaving(true)
    setReqError(null)
    try {
      await updateCardProductRequirements(reqProduct.id, cleaned.requirements, user.adminId)
      setNotice({ ok: true, text: `Requirements for ${reqProduct.name} saved (${cleaned.requirements.length} field${cleaned.requirements.length === 1 ? '' : 's'}).` })
      setReqProduct(null)
    } catch (err) {
      setReqError(errText(err, 'The requirements could not be saved.'))
    } finally {
      setReqSaving(false)
    }
  }

  const columns: ColumnDef<CardProductRecord>[] = [
    {
      header: 'Product',
      accessorKey: 'name',
      cell: p => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-slate-700">{p.name}</p>
          <p className="text-[11px] text-slate-400 font-mono">{p.code}</p>
        </div>
      ),
    },
    { header: 'Scheme', accessorKey: 'cardType', cell: p => <Badge label={p.cardType || '—'} variant="slate" /> },
    {
      header: 'Fees',
      accessorKey: 'issuanceFee',
      cell: p => (
        <div className="text-xs whitespace-nowrap">
          <p className="text-slate-700"><span className="text-slate-400">Issue</span> {naira(p.issuanceFee)}</p>
          <p className="text-slate-700"><span className="text-slate-400">Replace</span> {naira(p.replacementFee)}</p>
        </div>
      ),
    },
    {
      header: 'Default daily limits',
      sortable: false,
      cell: p => (
        <div className="text-xs whitespace-nowrap text-slate-700">
          <p><span className="text-slate-400">ATM</span> {naira(p.defaultAtmLimit)}</p>
          <p><span className="text-slate-400">POS</span> {naira(p.defaultPosLimit)}</p>
          <p><span className="text-slate-400">Web</span> {naira(p.defaultWebLimit)}</p>
        </div>
      ),
    },
    {
      header: 'Delivery',
      accessorKey: 'requiresDeliveryAddress',
      cell: p => <span className="text-xs text-slate-500">{p.requiresDeliveryAddress ? 'Address required' : 'Branch pickup'}</span>,
    },
    {
      header: 'Status',
      accessorKey: 'active',
      cell: p => <Badge label={p.active ? 'Active' : 'Inactive'} variant={p.active ? 'green' : 'slate'} />,
    },
    {
      header: 'Actions',
      sortable: false,
      cell: p => (
        <div className="flex gap-1">
          <button onClick={() => openForm(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" title="Edit product">
            <Pencil size={14} />
          </button>
          <button onClick={() => openRequirements(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" title="Application requirements">
            <ListChecks size={14} />
          </button>
          <button
            onClick={() => setToggling(p)}
            className={`p-1.5 rounded-lg cursor-pointer ${p.active ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
            title={p.active ? 'Deactivate' : 'Activate'}
          >
            {p.active ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Card products</h3>
          <p className="text-xs text-slate-500 mt-0.5">The cards customers can request in the app. Only active products are offered.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer" title="Refresh"><RefreshCw size={13} /></button>
          <Button size="sm" onClick={() => openForm('new')}><Plus size={14} /> New product</Button>
        </div>
      </div>

      {notice && (
        <div className={`text-xs font-semibold rounded-xl px-4 py-3 border flex justify-between gap-4 ${notice.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="opacity-60 hover:opacity-100 cursor-pointer">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-red-500 mb-3">{error}</p>
          <Button size="sm" variant="secondary" onClick={refetch}>Retry</Button>
        </div>
      )}
      {!error && (
        <DataTable<CardProductRecord>
          columns={columns}
          data={products}
          loading={loading && !data}
          loadingRows={3}
          searchPlaceholder="Search card products…"
          searchFields={['name', 'code', 'cardType', 'description']}
          emptyMessage="No card products yet. Create one to let customers request cards."
        />
      )}

      {/* Create / edit */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New card product' : `Edit ${editing?.name ?? ''}`} width="max-w-2xl">
        <form onSubmit={saveProduct} className="space-y-5">
          <Section title="Product">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Product name" required>
                <input className={inputCls} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Verve Classic Debit Card" />
              </Field>
              <Field label="Code" required hint="Used by the app; capitals, digits and _ only.">
                <input className={`${inputCls} font-mono uppercase`} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="VERVE_CLASSIC" disabled={editing !== 'new'} />
              </Field>
              <Field label="Card scheme" required>
                <select className={inputCls} value={form.cardType} onChange={e => setForm(f => ({ ...f, cardType: e.target.value }))}>
                  {[...new Set([...CARD_TYPES, form.cardType])].filter(Boolean).map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                </select>
              </Field>
              <Field label="Delivery">
                <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                  {[[true, 'Deliver to address'], [false, 'Branch pickup']].map(([v, label]) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, requiresDeliveryAddress: v as boolean }))}
                      className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${form.requiresDeliveryAddress === v ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}
                    >
                      {label as string}
                    </button>
                  ))}
                </div>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description" hint="Shown to customers when they choose a card.">
                  <textarea className={`${inputCls} resize-none`} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Fees">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <MoneyField label="Issuance fee" value={form.issuanceFee} onChange={v => setForm(f => ({ ...f, issuanceFee: v }))} hint="Charged when the card is first issued." />
              <MoneyField label="Replacement fee" value={form.replacementFee} onChange={v => setForm(f => ({ ...f, replacementFee: v }))} hint="Charged for a lost or damaged card." />
            </div>
          </Section>

          <Section title="Default daily limits">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MoneyField label="ATM" value={form.defaultAtmLimit} onChange={v => setForm(f => ({ ...f, defaultAtmLimit: v }))} />
              <MoneyField label="POS" value={form.defaultPosLimit} onChange={v => setForm(f => ({ ...f, defaultPosLimit: v }))} />
              <MoneyField label="Web / online" value={form.defaultWebLimit} onChange={v => setForm(f => ({ ...f, defaultWebLimit: v }))} />
            </div>
          </Section>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="accent-slate-700" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            Active: customers can request this card
          </label>

          {formError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{formError}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button type="button" variant="secondary" className="sm:flex-1 justify-center" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" className="sm:flex-1 justify-center" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />} {editing === 'new' ? 'Create product' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Activate / deactivate */}
      <Modal open={!!toggling} onClose={() => setToggling(null)} title={toggling?.active ? 'Deactivate product' : 'Activate product'} width="max-w-sm">
        {toggling && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {toggling.active
                ? <>Customers will no longer be able to request <strong>{toggling.name}</strong>. Cards already issued are not affected.</>
                : <>Customers will be able to request <strong>{toggling.name}</strong> in the app straight away.</>}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button variant="secondary" className="sm:flex-1 justify-center" onClick={() => setToggling(null)}>Cancel</Button>
              <Button variant={toggling.active ? 'danger' : 'success'} className="sm:flex-1 justify-center" onClick={confirmToggle} disabled={toggleBusy}>
                {toggleBusy && <Loader2 size={14} className="animate-spin" />} {toggling.active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Requirements */}
      <Modal open={!!reqProduct} onClose={() => setReqProduct(null)} title={`Application requirements · ${reqProduct?.name ?? ''}`} width="max-w-3xl">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Extra details customers must provide when requesting this card, in the order shown.</p>
          {reqLoading ? (
            // Shaped like a requirement field card.
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
              {reqRows.length === 0 && <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl">No extra requirements. Customers only confirm their account and delivery details.</p>}
              {reqRows.map((r, i) => (
                <div key={i} className="border border-slate-100 rounded-xl p-3 sm:p-4 space-y-3 bg-slate-50/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Field {i + 1}</span>
                    <div className="flex gap-1">
                      <button type="button" disabled={i === 0} onClick={() => moveRow(i, -1)} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer" title="Move up"><ArrowUp size={13} /></button>
                      <button type="button" disabled={i === reqRows.length - 1} onClick={() => moveRow(i, 1)} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer" title="Move down"><ArrowDown size={13} /></button>
                      <button type="button" onClick={() => setReqRows(rows => rows.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-red-600 cursor-pointer" title="Remove"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Label shown to customer">
                      <input className={inputCls} value={r.label ?? ''} onChange={e => updateRow(i, { label: e.target.value })} placeholder="Government ID number" />
                    </Field>
                    <Field label="Key">
                      <input className={`${inputCls} font-mono`} value={r.fieldKey ?? ''} onChange={e => updateRow(i, { fieldKey: e.target.value })} placeholder="idNumber" />
                    </Field>
                    <Field label="Answer type">
                      <select className={inputCls} value={r.fieldType ?? 'text'} onChange={e => updateRow(i, { fieldType: e.target.value })}>
                        {REQUIREMENT_FIELD_TYPES.map(t => <option key={t} value={t}>{{ text: 'Text', number: 'Number', date: 'Date', select: 'Dropdown', file: 'File upload' }[t]}</option>)}
                      </select>
                    </Field>
                    {r.fieldType === 'select' && (
                      <div className="sm:col-span-3">
                        <Field label="Dropdown options" hint="Separate with commas.">
                          <input className={inputCls} value={r.optionsCsv ?? ''} onChange={e => updateRow(i, { optionsCsv: e.target.value })} placeholder="NIN, Driver's licence, Passport" />
                        </Field>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <Field label="Help text">
                        <input className={inputCls} value={r.helpText ?? ''} onChange={e => updateRow(i, { helpText: e.target.value })} placeholder="Shown under the field" />
                      </Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer sm:pt-6">
                      <input type="checkbox" className="accent-slate-700" checked={!!r.required} onChange={e => updateRow(i, { required: e.target.checked })} />
                      Required
                    </label>
                  </div>
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={() => setReqRows(rows => [...rows, { fieldKey: '', label: '', fieldType: 'text', required: true, optionsCsv: '', helpText: '' }])}>
                <Plus size={13} /> Add field
              </Button>
            </div>
          )}
          {reqError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{reqError}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button variant="secondary" className="sm:flex-1 justify-center" onClick={() => setReqProduct(null)}>Cancel</Button>
            <Button className="sm:flex-1 justify-center" onClick={saveRequirements} disabled={reqSaving || reqLoading}>
              {reqSaving && <Loader2 size={14} className="animate-spin" />} Save requirements
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  )
}

// A div, not a <label>: a label wrapping the delivery toggle would forward every click to its first button.
function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="block space-y-1.5">
      <span className="text-xs font-semibold text-slate-600">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400">{hint}</span>}
    </div>
  )
}

function MoneyField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <Field label={label} hint={hint} required>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">₦</span>
        <input className={`${inputCls} pl-7`} inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} placeholder="0" />
      </div>
    </Field>
  )
}
