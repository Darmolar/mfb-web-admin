import { useEffect, useRef, useState } from 'react'
import { getSmsSettings, getSmsTypes, updateSmsSettings, updateSmsType, type SmsSetting, type SmsTypeMetadata } from '../../api'
import { Button } from '../ui/Button'
import { FormSkeleton } from '../ui/Skeleton'

export function SmsSettings() {
  const [saved, setSaved] = useState<Record<string, SmsSetting>>({})
  const [draft, setDraft] = useState<Record<string, SmsSetting>>({})
  const [types, setTypes] = useState<Record<string, SmsTypeMetadata>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const busy = useRef(false)
  const generation = useRef(0)
  const load = () => {
    const id = ++generation.current
    return Promise.all([getSmsSettings(), getSmsTypes()]).then(([settings, metadata]) => {
      if (id !== generation.current) return
      setSaved(settings); setDraft(settings); setTypes(metadata)
    }).catch((e: unknown) => {
      if (id === generation.current) setError(e instanceof Error ? e.message : 'Unable to load SMS settings.')
    }).finally(() => { if (id === generation.current) setLoading(false) })
  }
  useEffect(() => {
    void load()
    const id = generation.current
    return () => { generation.current = id + 1 }
  }, [])
  const changed = (type: string) => draft[type].enabled !== saved[type]?.enabled || draft[type].template !== saved[type]?.template
  const save = async (only?: string) => {
    if (busy.current) return
    const updates = Object.keys(draft).filter(type => (!only || type === only) && changed(type)).map(type => ({
      type, enabled: draft[type].enabled, template: draft[type].template,
    }))
    if (!updates.length) return
    if (updates.some(item => !item.template.trim())) { setError('Templates cannot be empty.'); return }
    for (const item of updates) {
      const allowed = new Set((types[item.type]?.placeholders || draft[item.type].placeholders).match(/\{[^{}]+\}/g) || [])
      const unknown = (item.template.match(/\{[^{}]+\}/g) || []).filter(p => !allowed.has(p))
      if (unknown.length) { setError(`${item.type}: unsupported placeholders ${unknown.join(', ')}.`); return }
    }
    busy.current = true; setSaving(true); setError(''); setNotice('')
    const id = generation.current
    try {
      if (only) { const { type, ...payload } = updates[0]; await updateSmsType(type, payload) }
      else await updateSmsSettings(updates)
      if (id !== generation.current) return
      setSaved(current => {
        const next = { ...current }
        updates.forEach(({ type, ...value }) => { next[type] = { ...current[type], ...value } })
        return next
      })
      setNotice('SMS settings saved.')
    } catch (e) {
      if (id === generation.current) setError(e instanceof Error ? e.message : 'Unable to save SMS settings.')
    } finally { busy.current = false; if (id === generation.current) setSaving(false) }
  }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">SMS notifications</h2><p className="text-sm text-slate-500">Choose which messages customers receive and edit their templates.</p></div>
      <Button disabled={loading || saving || !Object.keys(draft).some(changed)} onClick={() => void save()}>{saving ? 'Saving…' : 'Save all changes'}</Button>
    </div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {notice && <p role="status" className="text-green-700">{notice}</p>}
    {loading ? <div className="space-y-4">{[0, 1, 2].map(i => <FormSkeleton key={i} fields={1} columns={1} />)}</div> : Object.keys(draft).length === 0 ? <Button onClick={() => { setLoading(true); setError(''); void load() }}>Retry loading settings</Button> :
      Object.entries(draft).map(([type, value]) => <section key={type} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex justify-between gap-4"><h3 className="font-semibold capitalize">{type.replaceAll('_', ' ')}</h3>
          <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={value.enabled} disabled={saving} onChange={e => setDraft(current => ({ ...current, [type]: { ...current[type], enabled: e.target.checked } }))} />Enabled</label></div>
        <label className="block text-sm">Message template<textarea className="mt-1 block w-full rounded-lg border border-slate-300 p-3" rows={3} value={value.template} disabled={saving} onChange={e => setDraft(current => ({ ...current, [type]: { ...current[type], template: e.target.value } }))} /></label>
        <p className="text-xs text-slate-500">Available placeholders: {types[type]?.placeholders || value.placeholders || 'None'}</p>
        <div className="flex justify-end gap-2">
          {types[type] && <Button variant="secondary" disabled={saving} onClick={() => setDraft(current => ({ ...current, [type]: { ...current[type], template: types[type].defaultTemplate } }))}>Use default template</Button>}
          <Button disabled={saving || !changed(type)} onClick={() => void save(type)}>Save</Button>
        </div>
      </section>)}
  </div>
}
