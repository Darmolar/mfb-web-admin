import { Bell, HelpCircle, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const sectionTitles: Record<string, string> = {
  overview: 'Overview',
  kyc: 'KYC & Compliance',
  identity: 'Identity Verification',
  retail: 'Retail Banking',
  customers: 'Customers',
  corporate: 'Corporate Banking',
  oversight: 'Transaction Oversight',
  compliance: 'Compliance Flags',
  loans: 'Loan Management',
  savings: 'Savings Management',
  cards: 'Card Management',
  cardfusion: 'CardFusion',
  queue: 'Job Queue',
  activity: 'Activity Logs',
  governance: 'Governance',
  admins: 'Admin Management',
  settings: 'Settings',
  complaints: 'Complaints',
}

interface TopBarProps {
  activeSection: string
  onMenu?: () => void
}

export function TopBar({ activeSection, onMenu }: TopBarProps) {
  const { user } = useAuth()

  return (
    <header className="fixed top-0 left-0 lg:left-60 right-0 h-14 bg-white border-b border-slate-100 flex items-center justify-between gap-3 px-4 sm:px-6 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onMenu} className="lg:hidden w-9 h-9 -ml-1.5 flex items-center justify-center rounded-xl hover:bg-slate-100 cursor-pointer" aria-label="Open menu">
          <Menu size={18} className="text-slate-600" />
        </button>
        <h2 className="text-sm font-bold text-slate-800 truncate">{sectionTitles[activeSection] ?? activeSection}</h2>
      </div>
      <div className="flex items-center gap-3">
        <button className="hidden sm:flex text-xs text-slate-400 hover:text-slate-600 font-semibold items-center gap-1.5 cursor-pointer">
          <HelpCircle size={14} />
          Support
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 relative cursor-pointer">
          <Bell size={16} className="text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-100 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
            <span className="text-[10px] font-black text-white">{user?.name?.charAt(0) ?? 'A'}</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-slate-700 leading-none">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{user?.role ?? 'Super Admin'}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
