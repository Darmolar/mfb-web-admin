import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${padding ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  )
}
