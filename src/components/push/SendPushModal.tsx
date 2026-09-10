import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { PushComposer, usePushMessage } from './PushComposer'
import { sendCustomerPush } from '../../api'
import type { CustomerPushResponse } from '../../api/types'

type Props = {
  open: boolean
  onClose: () => void
  customerId: string
  customerName?: string
  accountNumber?: string
}

export function SendPushModal({ open, onClose, customerId, customerName, accountNumber }: Props) {
  const composer = usePushMessage()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CustomerPushResponse | null>(null)

  const close = () => { composer.reset(); setError(null); setResult(null); onClose() }

  const send = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await sendCustomerPush({ customerId, ...composer.message })
      setResult(res.data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Send Push Notification" width="max-w-lg">
      {result ? (
        <div className="space-y-4">
          <div className={`rounded-xl p-4 border ${result.tokenCount > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
            <p className={`text-sm font-semibold ${result.tokenCount > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
              {result.tokenCount > 0
                ? `Sent to ${result.tokenCount} device${result.tokenCount === 1 ? '' : 's'}.`
                : 'No device tokens registered for this customer.'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {result.tokenCount > 0
                ? 'The notification has been dispatched to the customer\'s registered devices.'
                : composer.saveInApp
                  ? 'The notification was saved to the customer\'s in-app inbox and will appear when they next open the app.'
                  : 'Nothing was delivered. Enable "save as in-app notification" to reach customers without a registered device.'}
            </p>
            <p className="text-[11px] font-mono text-slate-400 mt-2">Account {result.accountNumber}</p>
          </div>
          <Button variant="secondary" fullWidth onClick={close}>Done</Button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-500">
            To <span className="font-semibold text-slate-700">{customerName ?? 'customer'}</span>
            {accountNumber && <> · <span className="font-mono">{accountNumber}</span></>}
          </div>
          <PushComposer {...composer} disabled={sending} />
          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" className="flex-1" onClick={close} disabled={sending}>Cancel</Button>
            <Button className="flex-1" onClick={send} disabled={sending || !composer.valid}>
              {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Send
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
