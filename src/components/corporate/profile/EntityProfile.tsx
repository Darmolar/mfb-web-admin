import { useState } from 'react'
import { ArrowLeft, Loader2, Link2, Unlink } from 'lucide-react'
import { Badge, statusBadge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { Modal } from '../../ui/Modal'
import { TabBar } from '../../ui/TabBar'
import { useApi } from '../../../hooks/useApi'
import { useAuth } from '../../../context/AuthContext'
import { getCorporateDetail, linkCorporateSignatory, unlinkCorporateSignatory } from '../../../api'
import type { CorporateDetail } from '../../../api'
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
  corporateId: string
  onBack: () => void
}

export function EntityProfile({ corporateId, onBack }: Props) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('accounts')
  const [linkModal, setLinkModal] = useState(false)
  const [linkCustomerId, setLinkCustomerId] = useState('')
  const [sigLoading, setSigLoading] = useState(false)

  const { data: detail, loading, error, refetch } = useApi<CorporateDetail>(
    () => getCorporateDetail(corporateId).then(r => r.data),
    [corporateId],
  )

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 size={32} className="animate-spin text-slate-400" />
    </div>
  )

  if (error || !detail) return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-semibold cursor-pointer">
        <ArrowLeft size={16} /> Back to Corporate Banking
      </button>
      <p className="text-red-500 text-sm text-center py-12">{error ?? 'Corporate not found.'}</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 font-semibold cursor-pointer">
        <ArrowLeft size={16} /> Back to Corporate Banking
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <span className="text-xl font-black text-slate-600">{detail.companyName.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-black text-slate-800">{detail.companyName}</h2>
                <Badge label={detail.status} variant={statusBadge(detail.status)} size="md" />
              </div>
              <p className="text-xs text-slate-400">RC: {detail.rcNumber} · TIN: {detail.tin}</p>
              <p className="text-xs text-slate-400 mt-0.5">{detail.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">Primary Account</p>
              <p className="text-sm font-black text-slate-800 font-mono">{detail.primaryAccountNumber}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setLinkModal(true)} disabled={sigLoading}>
                <Link2 size={13} /> Link Signatory
              </Button>
              <Button variant="danger" size="sm" disabled={sigLoading} onClick={async () => {
                if (!confirm('Unlink the sole signatory from this corporate account?')) return
                setSigLoading(true)
                try {
                  await unlinkCorporateSignatory(corporateId)
                  refetch()
                  alert('Sole signatory unlinked.')
                } catch (e: any) { alert('Failed: ' + (e.message || 'Unknown error')) }
                finally { setSigLoading(false) }
              }}>
                {sigLoading ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />} Unlink
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CORPORATE BANKING</span>
          <span className="text-slate-200 mx-1">·</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ENTITY PROFILE</span>
        </div>
      </div>

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} variant="underline" />

      {activeTab === 'accounts'      && <InstitutionalAccounts detail={detail} />}
      {activeTab === 'users'         && <CorporateUsers corporateId={corporateId} />}
      {activeTab === 'transactions'  && <CorpTransactionHistory corporateId={corporateId} />}
      {activeTab === 'logins'        && <LoginHistory corporateId={corporateId} />}
      {activeTab === 'audit'         && <AuditTrail corporateId={corporateId} />}
      {activeTab === 'workflow'      && <ApprovalWorkflows />}
      {activeTab === 'limits'        && <CorporateLimits detail={detail} />}
      {activeTab === 'roles'         && <RoleFramework />}

      <Modal open={linkModal} onClose={() => setLinkModal(false)} title="Link Sole Signatory" width="max-w-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Retail Customer ID</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              value={linkCustomerId}
              onChange={e => setLinkCustomerId(e.target.value)}
              placeholder="Enter customer ID"
            />
          </div>
          <Button fullWidth disabled={!linkCustomerId.trim() || sigLoading} onClick={async () => {
            setSigLoading(true)
            try {
              await linkCorporateSignatory(corporateId, { customerId: linkCustomerId.trim(), adminId: user!.adminId })
              setLinkModal(false)
              setLinkCustomerId('')
              refetch()
              alert('Sole signatory linked successfully.')
            } catch (e: any) { alert('Failed: ' + (e.message || 'Unknown error')) }
            finally { setSigLoading(false) }
          }}>
            {sigLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />} Link Signatory
          </Button>
        </div>
      </Modal>
    </div>
  )
}
