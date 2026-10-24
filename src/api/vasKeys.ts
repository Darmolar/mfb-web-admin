// Turns raw VAS config keys (vas.cashback.cable_tv = 0.055) into something an operator can read and edit
// safely: a plain label, a group, a display value, and an editor that converts back to what the server stores.

export type VasKeyKind = 'percent' | 'money' | 'switch' | 'account' | 'text'

export type VasKeyGroup = { id: string; title: string; hint: string }

export const VAS_KEY_GROUPS: VasKeyGroup[] = [
  { id: 'switch', title: 'Service switches', hint: 'Turn a service on or off for every customer.' },
  { id: 'money', title: 'Charges', hint: 'Flat fee in naira charged on each transaction.' },
  { id: 'percent', title: 'Cashback', hint: 'Share of the transaction amount paid back to the customer.' },
  { id: 'account', title: 'Settlement accounts', hint: 'Internal account numbers VAS postings go to.' },
  { id: 'text', title: 'Other settings', hint: 'Anything else the server stores for VAS.' },
]

const WORDS: Record<string, string> = {
  bvn: 'BVN', nin: 'NIN', tv: 'TV', cable_tv: 'Cable TV', vas: 'VAS', gl: 'GL', sms: 'SMS', api: 'API', url: 'URL',
}

const titleWords = (segment: string) =>
  WORDS[segment] ?? segment.split(/[_-]/).map(w => WORDS[w] ?? w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

const isBool = (v: unknown) => typeof v === 'boolean' || (typeof v === 'string' && /^(true|false)$/i.test(v.trim()))

export function vasKeyKind(key: string, value: unknown): VasKeyKind {
  const parts = key.toLowerCase().split('.')
  if (parts.includes('cashback') && !parts.includes('account')) return 'percent'
  if (parts.includes('account')) return 'account'
  if (isBool(value) || parts.some(p => p === 'enabled' || p.endsWith('_enabled'))) return 'switch'
  if (parts.includes('charge') || parts.includes('fee')) return 'money'
  return 'text'
}

/** "vas.cashback.cable_tv" → "Cable TV cashback"; "vas.charge.bill" → "Bill charge". */
export function vasKeyLabel(key: string) {
  const parts = key.split('.').filter(p => p && p.toLowerCase() !== 'vas')
  if (parts.length === 0) return key
  const last = parts[parts.length - 1].toLowerCase()
  if ((last === 'enabled' || last.endsWith('_enabled')) && parts.length > 1) {
    return `${parts.slice(0, -1).map(titleWords).join(' ')} service`
  }
  const [kind, ...rest] = parts
  const subject = rest.map(titleWords).join(' ')
  const noun = { cashback: 'cashback', charge: 'charge', fee: 'fee', account: 'account' }[kind.toLowerCase()]
  if (noun && subject) return `${subject} ${noun}`
  return parts.map(titleWords).join(' ')
}

const isBlank = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

export function formatVasValue(kind: VasKeyKind, value: unknown): string {
  if (isBlank(value)) return 'Not set'
  const raw = String(value).trim()
  const n = Number(raw)
  if (kind === 'switch') return /^true$/i.test(raw) ? 'On' : /^false$/i.test(raw) ? 'Off' : raw
  if (kind === 'percent' && Number.isFinite(n)) return `${Number((n * 100).toFixed(4))}%`
  if (kind === 'money' && Number.isFinite(n)) return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return raw
}

/** The value to pre-fill the editor with, in the units the operator types (percent, not fraction). */
export function editorValue(kind: VasKeyKind, value: unknown): string {
  if (isBlank(value)) return kind === 'switch' ? 'false' : ''
  const raw = String(value).trim()
  if (kind === 'switch') return /^true$/i.test(raw) ? 'true' : 'false'
  if (kind === 'percent' && Number.isFinite(Number(raw))) return String(Number((Number(raw) * 100).toFixed(4)))
  return raw
}

/** Converts the operator's input back to the stored value, or explains why it is invalid. */
export function toStoredValue(kind: VasKeyKind, input: string): { value: string } | { error: string } {
  const v = input.trim()
  if (v === '') return { error: 'Enter a value.' }
  const n = Number(v)
  switch (kind) {
    case 'switch':
      return /^(true|false)$/.test(v) ? { value: v } : { error: 'Choose On or Off.' }
    case 'percent':
      if (!Number.isFinite(n) || n < 0 || n > 100) return { error: 'Enter a percentage between 0 and 100.' }
      return { value: String(Number((n / 100).toFixed(6))) }
    case 'money':
      if (!Number.isFinite(n) || n < 0) return { error: 'Enter an amount of 0 or more.' }
      return { value: String(Number(n.toFixed(2))) }
    case 'account':
      return /^\d+$/.test(v) ? { value: v } : { error: 'Account numbers contain digits only.' }
    default:
      return { value: v }
  }
}
