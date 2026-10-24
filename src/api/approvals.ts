import { readList } from './roles'

// Identity image update requests (maker-checker), per the backend "Identity Verification Admin API" doc.
// The list has no images; the reviewer sees the live image from GET /identity/{identityRecordId}.

export type ImageRequest = {
  id: string
  identityRecordId: string
  idType: string
  idNumber: string
  fullName: string
  requestedBy: string
  requestNotes: string
  status: string
  createdAt: string | null
  reviewedBy: string | null
  reviewNotes: string | null
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const pick = (o: Obj, ...keys: string[]) => keys.map(k => str(o[k])).find(Boolean) ?? ''

export function readImageRequest(v: unknown): ImageRequest | null {
  if (!isObj(v)) return null
  const id = pick(v, 'id', 'requestId')
  if (!id) return null
  return {
    id,
    identityRecordId: pick(v, 'identityRecordId'),
    idType: pick(v, 'idType').toUpperCase(),
    idNumber: pick(v, 'idNumber'),
    fullName: pick(v, 'fullName') || '—',
    requestedBy: pick(v, 'requestedBy'),
    requestNotes: pick(v, 'requestNotes', 'notes'),
    status: pick(v, 'status').toUpperCase() || 'PENDING',
    createdAt: pick(v, 'createdAt') || null,
    reviewedBy: pick(v, 'reviewedBy', 'approvedBy', 'rejectedBy') || null,
    reviewNotes: pick(v, 'reviewNotes', 'approvalNotes', 'rejectionNotes') || null,
  }
}

export function readImageRequests(body: unknown) {
  const items = readList(body)
  const total = isObj(body) && typeof body.totalElements === 'number' ? body.totalElements : items.length
  return { requests: items.map(readImageRequest).filter((r): r is ImageRequest => r !== null), total }
}

/** The username the backend records as requestedBy: the token's subject, as the API proxy sends in X-Admin-Username. */
export function usernameFromToken(token: string | undefined): string | null {
  const payload = token?.split('.')[1]
  if (!payload) return null
  try {
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    // Admin tokens carry sub "admin:<email>".
    return typeof json.sub === 'string' && json.sub ? json.sub.replace(/^admin:/, '') : null
  } catch {
    return null
  }
}

/** Maker-checker: nobody may approve their own request. The server must enforce this too. */
export function isOwnRequest(request: ImageRequest, me: { username?: string | null; email?: string; adminId?: string }) {
  const by = request.requestedBy.toLowerCase()
  if (!by) return false
  const mine = [me.username, me.adminId, me.email, me.email?.split('@')[0]].filter(Boolean).map(v => v!.toLowerCase())
  return mine.includes(by)
}
