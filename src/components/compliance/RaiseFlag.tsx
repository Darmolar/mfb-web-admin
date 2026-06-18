import { useState } from 'react'
import { Button } from '../ui/Button'
import { useAuth } from '../../context/AuthContext'
import { raiseComplianceFlag } from '../../api'

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const TARGET_TYPES = ['CUSTOMER', 'CORPORATE', 'TRANSACTION', 'ACCOUNT']

interface Props {
  onSuccess: () => void
}

export function RaiseFlag({ onSuccess }: Props) {
  const { user } = useAuth()
  const [form, setForm] = useState({
    targetType: 'CUSTOMER',
    targetId: '',
    reason: '',
    details: '',
    severity: 'MEDIUM',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!form.targetId.trim() || !form.reason.trim()) {
      setError('Target ID and reason are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await raiseComplianceFlag({ ...form, raisedBy: user.adminId })
      setSuccess(true)
      setForm({ targetType: 'CUSTOMER', targetId: '', reason: '', details: '', severity: 'MEDIUM' })
      setTimeout(() => { setSuccess(false); onSuccess() }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to raise flag')
    } finally {
      setLoading(false)
    }
  }

  const fieldClass = 'w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 max-w-2xl">
      <h3 className="text-sm font-bold text-slate-700 mb-5">New Compliance Flag</h3>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target Type</label>
            <select value={form.targetType} onChange={e => set('targetType', e.target.value)} className={fieldClass}>
              {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Target ID</label>
            <input
              value={form.targetId}
              onChange={e => set('targetId', e.target.value)}
              placeholder="Customer / corporate / transaction ID"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Severity</label>
          <div className="flex gap-2">
            {SEVERITIES.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set('severity', s)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  form.severity === s
                    ? s === 'CRITICAL' ? 'bg-red-600 text-white border-red-600'
                    : s === 'HIGH' ? 'bg-amber-500 text-white border-amber-500'
                    : s === 'MEDIUM' ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-slate-600 text-white border-slate-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Reason</label>
          <input
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            placeholder="Brief reason for flagging"
            className={fieldClass}
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Details</label>
          <textarea
            value={form.details}
            onChange={e => set('details', e.target.value)}
            placeholder="Additional details and evidence…"
            rows={4}
            className={`${fieldClass} resize-none`}
          />
        </div>

        {error && (
          <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">Flag raised successfully.</p>
        )}

        <Button type="submit" disabled={loading} size="lg">
          {loading ? 'Submitting…' : 'Raise Flag'}
        </Button>
      </form>
    </div>
  )
}
