import { CreditCard } from 'lucide-react'

export function IssuedCards() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
        <CreditCard size={24} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">Issued Cards</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto">
        The backend API does not currently expose an endpoint for Bank Admins to list all globally issued cards. Once the <code>/v1/bank-admin/cards/issued</code> endpoint is available, this view will display the complete list of issued cards.
      </p>
    </div>
  )
}
