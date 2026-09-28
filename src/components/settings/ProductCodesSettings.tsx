import { useRef, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '../ui/Button'
import { updateCbaProductCodes } from '../../api'
import { validateProductCodes, type CbaProductCodes } from '../../api/productCodes'

// Operator-provided proposal, not a claim about the saved backend configuration.
const PROPOSED_CODES: CbaProductCodes = {
  individualProductCode: '208',
  corporateProductCode: '103',
}

export function ProductCodesSettings() {
  const [draft, setDraft] = useState<CbaProductCodes>(PROPOSED_CODES)
  const [saved, setSaved] = useState<CbaProductCodes | null>(null)
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
      setMessage({ ok: true, text: 'Product-code update accepted.' })
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Unable to update product codes.' })
    } finally {
      inFlight.current = false
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">CBA Product Codes</h3>
        <p className="text-xs text-slate-500 mt-1">Configure the core banking products used for individual and corporate accounts.</p>
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
        {saved && unchanged ? 'These values were submitted successfully in this session.' : 'The fields contain proposed values, not the current saved configuration. Review both codes before saving.'}
      </p>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`text-sm rounded-xl p-3 ${message.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </p>
      )}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-5">
        {([
          ['individualProductCode', 'Individual product code'],
          ['corporateProductCode', 'Corporate product code'],
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
