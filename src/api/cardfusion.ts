// CardFusion admin responses are undocumented in the OpenAPI file; these shapes
// follow the dev backend's live responses (Spring pages under `data`).
// Readers copy only display fields so device and office-token secrets never reach UI state.

export interface CardFusionPage<T> {
  items: T[]
  totalElements: number
}

export interface CardFusionStaff {
  id: string
  staffCode: string
  name: string
  email: string
  active: boolean
  lastLoginAt: string | null
  createdAt: string | null
}

export interface CardFusionDevice {
  id: string
  hardwareId: string
  status: string
  officeTokenDescription: string | null
  registeredAt: string | null
  revokedAt: string | null
}

export interface CardFusionActivity {
  id: string
  operation: string
  status: string
  staffName: string | null
  staffCode: string | null
  hardwareId: string | null
  accountNumber: string | null
  cardPanLast4: string | null
  latitude: number | null
  longitude: number | null
  details: string | null
  createdAt: string | null
}

export interface CardFusionCreatedStaff {
  staff: CardFusionStaff | null
  temporaryPassword: string
}

type Json = Record<string, unknown>

const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null)
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

function unwrap(body: unknown, what: string): unknown {
  if (!isObject(body) || body.success === false) throw new Error(`The ${what} could not be loaded.`)
  return body.data ?? body
}

function readPage<T>(body: unknown, what: string, readItem: (item: Json) => T | null): CardFusionPage<T> {
  const data = unwrap(body, what)
  const content = Array.isArray(data) ? data : isObject(data) && Array.isArray(data.content) ? data.content : null
  if (!content) throw new Error(`The server returned an unexpected ${what} response.`)
  const items = content.filter(isObject).map(readItem).filter((item): item is T => item !== null)
  const total = isObject(data) ? num(data.totalElements) : null
  return { items, totalElements: total ?? items.length }
}

function readStaffItem(item: Json): CardFusionStaff | null {
  const id = text(item.id)
  if (!id) return null
  return {
    id,
    staffCode: text(item.staffCode) ?? '—',
    name: text(item.name) ?? '—',
    email: text(item.email) ?? '—',
    active: item.active === true,
    lastLoginAt: text(item.lastLoginAt),
    createdAt: text(item.createdAt),
  }
}

export const readStaffPage = (body: unknown) => readPage(body, 'CardFusion staff', readStaffItem)

export const readDevicePage = (body: unknown) => readPage<CardFusionDevice>(body, 'CardFusion devices', item => {
  const id = text(item.id), hardwareId = text(item.hardwareId)
  if (!id || !hardwareId) return null
  return {
    id,
    hardwareId,
    status: text(item.status) ?? 'UNKNOWN',
    officeTokenDescription: isObject(item.officeToken) ? text(item.officeToken.description) : null,
    registeredAt: text(item.registeredAt),
    revokedAt: text(item.revokedAt),
  }
})

export const readActivityPage = (body: unknown) => readPage<CardFusionActivity>(body, 'CardFusion activity', item => {
  const id = text(item.id)
  if (!id) return null
  const staff = isObject(item.cfUser) ? item.cfUser : {}
  const pan = text(item.cardPan)?.replace(/\D/g, '') ?? ''
  return {
    id,
    operation: text(item.operation) ?? 'UNKNOWN',
    status: text(item.status) ?? 'UNKNOWN',
    staffName: text(staff.name),
    staffCode: text(staff.staffCode),
    hardwareId: text(item.hardwareId),
    accountNumber: text(item.accountNumber),
    cardPanLast4: pan.length >= 4 ? pan.slice(-4) : null,
    latitude: num(item.latitude),
    longitude: num(item.longitude),
    details: text(item.details),
    createdAt: text(item.createdAt),
  }
})

export function readCreatedStaff(body: unknown): CardFusionCreatedStaff {
  const data = unwrap(body, 'new staff account')
  const source = isObject(data) ? data : {}
  const nested = isObject(source.user) ? source.user : isObject(source.staff) ? source.staff : source
  const temporaryPassword = text(source.temporaryPassword) ?? text(nested.temporaryPassword)
  if (!temporaryPassword) throw new Error('The staff account was created, but the server did not return a temporary password. Contact the backend team before retrying.')
  return { staff: readStaffItem(nested), temporaryPassword }
}

export function readOfficeToken(body: unknown): string {
  const data = unwrap(body, 'office registration token')
  if (typeof data === 'string' && data.trim()) return data
  const source = isObject(data) ? data : {}
  const token = text(source.token) ?? text(source.officeRegistrationToken) ?? (isObject(source.officeToken) ? text(source.officeToken.token) : null)
  if (!token) throw new Error('A token may have been created, but the server did not return it. Contact the backend team before generating another.')
  return token
}
