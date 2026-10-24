import {
  LayoutDashboard, ShieldCheck, Users, Building2, ArrowLeftRight,
  ScrollText, Scale, LogOut, UserCog,
  AlertTriangle, Landmark, PiggyBank, ServerCog, CreditCard, Fingerprint, Settings, ScanFace
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export type SectionId =
  | 'overview' | 'kyc' | 'identity' | 'customers' | 'corporate' | 'oversight'
  | 'compliance' | 'loans' | 'savings' | 'queue' | 'cards' | 'cardfusion'
  | 'complaints' | 'activity' | 'governance' | 'admins' | 'settings'

// eslint-disable-next-line react-refresh/only-export-components
export const SECTION_IDS: SectionId[] = [
  'overview', 'kyc', 'identity', 'customers', 'corporate', 'oversight',
  'compliance', 'loans', 'savings', 'queue', 'cards', 'cardfusion',
  'complaints', 'activity', 'governance', 'admins', 'settings',
]

interface NavItem {
  id: SectionId
  label: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
  { id: 'kyc', label: 'KYC & Compliance', icon: <ShieldCheck size={18} /> },
  { id: 'identity', label: 'Identity Verification', icon: <ScanFace size={18} /> },
  { id: 'customers', label: 'Customers', icon: <Users size={18} /> },
  { id: 'corporate', label: 'Corporate Banking', icon: <Building2 size={18} /> },
  { id: 'oversight', label: 'Transaction Oversight', icon: <ArrowLeftRight size={18} /> },
  { id: 'compliance', label: 'Compliance Flags', icon: <AlertTriangle size={18} /> },
  { id: 'loans', label: 'Loan Management', icon: <Landmark size={18} /> },
  { id: 'savings', label: 'Savings Management', icon: <PiggyBank size={18} /> },
  { id: 'cards', label: 'Card Management', icon: <CreditCard size={18} /> },
  { id: 'cardfusion', label: 'CardFusion', icon: <Fingerprint size={18} /> },
  { id: 'queue', label: 'Job Queue', icon: <ServerCog size={18} /> },
  // { id: 'reference', label: 'Reference Data', icon: <Database size={18} /> },
  { id: 'complaints', label: 'Complaints', icon: <ScrollText size={18} /> },
  { id: 'activity', label: 'Activity Logs', icon: <ScrollText size={18} /> },
  { id: 'governance', label: 'Governance', icon: <Scale size={18} /> },
  { id: 'admins', label: 'Admin Management', icon: <UserCog size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
]

interface SidebarProps {
  active: SectionId
  /** Below the lg breakpoint the sidebar is a drawer; on desktop it is always shown. */
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ active, open = false, onClose }: SidebarProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  return (
    <>
    {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden="true" />}
    <aside className={`fixed left-0 top-0 h-full w-60 bg-[#242a37] flex flex-col z-50 lg:z-40 transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center mb-1">
          <img src="/user-logo.png" alt="Logo" className="h-8 object-contain" />
        </div>
        <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mt-2">Super Admin Portal</p>
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
    </>
  )
}
