import { useEffect, useRef, useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { Link } from 'react-router-dom'
import { Bell, Check, ChevronRight, Clock, Copy, HelpCircle, LifeBuoy, LogOut, Mail, Menu, MessageSquareWarning, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { badgeCount, buildInbox } from '../../api/inbox'
import { INBOX_SOURCES } from './inboxSources'

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

const INBOX_REFRESH_MS = 120_000
const SUPPORT_EMAIL = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined)?.trim() || ''


const roleLabel = (role?: string) => (role ? role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : 'Admin')

/** Seconds since epoch when the access token expires, read from its payload; null if unreadable. */
function tokenExpiry(token?: string): number | null {
  try {
    const part = token?.split('.')[1]
    if (!part) return null
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')))
    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

/** Open/close state for a header dropdown: closes on outside click and Escape. */
function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return { open, setOpen, ref, close: () => setOpen(false) }
}

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    // Phones: pinned under the header across the screen; larger screens: dropped from the button.
    <div className={`fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl z-40 overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

interface TopBarProps {
  activeSection: string
  onMenu?: () => void
}

export function TopBar({ activeSection, onMenu }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 lg:left-60 right-0 h-14 bg-white border-b border-slate-100 flex items-center justify-between gap-3 px-4 sm:px-6 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onMenu} className="lg:hidden w-9 h-9 -ml-1.5 flex items-center justify-center rounded-xl hover:bg-slate-100 cursor-pointer" aria-label="Open menu">
          <Menu size={18} className="text-slate-600" />
        </button>
        <h2 className="text-sm font-bold text-slate-800 truncate">{sectionTitles[activeSection] ?? activeSection}</h2>
      </div>
      <div className="flex items-center gap-1 sm:gap-3">
        <SupportMenu />
        <NotificationsMenu />
        <ProfileMenu />
      </div>
    </header>
  )
}

function NotificationsMenu() {
  const { open, setOpen, ref, close } = useDropdown()
  const { data: inbox, loading, refetch: load } = useApi(() => buildInbox(INBOX_SOURCES), [])

  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load() }, INBOX_REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const total = inbox?.total ?? 0
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) void load() }}
        className={`w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 relative cursor-pointer ${open ? 'bg-slate-100' : ''}`}
        aria-label={total ? `Notifications: ${total} items waiting` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={16} className="text-slate-500" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
            {badgeCount(total)}
          </span>
        )}
      </button>
      {open && (
        <Panel className="sm:w-[22rem]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-800">Waiting for action</p>
              <p className="text-[11px] text-slate-400">{!inbox ? 'Checking…' : total ? `${total} item${total === 1 ? '' : 's'} across the bank` : 'Everything is up to date'}</p>
            </div>
            <button onClick={() => void load()} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer" aria-label="Refresh notifications">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          {!inbox && loading && (
            <div className="p-4 space-y-3" aria-busy="true">
              {[0, 1, 2].map(i => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          )}
          {inbox && inbox.items.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Check size={22} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Nothing waiting</p>
              <p className="text-xs text-slate-400">No reviews, approvals or complaints need you right now.</p>
            </div>
          )}
          {inbox && inbox.items.length > 0 && (
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {inbox.items.map(item => (
                <li key={item.key}>
                  <Link to={item.to} onClick={close} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    <span className="min-w-[2rem] h-8 px-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-black flex items-center justify-center">{badgeCount(item.count)}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-slate-700">{item.label}</span>
                      <span className="block text-[11px] text-slate-400 truncate">{item.hint}</span>
                    </span>
                    <ChevronRight size={14} className="text-slate-300 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {inbox && inbox.failed.length > 0 && (
            <p className="px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-400">
              Couldn't check: {inbox.failed.join(', ').toLowerCase()} (no access or the service didn't respond).
            </p>
          )}
        </Panel>
      )}
    </div>
  )
}

function SupportMenu() {
  const { user } = useAuth()
  const { open, setOpen, ref, close } = useDropdown()
  const [copied, setCopied] = useState(false)

  // What IT needs to reproduce a problem; no tokens or customer data.
  const diagnostics = () => [
    `Page: ${window.location.pathname}${window.location.search}`,
    `Time: ${new Date().toString()}`,
    `Admin: ${user?.email ?? '—'} (${user?.role ?? '—'})`,
    `Admin ID: ${user?.adminId ?? '—'}`,
    `Browser: ${navigator.userAgent}`,
    `Screen: ${window.innerWidth}×${window.innerHeight}`,
  ].join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(diagnostics())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const mailto = SUPPORT_EMAIL
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Admin portal problem')}&body=${encodeURIComponent(`What happened:\n\n\nWhat I expected:\n\n\n---\n${diagnostics()}`)}`
    : ''

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`h-9 px-2 sm:px-2.5 flex text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl font-semibold items-center gap-1.5 cursor-pointer ${open ? 'bg-slate-100 text-slate-700' : ''}`}
        aria-expanded={open}
        aria-label="Support"
      >
        <HelpCircle size={15} />
        <span className="hidden sm:inline">Support</span>
      </button>
      {open && (
        <Panel className="sm:w-80">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-2"><LifeBuoy size={15} /> Need help?</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Report a problem with the admin portal, or go to customer complaints.</p>
          </div>
          <div className="p-2 space-y-1">
            {mailto && (
              <a href={mailto} onClick={close} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50">
                <Mail size={16} className="text-slate-500 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-700">Email IT support</span>
                  <span className="block text-[11px] text-slate-400 truncate">{SUPPORT_EMAIL}, details of this page included</span>
                </span>
              </a>
            )}
            <button onClick={() => void copy()} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 cursor-pointer">
              {copied ? <Check size={16} className="text-emerald-600 shrink-0" /> : <Copy size={16} className="text-slate-500 shrink-0" />}
              <span>
                <span className="block text-sm font-semibold text-slate-700">{copied ? 'Copied' : 'Copy problem details'}</span>
                <span className="block text-[11px] text-slate-400">Page, time, your account and browser, to paste into a report</span>
              </span>
            </button>
            <Link to="/complaints" onClick={close} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50">
              <MessageSquareWarning size={16} className="text-slate-500 shrink-0" />
              <span>
                <span className="block text-sm font-semibold text-slate-700">Customer complaints</span>
                <span className="block text-[11px] text-slate-400">Support requests raised by customers</span>
              </span>
            </Link>
          </div>
        </Panel>
      )}
    </div>
  )
}

function ProfileMenu() {
  const { user, logout } = useAuth()
  const { open, setOpen, ref } = useDropdown()
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const exp = tokenExpiry(user?.accessToken)

  // Tick while open so the session countdown stays current.
  useEffect(() => {
    if (!open) return
    const t = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(t)
  }, [open])

  const minsLeft = exp ? Math.max(0, Math.round((exp * 1000 - now) / 60_000)) : null

  async function copyId() {
    if (!user?.adminId) return
    try {
      await navigator.clipboard.writeText(user.adminId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div ref={ref} className="relative pl-1 sm:pl-3 sm:border-l border-slate-100">
      <button
        onClick={() => { setNow(Date.now()); setOpen(o => !o) }}
        className={`flex items-center gap-2 rounded-xl p-1 sm:pr-2 hover:bg-slate-100 cursor-pointer ${open ? 'bg-slate-100' : ''}`}
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-[10px] font-black text-white">{user?.name?.charAt(0) ?? 'A'}</span>
        <span className="hidden sm:block text-left">
          <span className="block text-xs font-bold text-slate-700 leading-none">{user?.name ?? 'Admin'}</span>
          <span className="block text-[10px] text-slate-400 mt-0.5">{roleLabel(user?.role)}</span>
        </span>
      </button>
      {open && (
        <Panel className="sm:w-72">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-sm font-black text-white shrink-0">{user?.name?.charAt(0) ?? 'A'}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{user?.name ?? 'Admin'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{roleLabel(user?.role)}</span>
            </div>
          </div>
          <dl className="px-4 py-3 space-y-2 text-xs border-b border-slate-100">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Admin ID</dt>
              <dd className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-slate-600 truncate">{user?.adminId.slice(0, 8)}…</span>
                <button onClick={() => void copyId()} className="text-slate-400 hover:text-slate-700 cursor-pointer" aria-label="Copy admin ID" title="Copy admin ID">
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              </dd>
            </div>
            {minsLeft !== null && (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-400 flex items-center gap-1"><Clock size={11} /> Session</dt>
                <dd className={minsLeft <= 3 ? 'text-amber-700 font-semibold' : 'text-slate-600'}>
                  {minsLeft === 0 ? 'Ending now' : `Ends in ${minsLeft} min`} ({new Date(exp! * 1000).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })})
                </dd>
              </div>
            )}
          </dl>
          <div className="p-2">
            <button onClick={logout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer">
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </Panel>
      )}
    </div>
  )
}
