import {
  LayoutDashboard, ShieldCheck, Users, Building2, ArrowLeftRight,
  ScrollText, Scale, Settings, LogOut, ShieldAlert, UserCog
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export type SectionId = 'overview' | 'kyc' | 'retail' | 'corporate' | 'oversight' | 'activity' | 'governance' | 'admins' | 'settings'

export const SECTION_IDS: SectionId[] = [
  'overview', 'kyc', 'retail', 'corporate', 'oversight', 'activity', 'governance', 'admins', 'settings',
]

interface NavItem {
  id: SectionId
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'kyc', label: 'KYC & Compliance', icon: <ShieldCheck size={18} /> },
  { id: 'retail', label: 'Retail Banking', icon: <Users size={18} /> },
  { id: 'corporate', label: 'Corporate Banking', icon: <Building2 size={18} /> },
  { id: 'oversight', label: 'Transaction Oversight', icon: <ArrowLeftRight size={18} /> },
  { id: 'activity', label: 'Activity Logs', icon: <ScrollText size={18} /> },
  { id: 'governance', label: 'Governance', icon: <Scale size={18} /> },
  { id: 'admins', label: 'Admin Management', icon: <UserCog size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
]

interface SidebarProps {
  active: SectionId
}

export function Sidebar({ active }: SidebarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-[#2d3748] flex flex-col z-40">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <ShieldAlert size={16} className="text-white" />
          </div>
          <span className="text-white font-black text-sm">Memphis Bank</span>
        </div>
        <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] ml-11">Super Admin Portal</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(`/${item.id}`)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              active === item.id
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:bg-white/8 hover:text-white/80'
            }`}
          >
            <span className={active === item.id ? 'text-white' : 'text-white/40'}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut size={18} className="text-white/40" />
          Logout
        </button>
      </div>
    </aside>
  )
}
