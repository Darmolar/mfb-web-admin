import { ApiError } from './types'

// Contract confirmed by the backend team on 2026-10-15 (not yet in the OpenAPI file):
// GET returns the stamp below, or 404 NOT_FOUND when none has been uploaded.
// Position (bottom-right) and opacity (0.4) are fixed in the PDF renderer, so they are not settings.
export interface BankStamp {
  stampId: string | null
  enabled: boolean
  version: number | null
  contentType: string | null
  width: number | null
  height: number | null
  sizeBytes: number | null
  previewUrl: string | null
  updatedAt: string | null
  updatedBy: string | null
}

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : null)
const count = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null)
const webUrl = (value: unknown) => {
  const url = text(value)
  return url && /^https?:\/\/[^\s]+$/i.test(url) ? url : null
}

// These are runtime checks, so an unexpected response never shows as a saved state.
export function readBankStamp(body: unknown): BankStamp {
  if (!body || typeof body !== 'object') throw new Error('The bank stamp settings could not be read.')
  const envelope = body as Record<string, unknown>
  if (envelope.success === false) throw new Error('The bank stamp settings could not be read.')
  const data = (envelope.data ?? body) as Record<string, unknown> | null
  if (!data || typeof data !== 'object') throw new Error('The bank stamp settings could not be read.')
  const enabled = typeof data.isEnabled === 'boolean' ? data.isEnabled : data.enabled
  if (typeof enabled !== 'boolean') throw new Error('The server did not return the bank stamp enabled state. Reload or contact support.')
  return {
    stampId: text(data.stampId),
    enabled,
    version: count(data.version),
    contentType: text(data.contentType),
    width: count(data.width),
    height: count(data.height),
    sizeBytes: count(data.sizeBytes),
    previewUrl: webUrl(data.previewUrl),
    updatedAt: text(data.updatedAt),
    updatedBy: text(data.updatedBy),
  }
}

// A 404 means no stamp has been uploaded yet; every other failure is a real error.
export async function loadBankStamp(get: () => Promise<{ data: unknown }>): Promise<BankStamp | null> {
  try {
    return readBankStamp((await get()).data)
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 404) return null
    throw cause
  }
}
