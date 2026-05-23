import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { CorporateEntity } from '../../../types'
import { Badge, statusBadge } from '../../ui/Badge'
import { TabBar } from '../../ui/TabBar'
import { InstitutionalAccounts } from './InstitutionalAccounts'
import { CorporateUsers } from './CorporateUsers'
import { CorpTransactionHistory } from './CorpTransactionHistory'
import { LoginHistory } from './LoginHistory'
import { AuditTrail } from './AuditTrail'
import { ApprovalWorkflows } from './ApprovalWorkflows'
import { CorporateLimits } from './CorporateLimits'
import { RoleFramework } from './RoleFramework'

const tabs = [
  { id: 'accounts', label: 'Institutional Accounts' },
  { id: 'users', label: 'Corporate Users' },
  { id: 'transactions', label: 'Transaction History' },
  { id: 'logins', label: 'Login History' },
  { id: 'audit', label: 'Audit Trail' },
  { id: 'workflow', label: 'Approval Workflows' },
  { id: 'limits', label: 'Corporate Limits' },
  { id: 'roles', label: 'Role Framework' },
]

interface Props {
  entity: CorporateEntity
  onBack: () => void
}

export function EntityProfile({ entity, onBack }: Props) {
  const [activeTab, setActiveTab] = useState('accounts')

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-semibold cursor-pointer">
        <ArrowLeft size={16} /> Back to Corporate Banking
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="text-xl font-black text-slate-600">{entity.name.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-black text-slate-800">{entity.name}</h2>
                <Badge label={entity.status} variant={statusBadge(entity.status)} size="md" />
              </div>
              <p className="text-xs text-slate-400">RC: {entity.rcNumber} · Tax ID: {entity.taxId}</p>
              <p className="text-xs text-slate-400 mt-0.5">{entity.hqAddress}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Authorized Personnel</p>
            <p className="text-xl font-black text-slate-800">{entity.authorizedPersonnel}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CORPORATE BANKING</span>
          <span className="text-slate-200 mx-1">·</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ENTITY PROFILE</span>
        </div>
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} variant="underline" />

      {activeTab === 'accounts' && <InstitutionalAccounts entity={entity} />}
      {activeTab === 'users' && <CorporateUsers entity={entity} />}
      {activeTab === 'transactions' && <CorpTransactionHistory entity={entity} />}
      {activeTab === 'logins' && <LoginHistory />}
      {activeTab === 'audit' && <AuditTrail />}
      {activeTab === 'workflow' && <ApprovalWorkflows />}
      {activeTab === 'limits' && <CorporateLimits />}
      {activeTab === 'roles' && <RoleFramework />}
    </div>
  )
}
