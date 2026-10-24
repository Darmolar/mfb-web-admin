import { readList } from './roles'

// Contract: backend "Identity Verification Admin API" doc (2026-10-24). The backend stores BVN and NIN
// only. Unknown fields are still shown so new provider fields appear without a code change.

export const IDENTITY_TYPES = ['BVN', 'NIN'] as const
export type IdentityType = (typeof IDENTITY_TYPES)[number]

export const IDENTITY_TYPE_LABELS: Record<string, string> = {
  BVN: 'BVN',
  NIN: 'NIN',
  CAC: 'CAC (RC/BN)',
  DL: "Driver's Licence",
}

export type IdentityRecord = {
  id: string
  fullName: string
  idNumber: string
  idType: string
  customerId: string | null
  status: string
  hasImage: boolean
  verifiedAt: string | null
  updatedAt: string | null
  provider: string | null
  imageUrl: string | null
  /** Every other returned field, label → value, for the full-details view and print-out. */
  details: [string, string][]
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const pick = (o: Obj, ...keys: string[]) => keys.map(k => str(o[k])).find(Boolean) ?? ''

const IMAGE_KEYS = ['faceImageBase64', 'imageUrl', 'photoUrl', 'image', 'photo', 'base64Image', 'faceImage', 'picture']
const HIDDEN_KEYS = new Set([
  'id', 'recordId', 'verificationId', 'fullName', 'name', 'idNumber', 'identityNumber', 'number',
  'idType', 'identityType', 'type', 'customerId', 'status', 'verifiedAt', 'createdAt', 'updatedAt', 'provider', 'hasImage',
  ...IMAGE_KEYS,
])

/** Accepts an https/data URL as-is and treats a bare base64 string (what BVN/NIN lookups return) as JPEG. */
export function toImageSrc(value: unknown): string | null {
  const v = str(value)
  if (!v) return null
  if (/^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp);base64,/i.test(v)) return v
  if (/^[A-Za-z0-9+/=\s]{200,}$/.test(v)) return `data:image/jpeg;base64,${v.replace(/\s/g, '')}`
  return null
}

function humanise(key: string) {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase()
  const label = words.charAt(0).toUpperCase() + words.slice(1)
  return label.replace(/\b(lga|bvn|nin|cac|rc|id|dob|tin|nimc)\b/gi, w => w.toUpperCase())
}

function flatten(o: Obj, prefix = ''): [string, string][] {
  return Object.entries(o).flatMap(([key, value]): [string, string][] => {
    if (!prefix && HIDDEN_KEYS.has(key)) return []
    const label = prefix ? `${prefix} ${humanise(key)}` : humanise(key)
    if (isObj(value)) return flatten(value, label)
    if (Array.isArray(value)) return value.length ? [[label, value.map(v => (isObj(v) ? JSON.stringify(v) : str(v))).join(', ')]] : []
    if (typeof value === 'boolean') return [[label, value ? 'Yes' : 'No']]
    const text = str(value)
    return text && !toImageSrc(text) ? [[label, text]] : []
  })
}

export function readIdentityRecord(v: unknown): IdentityRecord | null {
  if (!isObj(v)) return null
  const id = pick(v, 'id', 'recordId', 'verificationId')
  if (!id) return null
  const fullName = pick(v, 'fullName', 'name')
    || [pick(v, 'firstName'), pick(v, 'middleName'), pick(v, 'lastName')].filter(Boolean).join(' ')
    || pick(v, 'businessName', 'companyName')
  return {
    id,
    fullName: fullName || '—',
    idNumber: pick(v, 'idNumber', 'identityNumber', 'number', 'bvn', 'nin', 'rcNumber', 'licenseNumber'),
    idType: pick(v, 'idType', 'identityType', 'type').toUpperCase(),
    customerId: pick(v, 'customerId') || null,
    status: pick(v, 'status') || 'VERIFIED',
    hasImage: v.hasImage === true || IMAGE_KEYS.some(k => !!toImageSrc(v[k])),
    verifiedAt: pick(v, 'verifiedAt', 'createdAt') || null,
    updatedAt: pick(v, 'updatedAt') || null,
    provider: pick(v, 'provider') || null,
    imageUrl: IMAGE_KEYS.map(k => toImageSrc(v[k])).find(Boolean) ?? null,
    details: flatten(v),
  }
}

export function readIdentityRecords(body: unknown) {
  const items = readList(body, 'records', 'verifications')
  const total = isObj(body) && typeof body.totalElements === 'number' ? body.totalElements : items.length
  return { records: items.map(readIdentityRecord).filter((r): r is IdentityRecord => r !== null), total }
}

/** Shows a masked number in lists; the full number is only on the detail page. */
export function maskIdNumber(value: string) {
  return value.length > 6 ? `${value.slice(0, 3)}${'•'.repeat(value.length - 6)}${value.slice(-3)}` : value
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024

/** One search box: digits search the ID number, anything else searches the name. */
export function identitySearchParams(term: string): { name?: string; idNumber?: string } {
  const t = term.trim()
  if (!t) return {}
  return /^\d+$/.test(t) ? { idNumber: t } : { name: t }
}

export function validateReplacementImage(file: File): string | null {
  if (!/^image\/(jpeg|png)$/.test(file.type)) return 'Choose a JPEG or PNG image.'
  if (file.size > MAX_IMAGE_BYTES) return 'The image must be 2 MB or smaller.'
  return null
}

/** What the server said happened, so the UI never claims a change applied when it is waiting for approval. */
export function readSubmissionOutcome(body: unknown): { pendingApproval: boolean; requestId: string | null; message: string | null } {
  const o = isObj(body) ? body : {}
  const status = pick(o, 'status').toUpperCase()
  const requestId = pick(o, 'requestId', 'approvalId') || null
  return { pendingApproval: status === 'PENDING' || (!!requestId && !status), requestId, message: pick(o, 'message') || null }
}
