import { useState } from 'react'
import { Ban, KeyRound, Loader2, RefreshCw, RotateCcw } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { createCardFusionOfficeToken, getCardFusionDevices, setCardFusionDeviceRevoked } from '../../api'
import { readDevicePage, readOfficeToken, type CardFusionDevice } from '../../api/cardfusion'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'
import { Field, Notice, OneTimeSecret, inputClass } from './shared'
import { errorMessage, formatWhen } from './format'

const statusVariant = (status: string) => (status === 'REGISTERED' ? 'green' : status === 'REVOKED' ? 'red' : 'gray')

export function CardFusionDevices() {
  const { user } = useAuth()
  const [busyDevice, setBusyDevice] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [tokenOpen, setTokenOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [token, setToken] = useState<string | null>(null)

  const { data, loading, error, refetch } = useApi(async () => readDevicePage((await getCardFusionDevices()).data), [])
  const devices = data?.items ?? []

  async function toggle(device: CardFusionDevice) {
    if (busyDevice) return
    const revoke = device.status !== 'REVOKED'
    const prompt = revoke
      ? `Revoke device ${device.hardwareId}? Staff will no longer be able to sign in on it.`
      : `Restore device ${device.hardwareId}? Staff will be able to sign in on it again.`
    if (!window.confirm(prompt)) return
    if (!user?.adminId) { setNotice({ tone: 'error', text: 'Your admin session is missing an admin ID. Sign in again.' }); return }
    setBusyDevice(device.hardwareId); setNotice(null)
    try {
      await setCardFusionDeviceRevoked(device.hardwareId, revoke, user.adminId)
      setNotice({ tone: 'success', text: `Device ${device.hardwareId} ${revoke ? 'revoked' : 'restored'}.` })
    } catch (cause) {
      setNotice({ tone: 'error', text: errorMessage(cause, `The device could not be ${revoke ? 'revoked' : 'restored'}.`) })
    } finally {
      setBusyDevice(null)
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

  const columns: ColumnDef<CardFusionDevice>[] = [
    { header: 'Hardware ID', accessorKey: 'hardwareId', cell: d => <span className="font-mono font-semibold text-slate-700">{d.hardwareId}</span> },
    { header: 'Registered With', accessorKey: 'officeTokenDescription', cell: d => <span className="text-slate-500">{d.officeTokenDescription ?? '—'}</span> },
    { header: 'Status', accessorKey: 'status', cell: d => <Badge label={d.status} variant={statusVariant(d.status)} /> },
    { header: 'Registered', accessorKey: 'registeredAt', cell: d => <span className="text-slate-500">{formatWhen(d.registeredAt)}</span> },
    { header: 'Revoked', accessorKey: 'revokedAt', cell: d => <span className="text-slate-500">{formatWhen(d.revokedAt)}</span> },
    {
      header: 'Actions',
      sortable: false,
      cell: d => {
        const revoked = d.status === 'REVOKED'
        return (
          <Button variant={revoked ? 'secondary' : 'danger'} size="sm" onClick={() => void toggle(d)} disabled={!!busyDevice}>
            {busyDevice === d.hardwareId ? <Loader2 size={12} className="animate-spin" /> : revoked ? <RotateCcw size={12} /> : <Ban size={12} />}
            {revoked ? 'Restore' : 'Revoke'}
          </Button>
        )
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-700">Registered Devices</h3>
          <p className="text-xs text-slate-400">Branch devices paired with a one-time office registration token.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
          <Button size="sm" onClick={() => setTokenOpen(true)}><KeyRound size={14} /> Generate Registration Token</Button>
        </div>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      {data && data.totalElements > devices.length && (
        <p className="text-xs text-slate-400">Showing the latest {devices.length} of {data.totalElements} devices.</p>
      )}

      <DataTable
        columns={columns}
        data={devices}
        searchPlaceholder="Search by hardware ID..."
        searchFields={['hardwareId', 'officeTokenDescription', 'status']}
        loading={loading && !data}
        emptyMessage="No CardFusion devices registered yet."
      />

      <Modal open={tokenOpen} onClose={closeToken} title={token ? 'Registration Token Ready' : 'Generate Registration Token'} width="max-w-md">
        {token ? (
          <OneTimeSecret
            label="Office Registration Token"
            value={token}
            warning="Enter this token on the new CardFusion device to pair it. It can be used once and is shown only now."
            onDone={() => { closeToken(); void refetch() }}
          />
        ) : (
          <form className="space-y-4" onSubmit={generate} noValidate>
            {tokenError && <Notice tone="error">{tokenError}</Notice>}
            <Field label="Description" hint="Shown against the device once it registers, so make it identifiable.">
              <input className={inputClass} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Ikeja branch – Oct 2026" maxLength={120} autoFocus />
            </Field>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1 justify-center" onClick={closeToken} disabled={generating}>Cancel</Button>
              <Button type="submit" className="flex-1 justify-center" disabled={generating}>
                {generating ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />} Generate
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
