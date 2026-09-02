import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, MessageSquare, Flag, Lock, Unlock, Loader2, MoreHorizontal, RefreshCw, KeyRound, Send, ShieldOff, LockOpen } from 'lucide-react'
import { Badge, statusBadge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { TabBar } from '../../ui/TabBar'
import { PersonalInfo } from './PersonalInfo'
import { AccountsLimits } from './AccountsLimits'
import { TransactionHistory } from './TransactionHistory'
import { SecurityDevices } from './SecurityDevices'
import { KYCDocuments } from './KYCDocuments'
import { AuditLogsTab } from './AuditLogsTab'
import { useApi } from '../../../hooks/useApi'
import { useAuth } from '../../../context/AuthContext'
import { getCustomerDetail, updateCustomerStatus, syncCustomerTier, unlockCustomerAccount, resendCustomerOtp, dispatchCustomerOtp, resetCustomerSecurity } from '../../../api'
import type { CustomerDetail } from '../../../api/types'

const tabs = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'accounts', label: 'Accounts & Limits' },
  { id: 'transactions', label: 'Transaction History' },
  { id: 'security', label: 'Security & Devices' },
  { id: 'kyc', label: 'KYC Documents' },
  { id: 'audit', label: 'Audit Logs' },
]

import { raiseComplianceFlag } from '../../../api'
import moment from 'moment'

interface Props {
  customerId: string
  onBack: () => void
}

export function CustomerProfile({ customerId, onBack }: Props) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('personal')
  const [statusLoading, setStatusLoading] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const detail = useApi<CustomerDetail>(async () => {
    const res = await getCustomerDetail(customerId)
    return res.data
  }, [customerId])

  const c = detail.data

  const handleToggleStatus = async () => {
    if (!c || !user) return
    const newStatus = c.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE'
    setStatusLoading(true)
    try {
      await updateCustomerStatus(customerId, { status: newStatus, adminId: user.adminId })
      detail.refetch()
    } catch {
      // Error handled via UI
    } finally {
      setStatusLoading(false)
    }
  }

  const handleFlag = async () => {
    if (!user) return
    try {
      await raiseComplianceFlag({
        targetType: 'CUSTOMER',
        targetId: customerId,
        reason: 'Suspicious Activity',
        details: 'Flagged by admin from profile view.',
        severity: 'MEDIUM',
        raisedBy: user.adminId
      })
      alert('Compliance flag raised successfully.')
    } catch (e: any) {
      alert('Failed to raise flag: ' + (e.message || 'Unknown error'))
    }
  }

  const handleMessage = () => {
    alert('Messaging endpoint is not currently supported by the backend.')
  }

  const runAction = async (key: string, fn: () => Promise<unknown>) => {
    setActionLoading(key)
    setMoreOpen(false)
    try {
      await fn()
      detail.refetch()
      alert(`${key} completed successfully.`)
    } catch (e: any) {
      alert(`${key} failed: ${e.message || 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  const moreActions = [
    { key: 'Sync KYC Tier', icon: <RefreshCw size={13} />, fn: () => syncCustomerTier(customerId, { adminId: user!.adminId }) },
    { key: 'Resend OTP', icon: <Send size={13} />, fn: () => resendCustomerOtp(customerId, { adminId: user!.adminId }) },
    { key: 'Dispatch OTP', icon: <KeyRound size={13} />, fn: () => dispatchCustomerOtp(customerId, { adminId: user!.adminId, channel: 'sms' }) },
    { key: 'Reset Security', icon: <ShieldOff size={13} />, fn: () => resetCustomerSecurity(customerId, { adminId: user!.adminId }) },
    { key: 'Unlock Rate-Limit', icon: <LockOpen size={13} />, fn: () => unlockCustomerAccount(customerId, { adminId: user!.adminId }) },
  ]

  if (detail.loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (detail.error || !c) {
    return (
      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-semibold cursor-pointer">
          <ArrowLeft size={16} /> Back to Retail Banking
        </button>
        <p className="text-red-500 text-sm text-center py-12">{detail.error ?? 'Customer not found.'}</p>
      </div>
    )
  }

  const displayName = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.username

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-semibold cursor-pointer">
        <ArrowLeft size={16} /> Back to Retail Banking
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="text-xl font-black text-slate-600">{displayName.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-black text-slate-800">{displayName}</h2>
                <Badge label={c.status} variant={statusBadge(c.status)} size="md" />
              </div>
              <p className="text-xs text-slate-400">{c.email} · {c.phoneNumber}</p>
              <p className="text-xs text-slate-400 mt-0.5">Account: {c.accountNumber} · BVN: {c.bvn} · Since {c.createdAt ? moment(c.createdAt).fromNow() : ''}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={c.status === 'ACTIVE' ? 'danger' : 'success'}
              size="sm"
              onClick={handleToggleStatus}
              disabled={statusLoading}
            >
              {statusLoading
                ? <Loader2 size={13} className="animate-spin" />
                : c.status === 'ACTIVE'
                  ? <><Lock size={13} /> Lock Account</>
                  : <><Unlock size={13} /> Unlock Account</>
              }
            </Button>
            <Button variant="secondary" size="sm" onClick={handleMessage}><MessageSquare size={13} /> Message</Button>
            <Button variant="secondary" size="sm" onClick={handleFlag}><Flag size={13} /> Flag</Button>
            <div className="relative" ref={moreRef}>
              <Button variant="secondary" size="sm" onClick={() => setMoreOpen(o => !o)} disabled={!!actionLoading}>
                {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <MoreHorizontal size={13} />} More
              </Button>
              {moreOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1">
                  {moreActions.map(a => (
                    <button
                      key={a.key}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      onClick={() => { if (confirm(`Are you sure you want to ${a.key}?`)) runAction(a.key, a.fn) }}
                    >
                      {a.icon} {a.key}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RETAIL BANKING</span>
          <span className="text-slate-200 mx-1">·</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">USER PROFILE</span>
        </div>
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} variant="underline" />

      {activeTab === 'personal' && <PersonalInfo customer={c} />}
      {activeTab === 'accounts' && <AccountsLimits customer={c} />}
      {activeTab === 'transactions' && <TransactionHistory customerId={c.id} />}
      {activeTab === 'security' && <SecurityDevices customerId={c.id} />}
      {activeTab === 'kyc' && <KYCDocuments customer={c} />}
      {activeTab === 'audit' && <AuditLogsTab customerId={c.id} />}
    </div>
  )
}
