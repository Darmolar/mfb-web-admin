import { useState } from 'react'
import { ArrowLeft, MessageSquare, Flag } from 'lucide-react'
import type { RetailCustomer } from '../../../types'
import { Badge, statusBadge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { TabBar } from '../../ui/TabBar'
import { PersonalInfo } from './PersonalInfo'
import { KYCDocuments } from './KYCDocuments'
import { AccountsLimits } from './AccountsLimits'
import { TransactionHistory } from './TransactionHistory'
import { SecurityDevices } from './SecurityDevices'

const tabs = [
  { id: 'personal', label: 'Personal Info' },
  { id: 'kyc', label: 'KYC & Documents' },
  { id: 'accounts', label: 'Accounts & Limits' },
  { id: 'transactions', label: 'Transaction History' },
  { id: 'security', label: 'Security & Devices' },
]

interface Props {
  customer: RetailCustomer
  onBack: () => void
}

export function CustomerProfile({ customer, onBack }: Props) {
  const [activeTab, setActiveTab] = useState('personal')

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-semibold cursor-pointer">
        <ArrowLeft size={16} /> Back to Retail Banking
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="text-xl font-black text-slate-600">{customer.name.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-black text-slate-800">{customer.name}</h2>
                <Badge label={customer.kycTier} variant={statusBadge(customer.kycTier)} size="md" />
                <Badge label={customer.status} variant={statusBadge(customer.status)} size="md" />
              </div>
              <p className="text-xs text-slate-400">{customer.email} · {customer.phone}</p>
              <p className="text-xs text-slate-400 mt-0.5">Account: {customer.accountNo} · Member since {customer.memberSince}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><MessageSquare size={13} /> Message User</Button>
            <Button variant="secondary" size="sm"><Flag size={13} /> Flag for Review</Button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RETAIL BANKING</span>
          <span className="text-slate-200 mx-1">·</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">USER PROFILE</span>
        </div>
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} variant="underline" />

      {activeTab === 'personal' && <PersonalInfo customer={customer} />}
      {activeTab === 'kyc' && <KYCDocuments customer={customer} />}
      {activeTab === 'accounts' && <AccountsLimits customer={customer} />}
      {activeTab === 'transactions' && <TransactionHistory customer={customer} />}
      {activeTab === 'security' && <SecurityDevices />}
    </div>
  )
}
