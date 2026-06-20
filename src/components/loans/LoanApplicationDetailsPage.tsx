import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getLoanApplicationDetails, getLoanApplicationRequirements, approveLoanApplication, declineLoanApplication, disburseLoan } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { Badge, statusBadge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { ArrowLeft, CheckCircle, XCircle, FileText, CreditCard } from 'lucide-react'

const fmt = (amount: number | undefined | null) =>
  amount == null ? '—' : `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`

export function LoanApplicationDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [appData, setAppData] = useState<any>(null)
  const [reqsData, setReqsData] = useState<any[]>([])

  // Action state
  const [action, setAction] = useState<'approve' | 'decline' | 'disburse' | null>(null)
  const [approvedAmount, setApprovedAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [declineReason, setDeclineReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const fetchData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [appRes, reqRes] = await Promise.all([
        getLoanApplicationDetails(id),
        getLoanApplicationRequirements(id).catch(() => ({ data: [] }))
      ])
      setAppData(appRes.data)
      setReqsData(reqRes.data)
      setApprovedAmount(String((appRes.data.requestedAmount ?? appRes.data.amount ?? 0) / 100))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load application details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleAction = async () => {
    if (!appData || !user || !action) return
    setActionLoading(true)
    setActionError('')
    try {
      if (action === 'approve') {
        await approveLoanApplication(appData.id, {
          adminId: user.adminId,
          approvedAmount: parseFloat(approvedAmount),
          notes: notes || 'Approved by admin.',
        })
      } else if (action === 'decline') {
        await declineLoanApplication(appData.id, {
          adminId: user.adminId,
          declineReason: declineReason || 'Does not meet lending criteria.',
          notes: notes || '',
        })
      } else if (action === 'disburse') {
        await disburseLoan(appData.id, user.adminId)
      }
      setAction(null)
      fetchData() // Refresh details
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading application details...</div>
  }

  if (error || !appData) {
    return (
      <div className="p-8 text-center text-red-500">
        <p className="mb-4">{error || 'Application not found'}</p>
        <Button onClick={() => navigate('/loans')}>Go Back</Button>
      </div>
    )
  }

  const fieldClass = 'w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/loans')} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Application #{appData.id.slice(0, 8)}</h1>
            <p className="text-sm text-slate-500">Submitted on {new Date(appData.createdAt ?? appData.appliedAt).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge label={appData.status} variant={statusBadge(appData.status)} />
          {appData.status === 'PENDING' && (
            <>
              <Button size="sm" variant="success" onClick={() => setAction('approve')}><CheckCircle className="w-4 h-4 mr-2" />Approve</Button>
              <Button size="sm" variant="danger" onClick={() => setAction('decline')}><XCircle className="w-4 h-4 mr-2" />Decline</Button>
            </>
          )}
          {appData.status === 'APPROVED' && (
            <Button size="sm" onClick={() => setAction('disburse')}><CreditCard className="w-4 h-4 mr-2" />Disburse</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" /> Customer Information
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer Name</p>
              <p className="text-sm font-medium text-slate-800">{appData.customer ? `${appData.customer.firstName} ${appData.customer.lastName}` : appData.customerName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Customer ID</p>
              <p className="text-sm font-medium text-slate-800 font-mono">{appData.customerId ?? appData.customer?.id ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</p>
              <p className="text-sm font-medium text-slate-800">{appData.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Employment Type</p>
              <p className="text-sm font-medium text-slate-800">{appData.employmentType ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupation</p>
              <p className="text-sm font-medium text-slate-800">{appData.occupation ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Education Level</p>
              <p className="text-sm font-medium text-slate-800">{appData.educationLevel ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* Loan Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-400" /> Loan Details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Requested</p>
                <p className="text-lg font-bold text-slate-800">{fmt(appData.requestedAmount ?? appData.amount)}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Approved</p>
                <p className="text-lg font-bold text-emerald-600">{fmt(appData.approvedAmount)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tenure</p>
                <p className="text-sm font-medium text-slate-800">{appData.tenureMonths ? `${appData.tenureMonths} Months` : '—'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Interest Rate</p>
                <p className="text-sm font-medium text-slate-800">{appData.interestRate ? `${appData.interestRate}%` : '—'}</p>
              </div>
            </div>
            
            <div className="h-px bg-slate-100 my-2" />
            
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Income</p>
              <p className="text-sm font-medium text-slate-800">{fmt(appData.monthlyIncome)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Annual Income</p>
              <p className="text-sm font-medium text-slate-800">{fmt(appData.annualIncome)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Source of Funds</p>
              <p className="text-sm font-medium text-slate-800">{appData.sourceOfFunds ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Requirements section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Submitted Documents & Requirements</h2>
        </div>
        
        {(() => {
          let reqs = [];
          if (Array.isArray(reqsData) && reqsData.length > 0) {
            reqs = reqsData;
          } else if (appData.details) {
            try {
              const detailsObj = typeof appData.details === 'string' ? JSON.parse(appData.details) : appData.details;
              reqs = Object.entries(detailsObj).map(([key, value]) => ({
                name: key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, (str: string) => str.toUpperCase()),
                value: value
              }));
            } catch (e) {
              console.error('Failed to parse details', e);
            }
          }

          if (reqs.length === 0) {
            return <div className="p-6"><p className="text-sm text-slate-500">No requirements submitted for this application.</p></div>;
          }

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4 border-b border-slate-200">Field</th>
                    <th className="px-6 py-4 border-b border-slate-200">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reqs.map((req: any, i: number) => {
                    const name = req.fieldKey ?? req.name ?? req.label ?? req.title ?? 'Requirement';
                    const provided = req.fieldValue ?? req.value ?? req.fileUrl ?? req.content ?? '—';

                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-800" style={{ textTransform: 'capitalize' }}>{name}</td>
                        <td className="px-6 py-4">
                          {String(provided).startsWith('http') ? (
                            <a href={provided} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              View Attached File
                            </a>
                          ) : (
                            <span className="font-mono text-slate-700">{String(provided)}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Action Modal */}
      {action && (
        <Modal
          open={!!action}
          onClose={() => { setAction(null) }}
          title={action === 'approve' ? 'Approve Loan Application' : action === 'decline' ? 'Decline Loan Application' : 'Disburse Loan'}
        >
          <div className="space-y-5">
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Requested Amount</p>
              <p className="text-xl font-black text-slate-800">{fmt(appData.requestedAmount ?? appData.amount ?? 0)}</p>
            </div>

            {action === 'approve' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Approved Amount (₦)</label>
                <input type="number" value={approvedAmount} onChange={e => setApprovedAmount(e.target.value)} className={fieldClass} />
              </div>
            )}

            {action === 'decline' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Decline Reason</label>
                <input value={declineReason} onChange={e => setDeclineReason(e.target.value)} className={fieldClass} placeholder="e.g. Insufficient turnover" />
              </div>
            )}

            {action !== 'disburse' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${fieldClass} resize-none`} placeholder="Optional notes…" />
              </div>
            )}

            {action === 'disburse' && (
              <p className="text-sm text-slate-600">Confirm that you want to disburse <span className="font-bold">{fmt(appData.approvedAmount ?? appData.requestedAmount ?? appData.amount)}</span> to this customer. This action cannot be undone.</p>
            )}

            {actionError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{actionError}</p>
            )}

            <div className="h-px bg-slate-100" />
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setAction(null) }}>Cancel</Button>
              <Button
                className="flex-1"
                variant={action === 'decline' ? 'danger' : action === 'approve' ? 'success' : 'primary'}
                onClick={handleAction}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing…' : action === 'approve' ? 'Approve' : action === 'decline' ? 'Decline' : 'Disburse'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
