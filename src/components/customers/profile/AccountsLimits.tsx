import { useState } from 'react'
import { Badge, statusBadge } from '../../ui/Badge'
import { Button } from '../../ui/Button'
import { useApi } from '../../../hooks/useApi'
import { addCustomerAccount, getCustomerLimits } from '../../../api'
import { useAuth } from '../../../context/AuthContext'
import type { CustomerAccount, CustomerDetail } from '../../../api'
import moment from 'moment'
import { LoadingRegion, Skeleton } from '../../ui/Skeleton'

interface Props { customer: CustomerDetail }

function fmt(n?: number) { return `₦${(n ?? 0).toLocaleString()}` }

export function AccountsLimits({ customer }: Props) {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<CustomerAccount[]>(() => customer.accounts?.length
    ? customer.accounts
    : [{ accountNumber: customer.accountNumber, accountName: `${customer.firstName} ${customer.lastName}`.trim() }])
  const [showAdd, setShowAdd] = useState(false)
  const [productCode, setProductCode] = useState('')
  const [description, setDescription] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const { data: limits, loading } = useApi(
    () => getCustomerLimits(customer.id).then(r => r.data),
    [customer.id],
  )

  const handleAdd = async () => {
    if (!user) return
    setAdding(true)
    setAddError(null)
    try {
      const response = await addCustomerAccount(customer.id, {
        adminId: user.adminId,
        ...(productCode.trim() ? { productCode: productCode.trim() } : {}),
        ...(description.trim() ? { accountDescription: description.trim() } : {}),
      })
      setAccounts(current => [...current, response.data])
      setProductCode('')
      setDescription('')
      setShowAdd(false)
    } catch (error: any) {
      setAddError(error.message || 'Unable to add account.')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accounts</h4>
          <Button size="sm" onClick={() => setShowAdd(value => !value)}>Add account</Button>
        </div>
        {showAdd && (
          <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={productCode} onChange={e => setProductCode(e.target.value)} placeholder="Product code (optional)" />
              <input className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" />
            </div>
            {addError && <p className="text-xs text-red-600">{addError}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd} disabled={adding}>{adding ? 'Adding…' : 'Create account'}</Button>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {accounts.map((account, index) => (
            <div key={`${account.id ?? account.accountNumber}-${index}`} className="rounded-xl border border-slate-100 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account No</p>
                  <p className="text-sm font-bold text-slate-700 font-mono">{account.accountNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Type</p>
                  <p className="text-sm text-slate-600">{account.accountType ?? '—'}{account.productName ? ` · ${account.productName}` : ''}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Account Name</p>
                  <p className="text-sm text-slate-600">{account.accountName ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ledger Balance</p>
                  <p className="text-sm text-slate-600">{account.currentBalance != null ? fmt(account.currentBalance) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available Balance</p>
                  <p className="text-sm text-slate-600">{account.availableBalance != null ? fmt(account.availableBalance) : '—'}</p>
                  {account.balanceAsOf && <p className="text-[10px] text-slate-400 mt-0.5">as of {moment(account.balanceAsOf).format('DD MMM, h:mm a')}</p>}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <Badge label={account.active === false ? 'INACTIVE' : account.primary ? 'PRIMARY' : 'ACTIVE'} variant={account.active === false ? 'red' : 'green'} size="md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Account Limits</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <Badge label={customer.status} variant={statusBadge(customer.status)} size="md" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Transaction Override</p>
            <p className="text-sm text-slate-600">
              {customer.transactionLimitOverride != null ? fmt(customer.transactionLimitOverride) : 'None'}
            </p>
            {customer.transactionLimitOverride != null && customer.transactionLimitExpiry && (
              <p className={`text-[10px] mt-0.5 ${moment(customer.transactionLimitExpiry).isBefore() ? 'text-red-500' : 'text-slate-400'}`}>
                {moment(customer.transactionLimitExpiry).isBefore() ? 'Expired' : 'Expires'} {moment(customer.transactionLimitExpiry).format('DD MMM YYYY, h:mm a')}
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Onboarded</p>
            <p className="text-sm text-slate-600">{customer.createdAt ? moment(customer.createdAt).fromNow() : '—'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Transaction Limits</h4>
        {loading && !limits ? (
          <LoadingRegion className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <Skeleton className="h-3 w-40" /><Skeleton className="h-3 w-24" />
              </div>
            ))}
          </LoadingRegion>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'Daily Transfer Limit', value: limits?.dailyTransferLimit != null ? fmt(limits.dailyTransferLimit) : '—' },
              { label: 'Single Transaction Limit', value: limits?.singleTransactionLimit != null ? fmt(limits.singleTransactionLimit) : '—' },
              { label: 'Balance Cap', value: limits?.balanceCap != null ? fmt(limits.balanceCap) : '—' },
            ].map(l => (
              <div key={l.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-sm text-slate-500">{l.label}</span>
                <span className="text-sm font-bold text-slate-700">{l.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
