import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImageUp, Loader2, Printer, RefreshCw, UserRound } from 'lucide-react'
import moment from 'moment'
import { getIdentityVerification, reverifyIdentity, requestIdentityImageUpdate } from '../../api'
import {
  IDENTITY_TYPE_LABELS, readIdentityRecord, readSubmissionOutcome, validateReplacementImage,
} from '../../api/identityVerification'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { DetailSkeleton, Skeleton } from '../ui/Skeleton'
import { Modal } from '../ui/Modal'

export function IdentityRecordDetails() {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)

  const { data: record, loading, error, refetch } = useApi(async () => {
    const parsed = readIdentityRecord((await getIdentityVerification(id)).data)
    if (!parsed) throw new Error('The identity record could not be read.')
    return parsed
  }, [id])

  const [notice, setNotice] = useState<string | null>(null)

  const [showReverify, setShowReverify] = useState(false)
  const [reverifying, setReverifying] = useState(false)
  const [reverifyError, setReverifyError] = useState<string | null>(null)

  const [newImage, setNewImage] = useState<File | null>(null)
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [imageReason, setImageReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(() => () => { if (newImageUrl) URL.revokeObjectURL(newImageUrl) }, [newImageUrl])

  function chooseImage(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = ''
    if (!file) return
    const invalid = validateReplacementImage(file)
    if (invalid) { setNotice(invalid); return }
    setNewImage(file)
    setNewImageUrl(URL.createObjectURL(file))
    setImageReason('')
    setConfirmed(false)
    setImageError(null)
  }

  function closeImageModal() {
    setNewImage(null)
    setNewImageUrl(null)
  }

  async function submitImage() {
    if (!newImage || !confirmed || !imageReason.trim()) return
    setUploading(true)
    setImageError(null)
    try {
      const res = await requestIdentityImageUpdate(id, { image: newImage, notes: imageReason.trim() })
      const outcome = readSubmissionOutcome(res.data)
      closeImageModal()
      setNotice(outcome.pendingApproval
        ? `Image update submitted for approval${outcome.requestId ? ` (request ${outcome.requestId.slice(0, 8)})` : ''}. The current image stays in use until a second admin approves it in Governance → Approval Management.`
        : outcome.message ?? 'Image updated.')
      refetch()
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'The image could not be submitted.')
    } finally {
      setUploading(false)
    }
  }

  async function submitReverify() {
    setReverifying(true)
    setReverifyError(null)
    try {
      const res = await reverifyIdentity(id)
      const outcome = readSubmissionOutcome(res.data)
      setShowReverify(false)
      setNotice(`${outcome.message ?? 'Identity record refreshed from provider.'} The details and photo below are the provider's latest.`)
      refetch()
    } catch (err) {
      setReverifyError(err instanceof Error ? err.message : 'Re-verification failed.')
    } finally {
      setReverifying(false)
    }
  }

  if (loading && !record) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-44" />
          <div className="flex gap-2"><Skeleton className="h-8 w-24 rounded-lg" /><Skeleton className="h-8 w-20 rounded-lg" /></div>
        </div>
        <DetailSkeleton image fields={10} />
      </div>
    )
  }
  if (error || !record) {
    return (
      <div className="px-6 py-10 text-center space-y-3">
        <p className="text-xs text-red-500">{error ?? 'Identity record not found.'}</p>
        <Button size="sm" variant="secondary" onClick={() => navigate('/identity')}>Back to list</Button>
      </div>
    )
  }

  const summary: [string, string][] = [
    ['Full name', record.fullName],
    ['Identity type', IDENTITY_TYPE_LABELS[record.idType] ?? record.idType],
    ['Identity number', record.idNumber || '—'],
    ['Customer ID', record.customerId ?? 'Not linked to a customer'],
    ['Verified on', record.verifiedAt ? moment(record.verifiedAt).format('DD MMM YYYY, HH:mm') : '—'],
    ['Last updated', record.updatedAt ? moment(record.updatedAt).format('DD MMM YYYY, HH:mm') : '—'],
    ['Provider', record.provider ?? '—'],
  ]

  return (
    <div className="space-y-5">
      <div className="no-print flex items-center justify-between">
        <button onClick={() => navigate('/identity')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer">
          <ArrowLeft size={14} /> Back to verified identities
        </button>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => { setShowReverify(true); setReverifyError(null) }}>
            <RefreshCw size={13} /> Re-verify
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer size={13} /> Print
          </Button>
        </div>
      </div>

      {notice && (
        <div className="no-print text-xs text-slate-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex justify-between gap-4">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">Dismiss</button>
        </div>
      )}

      <Card className="print-area">
        <div className="print-only items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <img src="/user-logo.png" alt="Memphis MFB" className="h-10 object-contain" />
          <div className="text-right">
            <p className="text-sm font-bold text-slate-800">Identity Verification Record</p>
            <p className="text-[10px] text-slate-500">Record ID {record.id}</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex flex-col items-center gap-3 md:w-56 flex-shrink-0">
            {record.imageUrl
              ? <img src={record.imageUrl} alt={`Photo of ${record.fullName}`} className="w-48 h-56 object-cover rounded-xl border border-slate-200" />
              : (
                <div className="w-48 h-56 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-300">
                  <UserRound size={40} />
                  <span className="text-[11px] mt-2">No image on record</span>
                </div>
              )}
            <Button size="sm" variant="secondary" className="no-print" onClick={() => fileInput.current?.click()}>
              <ImageUp size={13} /> Update image
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={e => chooseImage(e.target.files?.[0])}
            />
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800">{record.fullName}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">{IDENTITY_TYPE_LABELS[record.idType] ?? record.idType} verification</p>
            </div>

            <DetailGrid title="Summary" rows={summary} />
            {record.details.length > 0 && <DetailGrid title="Full details returned by the provider" rows={record.details} />}
          </div>
        </div>

        <p className="print-only text-[10px] text-slate-500 border-t border-slate-200 pt-3 mt-8">
          Printed by {user?.name ?? 'admin'} on {moment().format('DD MMM YYYY, HH:mm')}. Generated from Memphis MFB records for official use only.
        </p>
      </Card>

      <Modal open={!!newImage} onClose={closeImageModal} title="Update identity image" width="max-w-2xl">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <ImagePane label="Current image" src={record.imageUrl} />
            <ImagePane label="New image" src={newImageUrl} highlight />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Reason for update <span className="text-red-400">*</span></label>
            <textarea
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              rows={2}
              value={imageReason}
              onChange={e => setImageReason(e.target.value)}
              placeholder="e.g. Provider photo is outdated; customer failing face match at login."
            />
          </div>
          <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="mt-0.5 accent-slate-700" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
            <span>I have verified the customer and confirm the new image is of the same person.</span>
          </label>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
            This change is logged against your account and needs approval from a second admin before it is used for face verification.
          </p>
          {imageError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{imageError}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1 justify-center" onClick={closeImageModal}>Cancel</Button>
            <Button className="flex-1 justify-center" disabled={!confirmed || !imageReason.trim() || uploading} onClick={submitImage}>
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImageUp size={14} />} Submit for approval
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showReverify} onClose={() => setShowReverify(false)} title="Re-verify identity" width="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            This fetches the {record.idType || 'identity'} record again from the provider and <strong>replaces the stored details and photo
            straight away</strong> with what the provider returns. The action is recorded in the admin audit trail under your name.
          </p>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
            Use this when the stored record looks outdated or incomplete. To use a photo taken in person instead, use Update image.
          </p>
          {reverifyError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{reverifyError}</p>}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
            <Button variant="secondary" className="sm:flex-1 justify-center" onClick={() => setShowReverify(false)} disabled={reverifying}>Cancel</Button>
            <Button className="sm:flex-1 justify-center" disabled={reverifying} onClick={submitReverify}>
              {reverifying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Re-verify now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DetailGrid({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="border-b border-slate-50 pb-2">
            <dt className="text-[11px] text-slate-400">{label}</dt>
            <dd className="text-sm font-medium text-slate-700 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ImagePane({ label, src, highlight }: { label: string; src: string | null; highlight?: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      {src
        ? <img src={src} alt={label} className={`w-full h-64 object-cover rounded-xl border ${highlight ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-slate-200'}`} />
        : <div className="w-full h-64 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-300">No image on record</div>}
    </div>
  )
}
