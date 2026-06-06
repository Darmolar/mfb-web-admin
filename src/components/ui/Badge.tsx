/* eslint-disable react-refresh/only-export-components */
interface BadgeProps {
  label: string
  variant?: 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple' | 'slate'
  size?: 'sm' | 'md'
}

const variantClasses: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
  purple: 'bg-purple-100 text-purple-700',
  slate: 'bg-slate-100 text-slate-600',
}

export function Badge({ label, variant = 'gray', size = 'sm' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'} ${variantClasses[variant]}`}>
      {label}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'purple' | 'slate'> = {
    Verified: 'green', Active: 'green', Completed: 'green', Approved: 'green', Success: 'green',
    Pending: 'amber', 'Pending Review': 'amber', 'Pending Approval': 'amber',
    Flagged: 'red', Suspended: 'red', Failed: 'red', Rejected: 'red', Suspicious: 'red',
    Locked: 'red', Reversed: 'purple',
    Unverified: 'gray', Missing: 'gray', Low: 'green', Medium: 'amber', High: 'red',
    'Tier 1': 'slate', 'Tier 2': 'blue', 'Tier 3': 'purple',
  }
  return map[status] ?? 'gray'
}
