import { Bell, HelpCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const sectionTitles: Record<string, string> = {
  overview: 'Overview',
  kyc: 'KYC & Compliance',
  retail: 'Retail Banking',
  corporate: 'Corporate Banking',
  oversight: 'Transaction Oversight',
  activity: 'Activity Logs',
  governance: 'Governance',
  admins: 'Admin Management',
  settings: 'Settings',
}

interface TopBarProps {
  activeSection: string
}

export function TopBar({ activeSection }: TopBarProps) {
  const { user } = useAuth()

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 z-30">
      <h2 className="text-sm font-bold text-slate-800">{sectionTitles[activeSection] ?? activeSection}</h2>
      <div className="flex items-center gap-3">
        <button className="text-xs text-slate-400 hover:text-slate-600 font-semibold flex items-center gap-1.5 cursor-pointer">
          <HelpCircle size={14} />
          Support
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 relative cursor-pointer">
          <Bell size={16} className="text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-3 border-l border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
            <span className="text-[10px] font-black text-white">{user?.name?.charAt(0) ?? 'A'}</span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 leading-none">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{user?.role ?? 'Super Admin'}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
