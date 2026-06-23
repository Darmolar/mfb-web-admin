import { useState, useRef } from 'react'
// Removed ShieldCheck
import { useAuth } from '../../context/AuthContext'

export function TwoFactorPage() {
  const { verifyTwoFactor } = useAuth()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    if (value && index < 5) refs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) refs.current[index - 1]?.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length < 6) return
    setError('')
    setLoading(true)
    try {
      await verifyTwoFactor(fullCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify OTP.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf4f4] flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center">
        <img src="/user-logo.png" alt="MFB Logo" className="h-12 object-contain mb-2" />
        <p className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase mt-1">Super Admin Portal</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="text-center mb-6">
          <p className="text-sm font-semibold text-slate-600">Two-factor authentication</p>
          <p className="text-xs text-slate-400 mt-1">Verify your identity to access the ledger</p>

        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex gap-3 justify-center">
            {code.map((digit, i) => (
              <input
                key={i}
                ref={el => { refs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className="w-11 h-12 text-center text-lg font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 text-slate-800"
              />
            ))}
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || code.join('').length < 6}
            className="w-full bg-slate-700 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:opacity-60 text-sm tracking-widest uppercase"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        <div className="flex justify-between mt-5">
          <button className="text-xs text-blue-500 hover:text-blue-700 font-semibold cursor-pointer">
            Resend Code
          </button>
        </div>
      </div>
    </div>
  )
}
