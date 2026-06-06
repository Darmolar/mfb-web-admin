import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { useAuth } from '../../../context/AuthContext'
import { updateCorporateLimits } from '../../../api'
import type { CorporateDetail } from '../../../api'

interface Props { detail: CorporateDetail }

function fmt(n: number) { return `₦${n.toLocaleString()}` }

export function CorporateLimits({ detail }: Props) {
  const { user } = useAuth()
  const [showEdit, setShowEdit] = useState(false)
  const [single, setSingle] = useState(String(detail.singleTransferLimit ?? ''))
  const [daily, setDaily] = useState(String(detail.dailyTransferLimit ?? ''))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [current, setCurrent] = useState({ single: detail.singleTransferLimit, daily: detail.dailyTransferLimit })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setSaving(true); setSaveError(null)
    try {
      const res = await updateCorporateLimits(detail.id, {
        singleTransferLimit: Number(single),
        dailyTransferLimit: Number(daily),
        adminId: user.adminId,
      })
      setCurrent({ single: res.data.singleTransferLimit, daily: res.data.dailyTransferLimit })
      setShowEdit(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update limits')
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Transfer Limits</h4>
            <Button size="sm" variant="secondary" onClick={() => { setSingle(String(current.single)); setDaily(String(current.daily)); setShowEdit(true) }}>
              <Pencil size={13} /> Edit Limits
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Single Transfer Limit</p>
              <p className="text-2xl font-black text-slate-800">{fmt(current.single ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-1">Per transaction maximum</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Daily Transfer Limit</p>
              <p className="text-2xl font-black text-slate-800">{fmt(current.daily ?? 0)}</p>
              <p className="text-xs text-slate-400 mt-1">Aggregate daily maximum</p>
            </div>
          </div>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Update Transfer Limits" width="max-w-sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Single Transfer Limit (₦)</label>
            <input className={inputCls} type="number" min="0" value={single} onChange={e => setSingle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Daily Transfer Limit (₦)</label>
            <input className={inputCls} type="number" min="0" value={daily} onChange={e => setDaily(e.target.value)} required />
          </div>
          {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{saveError}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save Limits'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'
