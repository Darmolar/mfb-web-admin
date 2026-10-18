import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { deleteBankStamp, getBankStamp, updateBankStamp, uploadBankStamp } from '../../api'
import { loadBankStamp, type BankStamp } from '../../api/bankStamp'
import { formatWhen } from '../cardfusion/format'

const formatBytes = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`)

export function BankStampSettings() {
  const [stamp, setStamp] = useState<{ url: string; file: File } | null>(null)
  // undefined: not loaded yet, null: no stamp uploaded (the server answers 404).
  const [saved, setSaved] = useState<BankStamp | null | undefined>(undefined)
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(true)
  const [checking, setChecking] = useState(false)
  const working = useRef(false)
  const mounted = useRef(false)
  const generation = useRef(0)
  const readGeneration = useRef(0)

  async function reload() {
    const request = ++readGeneration.current
    const state = await loadBankStamp(getBankStamp)
    if (!mounted.current || request !== readGeneration.current) return undefined
    setSaved(state); setEnabled(state?.enabled ?? false)
    return state
  }
  useEffect(() => {
    mounted.current = true
    void reload().catch(cause => { if (mounted.current) setError(cause.message) })
      .finally(() => { if (mounted.current) setBusy(false) })
    return () => { mounted.current = false; generation.current += 1; readGeneration.current += 1 }
  }, [])
  useEffect(() => () => { if (stamp) URL.revokeObjectURL(stamp.url) }, [stamp])

  async function selectFile(file?: File) {
    const request = ++generation.current
    setError(''); setMessage(''); setChecking(false)
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) { setError('Choose a PNG or JPEG image.'); return }
    if (!file.size || file.size > 2 * 1024 * 1024) { setError('Choose a non-empty image no larger than 2 MB.'); return }
    setChecking(true)
    const url = URL.createObjectURL(file)
    try {
      const image = new Image()
      image.src = url
      await image.decode()
      if (request !== generation.current) { URL.revokeObjectURL(url); return }
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) throw new Error('Image dimensions must be no larger than 4096 × 4096 pixels.')
      setStamp({ url, file })
    } catch (cause) {
      URL.revokeObjectURL(url)
      if (request === generation.current) setError(cause instanceof Error && cause.message.startsWith('Image dimensions') ? cause.message : 'This image could not be read. Choose another PNG or JPEG.')
    } finally { if (request === generation.current) setChecking(false) }
  }

  async function run(action: 'upload' | 'save' | 'delete' | 'reload') {
    if (working.current || busy || checking) return
    if (action === 'delete' && !window.confirm('Delete the saved bank stamp? Stamped statements will no longer be available.')) return
    working.current = true; setBusy(true); setError(''); setMessage('')
    let changed = false
    try {
      if (action === 'upload') {
        if (!stamp) return
        await uploadBankStamp(stamp.file)
        changed = true
        if (mounted.current) setStamp(null)
      } else if (action === 'save') {
        if (!saved) throw new Error('Upload a stamp before changing its settings.')
        await updateBankStamp({ enabled })
        changed = true
      } else if (action === 'delete') {
        await deleteBankStamp()
        changed = true
        if (mounted.current) setStamp(null)
      }
      const readback = await reload()
      if (action === 'upload' && readback === null) throw new Error('The uploaded stamp could not be confirmed.')
      if (action === 'save' && readback?.enabled !== enabled) throw new Error('The saved setting could not be confirmed.')
      if (action === 'delete' && readback) throw new Error('The stamp still exists after deletion.')
      if (mounted.current) setMessage(action === 'reload' ? 'Settings refreshed.' : action === 'upload' ? 'Stamp uploaded. Review it below and turn stamped statements on when ready.' : action === 'delete' ? 'Stamp deleted.' : 'Stamp setting saved.')
    } catch (cause) {
      if (mounted.current) {
        if (changed) setSaved(undefined)
        setError(changed ? 'The change was accepted, but the saved settings could not be confirmed. Refresh before making another change.' : cause instanceof Error ? cause.message : 'Could not update the bank stamp.')
      }
    } finally { working.current = false; if (mounted.current) setBusy(false) }
  }

  const locked = busy || checking
  return <Card>
    <form className="space-y-6" onSubmit={event => { event.preventDefault(); void run('save') }}>
      <div>
        <h2 className="text-lg font-bold text-slate-800">Bank stamp</h2>
        <p className="mt-1 text-sm text-slate-500">Manage the bank-approved stamp used on account statements. It is placed at the bottom right of every page at 40% opacity.</p>
      </div>
      {busy && <p role="status">Updating stamp settings…</p>}
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      {message && <p className="text-sm text-green-700" role="status">{message}</p>}
      <Button type="button" variant="secondary" disabled={locked} onClick={() => void run('reload')}>Refresh settings</Button>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label htmlFor="bank-stamp-file" className="block text-sm font-semibold text-slate-700">{saved ? 'Replace the scanned bank stamp' : 'Scanned bank stamp'}</label>
            <p id="bank-stamp-help" className="my-2 text-xs text-slate-500">PNG or JPEG, up to 2 MB and 4096 × 4096 pixels. A transparent PNG gives the cleanest result.</p>
            <input id="bank-stamp-file" type="file" accept="image/png,image/jpeg" disabled={locked}
              aria-describedby="bank-stamp-help" className="block w-full min-w-0 text-sm text-slate-600"
              onChange={event => { void selectFile(event.target.files?.[0]); event.target.value = '' }} />
            {checking && <p role="status">Checking image…</p>}
          </div>
          <Button type="button" disabled={!stamp || locked} onClick={() => void run('upload')}>{saved ? 'Replace stamp' : 'Upload stamp'}</Button>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={enabled} disabled={!saved || locked} onChange={event => setEnabled(event.target.checked)} />
            <span>Offer stamped statements to customers</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={!saved || locked || enabled === saved.enabled}>Save setting</Button>
            <Button type="button" variant="secondary" disabled={!saved || locked} onClick={() => void run('delete')}>Delete saved stamp</Button>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700">Saved stamp</h3>
            {saved === undefined ? <p className="mt-4 text-sm text-slate-500">{busy ? 'Loading…' : 'Refresh to see the saved stamp.'}</p>
              : saved === null ? <p className="mt-4 text-sm text-slate-500">No stamp has been uploaded yet.</p>
              : <>
                {saved.previewUrl
                  ? <img src={saved.previewUrl} alt="Saved bank stamp" referrerPolicy="no-referrer" className="mt-4 max-h-48 max-w-full object-contain" />
                  : <p className="mt-4 text-sm text-slate-500">The server did not return a preview.</p>}
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
                  <dt className="text-slate-400">Status</dt><dd>{saved.enabled ? 'Offered on statements' : 'Not offered'}</dd>
                  {saved.width !== null && saved.height !== null && <><dt className="text-slate-400">Dimensions</dt><dd>{saved.width} × {saved.height} px</dd></>}
                  {saved.sizeBytes !== null && <><dt className="text-slate-400">Size</dt><dd>{formatBytes(saved.sizeBytes)}</dd></>}
                  {saved.version !== null && <><dt className="text-slate-400">Version</dt><dd>{saved.version}</dd></>}
                  {saved.updatedAt && <><dt className="text-slate-400">Last updated</dt><dd>{formatWhen(saved.updatedAt)}</dd></>}
                  {saved.updatedBy && <><dt className="text-slate-400">Updated by</dt><dd className="break-all">{saved.updatedBy}</dd></>}
                </dl>
              </>}
          </div>
          {stamp && <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-700">Selected image</h3>
            <img src={stamp.url} alt="Selected bank stamp" className="mt-4 max-h-48 max-w-full object-contain" />
            <p className="mt-2 break-all text-xs text-slate-500">{stamp.file.name} — not uploaded yet</p>
          </div>}
        </div>
      </div>
    </form>
  </Card>
}
