import { useState, type ReactNode } from 'react'
import { Loader2, Save, RefreshCw, UserCog, Package, SlidersHorizontal } from 'lucide-react'
import { Button } from '../ui/Button'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { getSystemSettings, updateDefaultOfficerCode, updateDefaultProductCode, updateFaceThreshold } from '../../api'
import { FormSkeleton } from '../ui/Skeleton'

type FieldKey = 'officerCode' | 'productCode' | 'faceThreshold'
type Message = { ok: boolean; text: string }

const inputClass = 'px-2.5 py-1.5 text-sm font-semibold text-slate-800 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white disabled:opacity-60'

export function SystemConfigSettings() {
  const { user } = useAuth()
  const { data, loading, error, refetch } = useApi(getSystemSettings, [])
  const [drafts, setDrafts] = useState<Partial<Record<FieldKey, string>>>({})
  const [saving, setSaving] = useState<FieldKey | null>(null)
  const [messages, setMessages] = useState<Partial<Record<FieldKey, Message>>>({})

  const current: Record<FieldKey, string> = {
    officerCode: data?.officerCode ?? '',
    productCode: data?.productCode ?? '',
    faceThreshold: data?.faceThreshold != null ? String(data.faceThreshold) : '',
  }
  const valueOf = (key: FieldKey) => drafts[key] ?? current[key]
  const dirty = (key: FieldKey) => drafts[key] !== undefined && drafts[key]!.trim() !== current[key]

  const setMessage = (key: FieldKey, message: Message | null) =>
    setMessages(prev => ({ ...prev, [key]: message ?? undefined }))

  const validate = (key: FieldKey): string | null => {
    const value = valueOf(key).trim()
    if (key === 'faceThreshold') {
      if (!/^\d+$/.test(value) || Number(value) > 100) return 'Threshold must be a whole number between 0 and 100.'
      return null
    }
    return value ? null : `${key === 'officerCode' ? 'Officer' : 'Product'} code cannot be empty.`
  }

  const save = async (key: FieldKey) => {
    if (saving) return
    const invalid = validate(key)
    if (invalid) { setMessage(key, { ok: false, text: invalid }); return }
    if (!user?.adminId) { setMessage(key, { ok: false, text: 'Your admin session is missing an admin ID. Sign in again.' }); return }
    const value = valueOf(key).trim()
    setSaving(key)
    setMessage(key, null)
    try {
      if (key === 'officerCode') await updateDefaultOfficerCode(value, user.adminId)
      else if (key === 'productCode') await updateDefaultProductCode(value, user.adminId)
      else await updateFaceThreshold(Number(value), user.adminId)
      setMessage(key, { ok: true, text: 'Saved.' })
      setDrafts(prev => ({ ...prev, [key]: undefined }))
      await refetch()
    } catch (e: unknown) {
      setMessage(key, { ok: false, text: e instanceof Error ? e.message : 'Update failed' })
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <FormSkeleton fields={2} />
        <FormSkeleton fields={2} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500 mb-3">{error}</p>
        <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
      </div>
    )
  }

  const rows: { key: FieldKey; icon: ReactNode; title: string; desc: string; input: ReactNode }[] = [
    {
      key: 'officerCode',
      icon: <UserCog size={16} className="text-slate-500" />,
      title: 'Default account officer code',
      desc: 'CBA account officer assigned to newly opened accounts (cba.default.officer_code), e.g. Admin002.',
      input: (
        <input
          id="sys-officerCode"
          type="text"
          value={valueOf('officerCode')}
          disabled={saving === 'officerCode'}
          onChange={e => { setDrafts(prev => ({ ...prev, officerCode: e.target.value })); setMessage('officerCode', null) }}
          className={`w-36 ${inputClass}`}
        />
      ),
    },
    {
      key: 'productCode',
      icon: <Package size={16} className="text-slate-500" />,
      title: 'Default product code',
      desc: 'CBA product code used when a new account is opened without a specific product, e.g. 208.',
      input: (
        <input
          id="sys-productCode"
          type="text"
          value={valueOf('productCode')}
          disabled={saving === 'productCode'}
          onChange={e => { setDrafts(prev => ({ ...prev, productCode: e.target.value })); setMessage('productCode', null) }}
          className={`w-36 ${inputClass}`}
        />
      ),
    },
    {
      key: 'faceThreshold',
      icon: <SlidersHorizontal size={16} className="text-slate-500" />,
      title: 'Face match score threshold',
      desc: 'Minimum match score (0–100) a selfie must reach to pass face verification. Higher is stricter.',
      input: (
        <input
          id="sys-faceThreshold"
          type="number"
          min={0}
          max={100}
          step={1}
          value={valueOf('faceThreshold')}
          disabled={saving === 'faceThreshold'}
          onChange={e => { setDrafts(prev => ({ ...prev, faceThreshold: e.target.value })); setMessage('faceThreshold', null) }}
          className={`w-20 ${inputClass}`}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">System Configuration</h3>
          <p className="text-xs text-slate-500 mt-0.5">Core defaults used during account opening and identity checks. Each value saves on its own and takes effect immediately.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch} disabled={!!saving}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
        {rows.map(r => {
          const message = messages[r.key]
          return (
            <div key={r.key} className="px-5 py-4">
              <div className="flex items-center justify-between gap-6">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">{r.icon}</div>
                  <div className="min-w-0">
                    <label htmlFor={`sys-${r.key}`} className="text-sm font-semibold text-slate-700">{r.title}</label>
                    <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {r.input}
                  <Button size="sm" onClick={() => void save(r.key)} disabled={!!saving || !dirty(r.key)}>
                    {saving === r.key ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
                  </Button>
                </div>
              </div>
              {message && (
                <p
                  role={message.ok ? 'status' : 'alert'}
                  className={`mt-3 ml-11 text-xs font-semibold rounded-xl px-3 py-2 border ${message.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}
                >
                  {message.text}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
