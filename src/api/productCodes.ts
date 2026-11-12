export type CbaProductCodes = {
  individualProductCode: string
  corporateProductCode: string
}

/** Product identifiers are strings: leading zeroes must be preserved. */
export function validateProductCodes(input: CbaProductCodes): CbaProductCodes {
  const individualProductCode = input.individualProductCode.trim()
  const corporateProductCode = input.corporateProductCode.trim()
  if (!/^\d+$/.test(individualProductCode) || !/^\d+$/.test(corporateProductCode)) {
    throw new Error('Both product codes must contain digits only.')
  }
  return { individualProductCode, corporateProductCode }
}

const pick = (map: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const v = map[key]
    if (typeof v === 'string' || typeof v === 'number') return String(v).trim()
  }
  return ''
}

/** Reads a flattened settings map; missing codes come back as ''. */
export function readProductCodes(map: Record<string, unknown>): CbaProductCodes {
  return {
    individualProductCode: pick(map, ['cba.product.individual', 'individualProductCode']),
    corporateProductCode: pick(map, ['cba.product.corporate', 'corporateProductCode']),
  }
}
