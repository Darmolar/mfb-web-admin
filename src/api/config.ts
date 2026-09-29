export const API_BASE_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_BASE_URL ?? '/api/v1') : '/api/v1'
export const ADMIN_API_KEY = import.meta.env.DEV ? (import.meta.env.VITE_ADMIN_API_KEY ?? '') : ''
// Public API client identification; this is separate from admin authentication.
export const PUBLIC_API_KEY = import.meta.env.VITE_PUBLIC_API_KEY ?? 'Cu05G2FB_YqsATuvv-v5V5T746OfJ_4jAhy7VCG3bBU'
