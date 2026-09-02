import { useState } from 'react'
import { Eye, Check, X as XIcon, Truck, Loader2 } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { getCardRequests, getCardRequestDetails, updateCardRequestStatus, dispatchCardRequest } from '../../api'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'

export function CardRequests() {
  const { user } = useAuth()
  const [viewReq, setViewReq] = useState<any>(null)
  const [details, setDetails] = useState<any>(null)
  const [courierRef, setCourierRef] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [dispatchLoading, setDispatchLoading] = useState(false)

  const { data, refetch } = useApi(async () => {
    const res = await getCardRequests({ size: '100' })
    return res.data
  }, [])

  const requests = data?.content ?? []

  const viewDetails = async (req: any) => {
    setViewReq(req)
    try {
      const res = await getCardRequestDetails(req.id)
      setDetails(res.data)
    } catch (err) {
      setDetails({ error: 'Failed to load details' })
    }
  }

  const updateStatus = async (status: string) => {
    try {
      await updateCardRequestStatus(viewReq.id, status, 'admin')
      setViewReq(null)
      refetch()
    } catch (err) {
      alert('Failed to update status')
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      header: 'Customer',
      accessorKey: 'customerName',
      cell: (r) => <span className="font-semibold text-slate-700">{r.customerName || 'Unknown'}</span>
    },
    {
      header: 'Product',
      accessorKey: 'productName',
      cell: (r) => <span className="text-xs text-slate-500">{r.productName || r.cardProductId}</span>
    },
    {
      header: 'Delivery Type',
      accessorKey: 'deliveryType',
      cell: (r) => <span className="text-[11px] font-bold text-slate-400">{r.deliveryType || 'PICKUP'}</span>
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (r) => {
        let v = 'slate'
        if (r.status === 'APPROVED') v = 'green'
        if (r.status === 'REJECTED') v = 'red'
        if (r.status === 'PENDING') v = 'amber'
        return <Badge label={r.status ?? 'PENDING'} variant={v as any} />
      }
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (r) => (
        <button onClick={() => viewDetails(r)} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer">
          <Eye size={14} />
        </button>
      )
    }
  ]

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-700">Customer Card Requests</h3>

      <DataTable 
        columns={columns} 
        data={requests} 
        searchPlaceholder="Search requests..." 
        emptyMessage="No card requests found."
      />

      <Modal open={!!viewReq} onClose={() => setViewReq(null)} title="Request Details" width="max-w-md">
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 font-mono whitespace-pre-wrap">
            {details ? JSON.stringify(details, null, 2) : 'Loading details...'}
          </div>

          {viewReq?.status === 'PENDING' && (
            <div className="flex gap-3 pt-2">
              <Button variant="danger" className="flex-1" onClick={() => updateStatus('REJECTED')}>
                <XIcon size={14} /> Reject
              </Button>
              <Button className="flex-1" onClick={() => updateStatus('APPROVED')}>
                <Check size={14} /> Approve
              </Button>
            </div>
          )}

          {viewReq?.status === 'APPROVED' && (
            <div className="border-t border-slate-100 pt-4 mt-2 space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Dispatch Card</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Courier Reference</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={courierRef}
                  onChange={e => setCourierRef(e.target.value)}
                  placeholder="e.g. DHL-12345678"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                />
              </div>
              <Button
                fullWidth
                disabled={!courierRef.trim() || !deliveryDate || dispatchLoading}
                onClick={async () => {
                  setDispatchLoading(true)
                  try {
                    await dispatchCardRequest(viewReq.id, {
                      adminId: user?.adminId ?? 'admin',
                      courierReference: courierRef.trim(),
                      expectedDeliveryDate: deliveryDate,
                    })
                    setViewReq(null)
                    setCourierRef('')
                    setDeliveryDate('')
                    refetch()
                  } catch (e: any) {
                    alert('Dispatch failed: ' + (e.message || 'Unknown error'))
                  } finally {
                    setDispatchLoading(false)
                  }
                }}
              >
                {dispatchLoading ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />} Record Dispatch
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
