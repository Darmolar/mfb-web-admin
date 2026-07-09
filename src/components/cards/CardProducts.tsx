import { useState } from 'react'
import { Plus, Power, PowerOff, ShieldAlert } from 'lucide-react'
import { useApi } from '../../hooks/useApi'
import { getCardProducts, activateCardProduct, deactivateCardProduct, getCardProductRequirements, updateCardProductRequirements } from '../../api'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Modal } from '../ui/Modal'

export function CardProducts() {
  const [showCreate, setShowCreate] = useState(false)

  const [reqProduct, setReqProduct] = useState<any>(null)
  const [reqs, setReqs] = useState<string>('')

  const { data, refetch } = useApi(async () => {
    const res = await getCardProducts({ size: '100' })
    return res.data
  }, [])

  const products = data ?? []

  const toggleStatus = async (p: any) => {
    try {
      if (p.status === 'ACTIVE') await deactivateCardProduct(p.id, 'admin')
      else await activateCardProduct(p.id, 'admin')
      refetch()
    } catch (err) {
      alert('Failed to toggle status')
    }
  }

  const openReqs = async (p: any) => {
    try {
      setReqProduct(p)
      const res = await getCardProductRequirements(p.id)
      setReqs(JSON.stringify(res.data, null, 2))
    } catch (err) {
      setReqs('[]')
    }
  }

  const saveReqs = async () => {
    try {
      await updateCardProductRequirements(reqProduct.id, JSON.parse(reqs), 'admin')
      setReqProduct(null)
      alert('Requirements updated')
    } catch (err) {
      alert('Invalid JSON or failed to update')
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      header: 'Product Name',
      accessorKey: 'name',
      cell: (p) => <span className="font-semibold text-slate-700">{p.name || 'Unnamed'}</span>
    },
    {
      header: 'Code',
      accessorKey: 'code',
      cell: (p) => <span className="text-xs text-slate-500 font-mono">{p.code}</span>
    },
    {
      header: 'Type',
      accessorKey: 'cardType',
      cell: (p) => <Badge label={p.cardType ?? 'DEBIT'} variant="slate" />
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (p) => <Badge label={p.status ?? 'INACTIVE'} variant={p.status === 'ACTIVE' ? 'green' : 'slate'} />
    },
    {
      header: 'Actions',
      sortable: false,
      cell: (p) => (
        <div className="flex gap-2">
          <button onClick={() => toggleStatus(p)} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer" title="Toggle Status">
            {p.status === 'ACTIVE' ? <PowerOff size={14} /> : <Power size={14} />}
          </button>
          <button onClick={() => openReqs(p)} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer" title="Requirements">
            <ShieldAlert size={14} />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-slate-700">Available Card Products</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus size={14} /> New Product</Button>
      </div>

      <DataTable 
        columns={columns} 
        data={products} 
        searchPlaceholder="Search card products..." 
        emptyMessage="No card products found."
      />

      <Modal open={!!reqProduct} onClose={() => setReqProduct(null)} title="Product Requirements">
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Edit requirements for {reqProduct?.name} (JSON format)</p>
          <textarea
            className="w-full h-48 p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-300 outline-none"
            value={reqs}
            onChange={e => setReqs(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setReqProduct(null)}>Cancel</Button>
            <Button className="flex-1" onClick={saveReqs}>Save Requirements</Button>
          </div>
        </div>
      </Modal>

      {showCreate && (
        <Modal open={true} onClose={() => setShowCreate(false)} title="Create Card Product">
          <p className="text-sm text-slate-500 mb-4">Please implement the full form for card product creation.</p>
          <Button onClick={() => setShowCreate(false)}>Close</Button>
        </Modal>
      )}
    </div>
  )
}
