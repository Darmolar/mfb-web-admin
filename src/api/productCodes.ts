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
