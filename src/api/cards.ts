// Readers and validation for bank-admin card products and card requests.
// Shapes follow the live backend (checked 2026-10-24): products are a bare array with `active`; requests are a
// Spring page whose rows nest `customer`, `cardProduct` and `linkedBankAccount`.

import type { CardProductPayload, CardProductRequirement } from './types'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
const pick = (o: Obj, ...keys: string[]) => keys.map(k => str(o[k])).find(Boolean) ?? ''

export const CARD_TYPES = ['VERVE', 'MASTERCARD', 'VISA'] as const

/** Scheme colour (Tailwind class) for small chips, matching the card art. */
export const SCHEME_DOT: Record<string, string> = { VERVE: 'bg-emerald-600', MASTERCARD: 'bg-slate-700', VISA: 'bg-indigo-700' }

export type CardProductRecord = {
  id: string
  code: string
  cardType: string
  name: string
  description: string
  issuanceFee: number | null
  replacementFee: number | null
  requiresDeliveryAddress: boolean
  defaultAtmLimit: number | null
  defaultPosLimit: number | null
  defaultWebLimit: number | null
  active: boolean
}

export function readCardProducts(body: unknown): CardProductRecord[] {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.content) ? body.content : []
  return list.filter(isObj).map(p => ({
    id: pick(p, 'id'),
    code: pick(p, 'code'),
    cardType: pick(p, 'cardType').toUpperCase(),
    name: pick(p, 'name') || 'Unnamed product',
    description: pick(p, 'description'),
    issuanceFee: num(p.issuanceFee),
    replacementFee: num(p.replacementFee),
    requiresDeliveryAddress: p.requiresDeliveryAddress === true,
    defaultAtmLimit: num(p.defaultAtmLimit),
    defaultPosLimit: num(p.defaultPosLimit),
    defaultWebLimit: num(p.defaultWebLimit),
    // Older responses used status: 'ACTIVE'; the live backend sends active: true.
    active: p.active === true || str(p.status).toUpperCase() === 'ACTIVE',
  })).filter(p => p.id)
}

export type CardProductForm = {
  code: string
  cardType: string
  name: string
  description: string
  issuanceFee: string
  replacementFee: string
  requiresDeliveryAddress: boolean
  defaultAtmLimit: string
  defaultPosLimit: string
  defaultWebLimit: string
  active: boolean
}

export const EMPTY_PRODUCT_FORM: CardProductForm = {
  code: '', cardType: 'VERVE', name: '', description: '', issuanceFee: '', replacementFee: '',
  requiresDeliveryAddress: true, defaultAtmLimit: '', defaultPosLimit: '', defaultWebLimit: '', active: false,
}

export function productToForm(p: CardProductRecord): CardProductForm {
  const s = (n: number | null) => (n === null ? '' : String(n))
  return {
    code: p.code, cardType: p.cardType || 'VERVE', name: p.name, description: p.description,
    issuanceFee: s(p.issuanceFee), replacementFee: s(p.replacementFee), requiresDeliveryAddress: p.requiresDeliveryAddress,
    defaultAtmLimit: s(p.defaultAtmLimit), defaultPosLimit: s(p.defaultPosLimit), defaultWebLimit: s(p.defaultWebLimit), active: p.active,
  }
}

/** Validates the form and builds the documented create/update payload, or returns the first problem. */
export function productPayload(form: CardProductForm, adminId: string): { payload: CardProductPayload } | { error: string } {
  const code = form.code.trim().toUpperCase()
  if (!/^[A-Z0-9_]{2,40}$/.test(code)) return { error: 'Code must be 2–40 capital letters, digits or underscores (e.g. VERVE_CLASSIC).' }
  if (!form.name.trim()) return { error: 'Enter a product name.' }
  if (!form.cardType) return { error: 'Choose a card scheme.' }
  const amounts: [keyof CardProductForm, string][] = [
    ['issuanceFee', 'Issuance fee'], ['replacementFee', 'Replacement fee'],
    ['defaultAtmLimit', 'ATM limit'], ['defaultPosLimit', 'POS limit'], ['defaultWebLimit', 'Web limit'],
  ]
  const values: Record<string, number> = {}
  for (const [key, label] of amounts) {
    const n = Number(String(form[key]).trim())
    if (String(form[key]).trim() === '' || !Number.isFinite(n) || n < 0) return { error: `${label} must be an amount of 0 or more.` }
    values[key] = Number(n.toFixed(2))
  }
  return {
    payload: {
      code, cardType: form.cardType, name: form.name.trim(), description: form.description.trim(),
      issuanceFee: values.issuanceFee, replacementFee: values.replacementFee, requiresDeliveryAddress: form.requiresDeliveryAddress,
      defaultAtmLimit: values.defaultAtmLimit, defaultPosLimit: values.defaultPosLimit, defaultWebLimit: values.defaultWebLimit,
      active: form.active, adminId,
    },
  }
}

export const REQUIREMENT_FIELD_TYPES = ['text', 'number', 'date', 'select', 'file'] as const

export function readRequirements(body: unknown): CardProductRequirement[] {
  const list = Array.isArray(body) ? body : []
  return list.filter(isObj).map((r, i) => ({
    fieldKey: pick(r, 'fieldKey'), label: pick(r, 'label'), fieldType: pick(r, 'fieldType') || 'text',
    required: r.required === true, fieldOrder: num(r.fieldOrder) ?? i + 1, optionsCsv: pick(r, 'optionsCsv'), helpText: pick(r, 'helpText'),
  })).sort((a, b) => (a.fieldOrder ?? 0) - (b.fieldOrder ?? 0))
}

/** Renumbers fieldOrder from the list order and checks keys before saving. */
export function cleanRequirements(rows: CardProductRequirement[]): { requirements: CardProductRequirement[] } | { error: string } {
  const seen = new Set<string>()
  const requirements: CardProductRequirement[] = []
  for (const [i, r] of rows.entries()) {
    const fieldKey = (r.fieldKey ?? '').trim()
    const label = (r.label ?? '').trim()
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(fieldKey)) return { error: `Row ${i + 1}: the key must start with a letter and use letters, digits or _ only.` }
    if (seen.has(fieldKey)) return { error: `Row ${i + 1}: the key "${fieldKey}" is used twice.` }
    if (!label) return { error: `Row ${i + 1}: enter a label customers will see.` }
    if (r.fieldType === 'select' && !(r.optionsCsv ?? '').trim()) return { error: `Row ${i + 1}: a dropdown needs options (comma separated).` }
    seen.add(fieldKey)
    requirements.push({
      fieldKey, label, fieldType: r.fieldType || 'text', required: !!r.required, fieldOrder: i + 1,
      optionsCsv: r.fieldType === 'select' ? (r.optionsCsv ?? '').trim() : '', helpText: (r.helpText ?? '').trim(),
    })
  }
  return { requirements }
}

export type CardRequestRecord = {
  id: string
  reference: string
  status: string
  customerId: string
  customerName: string
  customerUsername: string
  customerPhone: string
  customerEmail: string
  customerTier: string
  customerBvn: string
  productName: string
  productCode: string
  cardType: string
  linkedAccount: string
  linkedAccountName: string
  maskedPan: string
  expiry: string
  deliveryAddress: string
  issuanceFee: number | null
  feePaid: boolean
  atmLimit: number | null
  posLimit: number | null
  webLimit: number | null
  courierReference: string
  expectedDeliveryDate: string
  dispatchedAt: string
  activatedAt: string
  createdAt: string
}

export function readCardRequest(v: unknown): CardRequestRecord | null {
  if (!isObj(v)) return null
  const id = pick(v, 'id')
  if (!id) return null
  const c = isObj(v.customer) ? v.customer : {}
  const p = isObj(v.cardProduct) ? v.cardProduct : {}
  const a = isObj(v.linkedBankAccount) ? v.linkedBankAccount : {}
  const name = [pick(c, 'firstName'), pick(c, 'middleName'), pick(c, 'lastName')].filter(Boolean).join(' ')
  const month = num(v.expiryMonth), year = num(v.expiryYear)
  return {
    id,
    reference: pick(v, 'requestReference', 'reference'),
    status: pick(v, 'status').toUpperCase() || 'REQUESTED',
    customerId: pick(c, 'id') || pick(v, 'customerId'),
    customerName: name || pick(v, 'customerName') || pick(a, 'accountName') || 'Unknown customer',
    customerUsername: pick(c, 'username'),
    customerPhone: pick(c, 'phoneNumber'),
    customerEmail: pick(c, 'email'),
    customerTier: pick(c, 'accountTier'),
    customerBvn: pick(c, 'bvn'),
    productName: pick(p, 'name') || pick(v, 'productName') || '—',
    productCode: pick(p, 'code'),
    cardType: (pick(v, 'cardType') || pick(p, 'cardType')).toUpperCase(),
    linkedAccount: pick(v, 'linkedAccount') || pick(a, 'accountNumber'),
    linkedAccountName: pick(a, 'accountName'),
    maskedPan: pick(v, 'maskedPan'),
    expiry: month && year ? `${String(month).padStart(2, '0')}/${String(year).slice(-2)}` : '',
    deliveryAddress: pick(v, 'deliveryAddress'),
    issuanceFee: num(v.issuanceFee) ?? num(p.issuanceFee),
    feePaid: v.feePaid === true,
    atmLimit: num(v.dailyAtmLimit),
    posLimit: num(v.dailyPosLimit),
    webLimit: num(v.dailyWebLimit),
    courierReference: pick(v, 'courierReference'),
    expectedDeliveryDate: pick(v, 'expectedDeliveryDate'),
    dispatchedAt: pick(v, 'dispatchedAt'),
    activatedAt: pick(v, 'activatedAt'),
    createdAt: pick(v, 'createdAt'),
  }
}

export function readCardRequests(body: unknown) {
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.content) ? body.content : []
  const total = isObj(body) && typeof body.totalElements === 'number' ? body.totalElements : list.length
  return { requests: list.map(readCardRequest).filter((r): r is CardRequestRecord => r !== null), total }
}

/** Status → badge colour and a plain description for the details view. */
export const CARD_STATUS: Record<string, { variant: 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'purple'; label: string; hint: string }> = {
  REQUESTED: { variant: 'amber', label: 'Requested', hint: 'Waiting for the bank to approve or reject.' },
  PENDING: { variant: 'amber', label: 'Pending', hint: 'Waiting for the bank to approve or reject.' },
  APPROVED: { variant: 'blue', label: 'Approved', hint: 'Approved; record the dispatch once the card is sent.' },
  ISSUED: { variant: 'purple', label: 'Dispatched', hint: 'Sent to the customer; waiting for activation.' },
  DELIVERED: { variant: 'purple', label: 'Delivered', hint: 'Delivered; waiting for activation.' },
  ACTIVE: { variant: 'green', label: 'Active', hint: 'Activated and in use.' },
  FROZEN: { variant: 'slate', label: 'Frozen', hint: 'Temporarily blocked by the customer or the bank.' },
  REJECTED: { variant: 'red', label: 'Rejected', hint: 'The request was declined.' },
  TERMINATED: { variant: 'red', label: 'Terminated', hint: 'Permanently blocked.' },
}

/** Only transitions documented in the API: approve/reject an open request, dispatch an approved one. */
export function cardRequestActions(status: string) {
  return {
    canDecide: status === 'REQUESTED' || status === 'PENDING',
    canDispatch: status === 'APPROVED',
  }
}

export const naira = (n: number | null) =>
  n === null ? '—' : `₦${n.toLocaleString('en-NG', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`

export const maskBvn = (bvn: string) => (bvn.length > 6 ? `${bvn.slice(0, 3)}•••••${bvn.slice(-3)}` : bvn)

export type ProductUsage = { total: number; awaiting: number; active: number }

/** Request counts per product code, so the products page shows how much each card is used. */
export function productUsage(requests: CardRequestRecord[]): Record<string, ProductUsage> {
  const out: Record<string, ProductUsage> = {}
  for (const r of requests) {
    const key = r.productCode || r.productName
    const u = (out[key] ??= { total: 0, awaiting: 0, active: 0 })
    u.total++
    if (cardRequestActions(r.status).canDecide) u.awaiting++
    if (r.status === 'ACTIVE') u.active++
  }
  return out
}

/** Whole days a request has been waiting, or null once it is no longer open. */
export function waitingDays(r: CardRequestRecord, now = Date.now()): number | null {
  if (!cardRequestActions(r.status).canDecide || !r.createdAt) return null
  const t = Date.parse(r.createdAt)
  return Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 86_400_000)) : null
}
