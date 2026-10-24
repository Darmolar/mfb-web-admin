import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, ListChecks, Loader2, MapPin, Pencil, Plus, Power, PowerOff, RefreshCw, Store } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { allPages } from '../../api/pagination'
import {
  activateCardProduct, createCardProduct, deactivateCardProduct, getCardProductRequirements, getCardProducts, getCardRequests,
  updateCardProduct, updateCardProductRequirements,
} from '../../api'
import {
  CARD_TYPES, EMPTY_PRODUCT_FORM, naira, productPayload, productToForm, productUsage,
  SCHEME_DOT, readCardProducts, readCardRequests, type CardProductForm, type CardProductRecord,
} from '../../api/cards'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { RequirementsEditor } from '../ui/RequirementsEditor'
import { LoadingRegion, StatCardsSkeleton, TableSkeleton } from '../ui/Skeleton'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { CardArt } from './CardArt'

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'
const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

export function CardProducts() {
  const { user } = useAuth()
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const { data, loading, error, refetch } = useApi(async () => readCardProducts((await getCardProducts({ size: '100' })).data), [])
  const products = data ?? []
  const initialLoad = loading && !data
  // Request counts per product; optional, so a failure here never hides the products.
  const { data: usageData, refetch: refetchUsage } = useApi(
    async () => productUsage(readCardRequests(await allPages(page => getCardRequests({ page, size: 100 }))).requests), [])
  const [, setParams] = useSearchParams()
  const goToRequests = () => setParams({ tab: 'requests' }, { replace: true })
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all')

  // Create / edit
  const [editing, setEditing] = useState<CardProductRecord | 'new' | null>(null)
  const [form, setForm] = useState<CardProductForm>(EMPTY_PRODUCT_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Requirements (editor loads and saves itself)
  const [reqProduct, setReqProduct] = useState<CardProductRecord | null>(null)

  // Activate / deactivate
  const [toggling, setToggling] = useState<CardProductRecord | null>(null)
  const [toggleBusy, setToggleBusy] = useState(false)


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


  const usage = usageData ?? null
  const shown = products.filter(p => status === 'all' || (status === 'active') === p.active)
  const activeCount = products.filter(p => p.active).length
  const totals = usage ? Object.values(usage).reduce((a, u) => ({ awaiting: a.awaiting + u.awaiting, active: a.active + u.active }), { awaiting: 0, active: 0 }) : null
  const fees = products.map(p => p.issuanceFee).filter((n): n is number => n !== null)

  const usageOf = (p: CardProductRecord) => (usage ? usage[p.code] ?? usage[p.name] ?? { total: 0, awaiting: 0, active: 0 } : null)
  const columns: ColumnDef<CardProductRecord>[] = [
    {
      header: 'Product',
      accessorKey: 'name',
      cell: p => (
        <div className="flex items-center gap-3 min-w-[200px] max-w-[260px]">
          <span className={`w-10 h-7 rounded-md shrink-0 ${SCHEME_DOT[p.cardType] ?? 'bg-slate-500'} ${p.active ? '' : 'opacity-40'} flex items-end justify-end p-1`} aria-hidden="true">
            <span className="w-2.5 h-1.5 rounded-sm bg-amber-300/90" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-slate-700 truncate">{p.name}</p>
            <p className="text-[11px] text-slate-400 font-mono truncate">{p.code} · {p.cardType || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Fees',
      accessorKey: 'issuanceFee',
      cell: p => (
        <div className="text-xs whitespace-nowrap">
          <p className="text-slate-700 font-semibold">{naira(p.issuanceFee)} <span className="font-normal text-slate-400">to issue</span></p>
          <p className="text-slate-500">{naira(p.replacementFee)} <span className="text-slate-400">to replace</span></p>
        </div>
      ),
    },
    {
      header: 'Daily limits',
      sortable: false,
      cell: p => (
        <dl className="grid grid-cols-[auto_auto] gap-x-2 text-xs whitespace-nowrap w-fit">
          {([['ATM', p.defaultAtmLimit], ['POS', p.defaultPosLimit], ['Web', p.defaultWebLimit]] as const).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-400">{k}</dt>
              <dd className="font-semibold text-slate-700 text-right">{naira(v)}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      header: 'Delivery',
      accessorKey: 'requiresDeliveryAddress',
      cell: p => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
          {p.requiresDeliveryAddress ? <MapPin size={13} /> : <Store size={13} />}
          {p.requiresDeliveryAddress ? 'Delivered' : 'Branch pickup'}
        </span>
      ),
    },
    {
      header: 'Requests',
      sortable: false,
      cell: p => {
        const u = usageOf(p)
        if (!u) return <span className="text-xs text-slate-300">—</span>
        return (
          <button onClick={goToRequests} className="text-left text-xs whitespace-nowrap cursor-pointer hover:underline" title="Open card requests">
            <p className="text-slate-700"><span className="font-semibold">{u.active}</span> active</p>
            <p className={u.awaiting ? 'text-amber-700 font-semibold' : 'text-slate-400'}>{u.awaiting} awaiting review</p>
          </button>
        )
      },
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
          <button onClick={() => openForm(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" title="Edit product" aria-label="Edit product">
            <Pencil size={14} />
          </button>
          <button onClick={() => setReqProduct(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" title="Application requirements" aria-label="Application requirements">
            <ListChecks size={14} />
          </button>
          <button
            onClick={() => setToggling(p)}
            className={`p-1.5 rounded-lg cursor-pointer text-slate-400 ${p.active ? 'hover:text-amber-600 hover:bg-amber-50' : 'hover:text-emerald-600 hover:bg-emerald-50'}`}
            title={p.active ? 'Deactivate' : 'Activate'}
            aria-label={p.active ? 'Deactivate' : 'Activate'}
          >
            {p.active ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Card products</h3>
          <p className="text-xs text-slate-500 mt-0.5">The cards customers can request in the app. Only active products are offered.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { refetch(); refetchUsage() }} className="text-slate-300 hover:text-slate-500 cursor-pointer" title="Refresh" aria-label="Refresh"><RefreshCw size={13} /></button>
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

      {initialLoad && (
        <LoadingRegion label="Loading card products…" className="space-y-5">
          <StatCardsSkeleton count={4} className="grid grid-cols-2 lg:grid-cols-4 gap-3" />
          <TableSkeleton columns={7} rows={3} search />
        </LoadingRegion>
      )}

      {!error && data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Live products" value={`${activeCount} of ${products.length}`} sub={activeCount === products.length ? 'All offered in the app' : `${products.length - activeCount} switched off`} />
            <Tile label="Awaiting review" value={totals ? String(totals.awaiting) : '—'} sub="Requests across all products" tone={totals && totals.awaiting > 0 ? 'amber' : undefined}
              action={totals && totals.awaiting > 0 ? { label: 'Review', onClick: () => goToRequests() } : undefined} />
            <Tile label="Active cards" value={totals ? String(totals.active) : '—'} sub="Issued and in use" />
            <Tile label="Issue fees" value={fees.length ? `${naira(Math.min(...fees))}${Math.max(...fees) !== Math.min(...fees) ? ` – ${naira(Math.max(...fees))}` : ''}` : '—'} sub="Charged once per new card" />
          </div>

          <div className="flex">
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
              {(['all', 'active', 'inactive'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer capitalize ${status === s ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                  {s}
                  <span className="ml-1.5 text-[10px] text-slate-400">{s === 'all' ? products.length : s === 'active' ? activeCount : products.length - activeCount}</span>
                </button>
              ))}
            </div>
          </div>

          <DataTable<CardProductRecord>
            columns={columns}
            data={shown}
            searchPlaceholder="Search name, code or scheme…"
            searchFields={['name', 'code', 'cardType', 'description']}
            emptyMessage={products.length ? 'No products match this filter.' : 'No card products yet. Create one to let customers request cards.'}
          />
        </>
      )}

      {/* Create / edit */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New card product' : `Edit ${editing?.name ?? ''}`} width="max-w-2xl">
        <form onSubmit={saveProduct} className="space-y-5">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 border border-slate-100 p-3">
            <CardArt name={form.name} scheme={form.cardType} tag={form.active ? undefined : 'Inactive'} muted={!form.active} className="!w-40 shrink-0 !p-2.5 !rounded-xl [&_p]:!text-[9px]" />
            <div className="text-xs text-slate-500 space-y-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Preview</p>
              <p className="text-sm font-semibold text-slate-700 truncate">{form.name || 'Product name'}</p>
              <p>Issue {form.issuanceFee ? naira(Number(form.issuanceFee)) : '—'} · {form.requiresDeliveryAddress ? 'Delivered' : 'Branch pickup'}</p>
            </div>
          </div>
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
      <RequirementsEditor
        target={reqProduct}
        intro="Extra details customers must provide when requesting this card, in the order shown."
        emptyText="No extra requirements. Customers only confirm their account and delivery details."
        load={getCardProductRequirements}
        save={(id, requirements) => updateCardProductRequirements(id, requirements, user!.adminId)}
        onClose={() => setReqProduct(null)}
        onSaved={text => setNotice({ ok: true, text })}
      />
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

function Tile({ label, value, sub, tone, action }: {
  label: string; value: string; sub: string; tone?: 'amber'; action?: { label: string; onClick: () => void }
}) {
  return (
    <div className={`rounded-2xl border shadow-sm p-4 ${tone === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`text-xl sm:text-2xl font-black mt-1 truncate ${tone === 'amber' ? 'text-amber-700' : 'text-slate-800'}`}>{value}</p>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 truncate">{sub}</p>
        {action && (
          <button onClick={action.onClick} className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-amber-800 hover:underline cursor-pointer">
            {action.label} <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
