import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { TabBar } from '../ui/TabBar'
import { CardProducts } from './CardProducts'
import { CardRequests } from './CardRequests'
import { IssuedCards } from './IssuedCards'

export function CardsPage() {
  const [activeTab, setActiveTab] = useState('products')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center">
          <CreditCard size={20} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">Card Management</h2>
          <p className="text-sm text-slate-500">Manage card products and handle customer card requests.</p>
        </div>
      </div>

      <TabBar
        tabs={[
          { id: 'products', label: 'Card Products' },
          { id: 'requests', label: 'Card Requests' },
          { id: 'issued', label: 'Issued Cards' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'products' && <CardProducts />}
      {activeTab === 'requests' && <CardRequests />}
      {activeTab === 'issued' && <IssuedCards />}
    </div>
  )
}
