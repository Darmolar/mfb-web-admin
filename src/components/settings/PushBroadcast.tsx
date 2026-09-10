import { useState } from 'react'
import { Loader2, Radio, Users } from 'lucide-react'
import { Button } from '../ui/Button'
import { PushComposer, usePushMessage } from '../push/PushComposer'
import { sendPushBroadcast } from '../../api'
import type { PushBroadcastRequest } from '../../api/types'

const selectCls = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:bg-white'
const labelCls = 'block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1'

const STATUSES: NonNullable<PushBroadcastRequest['status']>[] = ['ACTIVE', 'PENDING', 'LOCKED', 'SUSPENDED', 'DEACTIVATED']
const PLATFORMS: NonNullable<PushBroadcastRequest['platform']>[] = ['ANDROID', 'IOS', 'WEB']

export function PushBroadcast() {
  const composer = usePushMessage()
  const [status, setStatus] = useState<string>('')
  const [tier, setTier] = useState<string>('')
  const [platform, setPlatform] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const audience = [
    status ? `status ${status}` : null,
    tier ? `tier ${tier}` : null,
    platform ? platform : null,
  ].filter(Boolean).join(', ') || 'all customers'

  const send = async () => {
    if (!confirm(`Send this push notification to ${audience}?`)) return
    setSending(true)
    setMessage(null)
    try {
      await sendPushBroadcast({
        ...composer.message,
        status: (status || undefined) as PushBroadcastRequest['status'],
        accountTier: (tier ? Number(tier) : undefined) as PushBroadcastRequest['accountTier'],
        platform: (platform || undefined) as PushBroadcastRequest['platform'],
      })
      setMessage({ ok: true, text: `Broadcast accepted. Delivery to ${audience} is in progress in the background.` })
      composer.reset()
    } catch (e: unknown) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : 'Broadcast failed' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">Push Broadcast</h3>
        <p className="text-xs text-slate-500 mt-0.5">Send a push notification to many customers at once. Leave filters blank to reach everyone.</p>
      </div>

      {message && (
        <div className={`text-xs font-semibold rounded-xl px-3 py-2 border ${message.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <PushComposer {...composer} disabled={sending} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-slate-400" />
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Audience filters</p>
            </div>
            <div>
              <label className={labelCls}>Account status</label>
              <select className={selectCls} value={status} onChange={e => setStatus(e.target.value)} disabled={sending}>
                <option value="">Any</option>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Account tier</label>
              <select className={selectCls} value={tier} onChange={e => setTier(e.target.value)} disabled={sending}>
                <option value="">Any</option>
                {[1, 2, 3].map(t => <option key={t} value={t}>Tier {t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform</label>
              <select className={selectCls} value={platform} onChange={e => setPlatform(e.target.value)} disabled={sending}>
                <option value="">Any</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-500">
              Sending to <span className="font-semibold text-slate-700">{audience}</span>
            </div>
          </div>

          <Button fullWidth onClick={send} disabled={sending || !composer.valid}>
            {sending ? <Loader2 size={13} className="animate-spin" /> : <Radio size={13} />} Send broadcast
          </Button>
        </div>
      </div>
    </div>
  )
}
