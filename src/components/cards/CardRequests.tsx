import { useState } from 'react'
import { Eye, Check, X as XIcon } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getCardRequests, getCardRequestDetails, updateCardRequestStatus } from '../../api'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'

export function CardRequests() {
  const [viewReq, setViewReq] = useState<any>(null)
  const [details, setDetails] = useState<any>(null)

  const { data, loading, error, refetch } = useApi(async () => {
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
      await updateCardRequestStatus(viewReq.id, status)
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
        </div>
      </Modal>
    </div>
  )
}
