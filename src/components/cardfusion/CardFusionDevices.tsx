import { useState } from 'react'
import { Ban, KeyRound, Loader2, MonitorSmartphone, RotateCcw } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { createCardFusionOfficeToken, getCardFusionDevices, setCardFusionDeviceRevoked } from '../../api'
import { readDevicePage, readOfficeToken, type CardFusionDevice } from '../../api/cardfusion'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { StatCardsSkeleton } from '../ui/Skeleton'
import { Field, Notice, OneTimeSecret, RefreshButton, SectionHeader, Tile, inputClass } from './shared'
import { errorMessage, formatWhen, readable, timeAgo } from './format'

const statusVariant = (status: string) => (status === 'REGISTERED' ? 'green' : status === 'REVOKED' ? 'red' : 'gray')

export function CardFusionDevices() {
  const { user } = useAuth()
  const [confirming, setConfirming] = useState<CardFusionDevice | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [tokenOpen, setTokenOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const { data, loading, error, refetch } = useApi(async () => readDevicePage((await getCardFusionDevices()).data), [])
  const devices = data?.items ?? []
  const revokedCount = devices.filter(d => d.status === 'REVOKED').length

  async function confirmToggle() {
    if (!confirming || busy) return
    const revoke = confirming.status !== 'REVOKED'
    if (!user?.adminId) { setNotice({ tone: 'error', text: 'Your admin session is missing an admin ID. Sign in again.' }); setConfirming(null); return }
    setBusy(true); setNotice(null)
    try {
      await setCardFusionDeviceRevoked(confirming.hardwareId, revoke, user.adminId)
      setNotice({ tone: 'success', text: `Device ${confirming.hardwareId} ${revoke ? 'revoked' : 'restored'}.` })
    } catch (cause) {
      setNotice({ tone: 'error', text: errorMessage(cause, `The device could not be ${revoke ? 'revoked' : 'restored'}.`) })
    } finally {
      setBusy(false)
      setConfirming(null)
      void refetch()
    }
  }

  function closeToken() {
    if (generating) return
    setTokenOpen(false); setDescription(''); setTokenError(''); setToken(null)
  }

  async function generate(event: React.FormEvent) {
    event.preventDefault()
    if (generating) return
    const text = description.trim()
    if (!text) { setTokenError('Describe where this token will be used, e.g. the branch and date.'); return }
    if (!user?.adminId) { setTokenError('Your admin session is missing an admin ID. Sign in again.'); return }
    setGenerating(true); setTokenError('')
    try {
      setToken(readOfficeToken((await createCardFusionOfficeToken({ description: text, adminId: user.adminId })).data))
    } catch (cause) {
      setTokenError(errorMessage(cause, 'The registration token could not be generated.'))
    } finally {
      setGenerating(false)
    }
  }

  const action = (d: CardFusionDevice, full = false) => {
    const revoked = d.status === 'REVOKED'
    return (
      <Button variant="secondary" size="sm" className={`${full ? 'w-full justify-center' : ''} ${revoked ? '' : '!text-red-600 hover:!bg-red-50'}`} onClick={e => { e.stopPropagation(); setConfirming(d) }}>
        {revoked ? <RotateCcw size={12} /> : <Ban size={12} />} {revoked ? 'Restore' : 'Revoke'}
      </Button>
    )
  }

  const columns: ColumnDef<CardFusionDevice>[] = [
    {
      header: 'Device',
      accessorKey: 'hardwareId',
      cell: d => (
        <div className="flex items-center gap-3 min-w-[220px]">
          <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><MonitorSmartphone size={16} /></span>
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-slate-700 truncate">{d.hardwareId}</p>
            <p className="text-[11px] text-slate-400 truncate">Paired with “{d.officeTokenDescription ?? 'unknown token'}”</p>
          </div>
        </div>
      ),
    },
    { header: 'Status', accessorKey: 'status', cell: d => <Badge label={readable(d.status)} variant={statusVariant(d.status)} /> },
    {
      header: 'Registered',
      accessorKey: 'registeredAt',
      cell: d => (
        <div className="whitespace-nowrap text-xs">
          <p className="text-slate-700">{timeAgo(d.registeredAt) ?? '—'}</p>
          <p className="text-slate-400">{formatWhen(d.registeredAt)}</p>
        </div>
      ),
    },
    { header: 'Revoked', accessorKey: 'revokedAt', cell: d => <span className="text-xs text-slate-500 whitespace-nowrap">{d.revokedAt ? formatWhen(d.revokedAt) : '—'}</span> },
    { header: '', sortable: false, cell: d => action(d) },
  ]

  const revoking = confirming?.status !== 'REVOKED'

  return (
    <div className="space-y-4">
      <SectionHeader title="Registered devices" text="Branch devices paired with a one-time office registration token. Revoke a lost or retired device to block sign-ins on it.">
        <RefreshButton loading={loading} onClick={() => void refetch()} />
        <Button size="sm" onClick={() => setTokenOpen(true)}><KeyRound size={14} /> Registration token</Button>
      </SectionHeader>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {loading && !data && <StatCardsSkeleton count={3} className="grid grid-cols-3 gap-2 sm:gap-3" />}
      {data && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <Tile label="Devices" value={devices.length} sub="Paired with the bank" />
          <Tile label="Can sign in" value={devices.length - revokedCount} sub="Registered and not revoked" />
          <Tile label="Revoked" value={revokedCount} sub="Blocked from signing in" tone={revokedCount ? 'red' : undefined} />
        </div>
      )}
      {data && data.totalElements > devices.length && (
        <p className="text-xs text-slate-400">Showing the latest {devices.length} of {data.totalElements} devices.</p>
      )}

      {data && (
        <div className="sm:hidden space-y-3">
          {devices.length === 0 && <p className="text-center text-xs text-slate-400 py-8">No CardFusion devices registered yet.</p>}
          {devices.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-slate-800 break-all">{d.hardwareId}</p>
                  <p className="text-xs text-slate-400">Paired with “{d.officeTokenDescription ?? 'unknown token'}”</p>
                </div>
                <Badge label={readable(d.status)} variant={statusVariant(d.status)} />
              </div>
              <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
                <dt className="text-slate-400">Registered</dt><dd className="text-right text-slate-700">{formatWhen(d.registeredAt)}</dd>
                {d.revokedAt && <><dt className="text-slate-400">Revoked</dt><dd className="text-right text-slate-700">{formatWhen(d.revokedAt)}</dd></>}
              </dl>
              {action(d, true)}
            </div>
          ))}
        </div>
      )}
      <div className={data ? 'hidden sm:block' : ''}>
        <DataTable
          columns={columns}
          data={devices}
          searchPlaceholder="Search by hardware ID or token…"
          searchFields={['hardwareId', 'officeTokenDescription', 'status']}
          loading={loading && !data}
          emptyMessage="No CardFusion devices registered yet."
        />
      </div>

      {/* Revoke / restore */}
      <Modal open={!!confirming} onClose={() => !busy && setConfirming(null)} title={revoking ? 'Revoke device' : 'Restore device'} width="max-w-sm">
        {confirming && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {revoking
                ? <>Staff will no longer be able to sign in on <strong className="font-mono">{confirming.hardwareId}</strong>. Use this for a lost, stolen or retired device.</>
                : <>Staff will be able to sign in on <strong className="font-mono">{confirming.hardwareId}</strong> again.</>}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <Button variant="secondary" className="sm:flex-1 justify-center" onClick={() => setConfirming(null)} disabled={busy}>Cancel</Button>
              <Button variant={revoking ? 'danger' : 'success'} className="sm:flex-1 justify-center" onClick={() => void confirmToggle()} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : revoking ? <Ban size={14} /> : <RotateCcw size={14} />} {revoking ? 'Revoke' : 'Restore'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={tokenOpen} onClose={closeToken} title={token ? 'Registration token ready' : 'Generate registration token'} width="max-w-md">
        {token ? (
          <OneTimeSecret
            label="Office registration token"
            value={token}
            warning="Enter this token on the new CardFusion device to pair it. It can be used once and is shown only now."
            onDone={() => { closeToken(); void refetch() }}
          />
        ) : (
          <form className="space-y-4" onSubmit={generate} noValidate>
            <p className="text-sm text-slate-600">A token pairs one new device with the bank. Generate it when the device is in front of you; it works only once.</p>
            {tokenError && <Notice tone="error">{tokenError}</Notice>}
            <Field label="Description" hint="Shown against the device once it registers, so make it identifiable.">
              <input className={inputClass} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Ikeja branch – Oct 2026" maxLength={120} autoFocus />
            </Field>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
              <Button type="button" variant="secondary" className="sm:flex-1 justify-center" onClick={closeToken} disabled={generating}>Cancel</Button>
              <Button type="submit" className="sm:flex-1 justify-center" disabled={generating}>
                {generating ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Generate
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
