import { useState } from 'react'
import { Loader2, Fingerprint, ScanFace, IdCard, SlidersHorizontal, Save, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { useApi } from '../../hooks/useApi'
import {
  getIdentityProviderSettings, setBvnProvider, setNinProvider, setFaceProvider, setFaceMatchThreshold,
} from '../../api'
import type { IdentityProvider } from '../../api/types'

const PROVIDERS: IdentityProvider[] = ['ISW', 'NIBSS']
const PROVIDER_LABEL: Record<IdentityProvider, string> = { ISW: 'Interswitch', NIBSS: 'NIBSS' }

function ProviderToggle({
  value, options, disabled, onChange,
}: { value: string; options: IdentityProvider[]; disabled?: boolean; onChange: (p: IdentityProvider) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map(p => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed ${
            value === p ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {p} <span className="font-normal text-slate-400">· {PROVIDER_LABEL[p]}</span>
        </button>
      ))}
    </div>
  )
}

export function IdentityProviderSettings() {
  const { data, loading, error, refetch } = useApi(
    () => getIdentityProviderSettings().then(r => r.data),
    [],
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [thresholdInput, setThresholdInput] = useState<string | null>(null)

  const bvn = String(data?.['identity.provider.bvn'] ?? '')
  const nin = String(data?.['identity.provider.nin'] ?? 'ISW')
  const face = String(data?.['identity.provider.face'] ?? '')
  const threshold = String(data?.['identity.face.threshold'] ?? '')
  const thresholdValue = thresholdInput ?? threshold

  const run = async (key: string, fn: () => Promise<unknown>, okText: string) => {
    setSaving(key)
    setMessage(null)
    try {
      await fn()
      setMessage({ ok: true, text: okText })
      setThresholdInput(null)
      refetch()
    } catch (e: unknown) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Update failed' })
    } finally {
      setSaving(null)
    }
  }

  const saveThreshold = () => {
    const n = Number(thresholdValue)
    if (!Number.isInteger(n) || n < 0 || n > 100) {
      setMessage({ ok: false, text: 'Threshold must be a whole number between 0 and 100.' })
      return
    }
    run('threshold', () => setFaceMatchThreshold(n), `Face match threshold set to ${n}.`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-slate-400" />
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

  const rows = [
    {
      key: 'bvn',
      icon: <Fingerprint size={16} className="text-slate-500" />,
      title: 'BVN verification provider',
      desc: 'Provider used to verify Bank Verification Numbers during onboarding and identity updates.',
      control: (
        <ProviderToggle
          value={bvn}
          options={PROVIDERS}
          disabled={saving === 'bvn'}
          onChange={p => run('bvn', () => setBvnProvider(p), `BVN provider switched to ${p}.`)}
        />
      ),
    },
    {
      key: 'nin',
      icon: <IdCard size={16} className="text-slate-500" />,
      title: 'NIN verification provider',
      desc: 'National Identification Number lookups. Only Interswitch is supported by the backend.',
      control: (
        <ProviderToggle
          value={nin}
          options={['ISW']}
          disabled={saving === 'nin' || nin === 'ISW'}
          onChange={() => run('nin', () => setNinProvider('ISW'), 'NIN provider set to ISW.')}
        />
      ),
    },
    {
      key: 'face',
      icon: <ScanFace size={16} className="text-slate-500" />,
      title: 'Face match provider',
      desc: 'Provider used for selfie-to-ID facial matching.',
      control: (
        <ProviderToggle
          value={face}
          options={PROVIDERS}
          disabled={saving === 'face'}
          onChange={p => run('face', () => setFaceProvider(p), `Face provider switched to ${p}.`)}
        />
      ),
    },
    {
      key: 'threshold',
      icon: <SlidersHorizontal size={16} className="text-slate-500" />,
      title: 'Face match score threshold',
      desc: 'Minimum match score (0–100) required for a face verification to pass.',
      control: (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={thresholdValue}
            onChange={e => setThresholdInput(e.target.value)}
            className="w-20 px-2.5 py-1.5 text-sm font-semibold text-slate-800 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white"
          />
          <Button
            size="sm"
            onClick={saveThreshold}
            disabled={saving === 'threshold' || thresholdInput === null || thresholdInput === threshold}
          >
            {saving === 'threshold' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Identity Providers</h3>
          <p className="text-xs text-slate-500 mt-0.5">Choose which external provider handles each identity check. Changes take effect immediately.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch} disabled={!!saving}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {message && (
        <div className={`text-xs font-semibold rounded-xl px-3 py-2 border ${message.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
        {rows.map(r => (
          <div key={r.key} className="flex items-center justify-between gap-6 px-5 py-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">{r.icon}</div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-700">{r.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              {saving === r.key && r.key !== 'threshold' && <Loader2 size={13} className="animate-spin text-slate-400" />}
              {r.control}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
