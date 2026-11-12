import { useRef, useState } from 'react'
import { Loader2, RefreshCw, Save } from 'lucide-react'
import { Button } from '../ui/Button'
import { useApi } from '../../hooks/useApi'
import { getCbaProductCodes, updateCbaProductCodes } from '../../api'
import { validateProductCodes, type CbaProductCodes } from '../../api/productCodes'
import { FormSkeleton } from '../ui/Skeleton'

const EMPTY: CbaProductCodes = { individualProductCode: '', corporateProductCode: '' }

export function ProductCodesSettings() {
  const { data, loading, error, refetch } = useApi(getCbaProductCodes, [])
  const [draft, setDraft] = useState<CbaProductCodes>(EMPTY)
  const [saved, setSaved] = useState<CbaProductCodes | null>(null)
  // Re-sync the form whenever the server's current codes arrive.
  const [syncedData, setSyncedData] = useState(data)
  if (data !== syncedData) {
    setSyncedData(data)
    if (data) { setDraft(data); setSaved(data) }
  }
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const unchanged = saved?.individualProductCode === draft.individualProductCode.trim()
    && saved?.corporateProductCode === draft.corporateProductCode.trim()

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (inFlight.current || unchanged) return
    let payload: CbaProductCodes
    try {
      payload = validateProductCodes(draft)
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Invalid product codes.' })
      return
    }
    inFlight.current = true
    setSaving(true)
    setMessage(null)
    try {
      await updateCbaProductCodes(payload)
      setSaved(payload)
      setDraft(payload)
      setMessage({ ok: true, text: 'Product codes saved.' })
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Unable to update product codes.' })
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  if (loading && !data) return <FormSkeleton fields={2} />

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">CBA Product Codes</h3>
          <p className="text-xs text-slate-500 mt-1">Core banking products used when opening individual savings accounts and corporate accounts.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={refetch} disabled={saving || loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
          Couldn’t load the current codes ({error}). Anything you save will replace whatever is configured.
        </p>
      )}
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`text-sm rounded-xl p-3 ${message.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-5">
        {([
          ['individualProductCode', 'Individual product code (cba.product.individual)'],
          ['corporateProductCode', 'Corporate product code (cba.product.corporate)'],
        ] as const).map(([field, label]) => (
          <div key={field} className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor={field} className="text-sm font-semibold text-slate-700">{label}</label>
            <input
              id={field}
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              required
              disabled={saving}
              value={draft[field]}
              onChange={event => { setDraft(previous => ({ ...previous, [field]: event.target.value })); setMessage(null) }}
              className="w-48 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        ))}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving || unchanged}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save product codes'}
          </Button>
        </div>
      </div>
    </form>
  )
}
