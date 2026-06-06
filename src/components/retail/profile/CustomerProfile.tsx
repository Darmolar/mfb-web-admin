import { useState } from 'react'
import { ArrowLeft, MessageSquare, Flag, Lock, Unlock, Loader2 } from 'lucide-react'
import { Badge, statusBadge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { TabBar } from '../../ui/TabBar'
import { PersonalInfo } from './PersonalInfo'
import { AccountsLimits } from './AccountsLimits'
import { TransactionHistory } from './TransactionHistory'
import { SecurityDevices } from './SecurityDevices'
import { KYCDocuments } from './KYCDocuments'
import { useApi } from '../../../hooks/useApi'
import { useAuth } from '../../../context/AuthContext'
import { getCustomerDetail, updateCustomerStatus } from '../../../api'
import type { CustomerDetail } from '../../../api/types'

const tabs = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'accounts', label: 'Accounts & Limits' },
  { id: 'transactions', label: 'Transaction History' },
  { id: 'security', label: 'Security & Devices' },
  { id: 'kyc', label: 'KYC Documents' },
]

interface Props {
  customerId: string
  onBack: () => void
}

export function CustomerProfile({ customerId, onBack }: Props) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('personal')
  const [statusLoading, setStatusLoading] = useState(false)

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
              <p className="text-xs text-slate-400 mt-0.5">Account: {c.accountNumber} · BVN: {c.bvn} · Since {c.createdAt?.split('T')[0]}</p>
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
            <Button variant="secondary" size="sm"><MessageSquare size={13} /> Message</Button>
            <Button variant="secondary" size="sm"><Flag size={13} /> Flag</Button>
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
    </div>
  )
}
