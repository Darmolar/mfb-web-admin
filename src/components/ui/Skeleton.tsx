import type { ReactNode } from 'react'

// Placeholder shapes shown while content loads. They mirror the layout that will appear, so the page
// doesn't jump when data arrives. Pulsing respects reduced-motion; screen readers hear "Loading…" once.

const pulse = 'motion-safe:animate-pulse bg-slate-200/70'

export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block rounded-md ${pulse} ${className}`} />
}

/** Wraps placeholder content so assistive tech announces a single busy region. */
export function LoadingRegion({ label = 'Loading…', className = '', children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

const WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-2/5', 'w-3/5']
const widthFor = (i: number) => WIDTHS[i % WIDTHS.length]

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-2/5' : widthFor(i)}`} />)}
    </div>
  )
}

/** Table body rows for an existing <table>; the real header stays visible. */
export function SkeletonTableRows({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true" className="border-b border-slate-50">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c} className="px-6 py-4">
              {c === 0
                ? <div className="space-y-1.5"><Skeleton className={`h-3 ${widthFor(r + 2)}`} /><Skeleton className="h-2.5 w-1/3" /></div>
                : <Skeleton className={`h-3 ${widthFor(r + c)}`} />}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** A whole table card: optional header labels, then placeholder rows. */
export function TableSkeleton({ columns = 5, rows = 6, headers, search = false, className = '' }: {
  columns?: number; rows?: number; headers?: string[]; search?: boolean; className?: string
}) {
  const cols = headers?.length ?? columns
  return (
    <LoadingRegion className={`space-y-4 ${className}`}>
      {search && <Skeleton className="h-9 w-full max-w-sm rounded-lg" />}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/30">
              {Array.from({ length: cols }, (_, i) => (
                <th key={i} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {headers ? headers[i] : <Skeleton className="h-2.5 w-16" />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody><SkeletonTableRows columns={cols} rows={rows} /></tbody>
        </table>
      </div>
    </LoadingRegion>
  )
}

/** A row of summary/stat tiles. Pass the same grid classes the real tiles use. */
export function StatCardsSkeleton({ count = 4, className = 'grid grid-cols-2 lg:grid-cols-4 gap-4' }: { count?: number; className?: string }) {
  return (
    <LoadingRegion className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-2.5 w-28" />
        </div>
      ))}
    </LoadingRegion>
  )
}

/** A white card with a title bar and some body lines (charts, panels, settings sections). */
export function CardSkeleton({ lines = 4, chart = false, className = '' }: { lines?: number; chart?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-5 ${className}`}>
      <div className="space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-2.5 w-56" /></div>
      {chart
        ? (
          <div className="h-48 flex items-end gap-1.5">
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} className={`flex-1 rounded-t ${pulse}`} style={{ height: `${25 + ((i * 37) % 70)}%` }} />
            ))}
          </div>
        )
        : <SkeletonText lines={lines} />}
    </div>
  )
}

/** Rows with an optional leading avatar/icon: activity feeds, request lists, job lists. */
export function ListSkeleton({ rows = 5, avatar = true, action = false, className = '' }: { rows?: number; avatar?: boolean; action?: boolean; className?: string }) {
  return (
    <LoadingRegion className={`divide-y divide-slate-100 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3.5">
          {avatar && <Skeleton className="w-9 h-9 rounded-xl shrink-0" />}
          <div className="flex-1 space-y-2"><Skeleton className={`h-3 ${widthFor(i)}`} /><Skeleton className="h-2.5 w-1/3" /></div>
          {action && <Skeleton className="h-8 w-20 rounded-lg shrink-0" />}
        </div>
      ))}
    </LoadingRegion>
  )
}

/** Profile/detail page: header with avatar, then label/value pairs. */
export function DetailSkeleton({ fields = 8, image = false, className = '' }: { fields?: number; image?: boolean; className?: string }) {
  return (
    <LoadingRegion className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col md:flex-row gap-6">
        {image && <Skeleton className="w-48 h-56 rounded-xl shrink-0 mx-auto md:mx-0" />}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-3">
            {!image && <Skeleton className="w-12 h-12 rounded-2xl" />}
            <div className="space-y-2 flex-1"><Skeleton className="h-4 w-48" /><Skeleton className="h-2.5 w-32" /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {Array.from({ length: fields }, (_, i) => (
              <div key={i} className="space-y-1.5"><Skeleton className="h-2.5 w-20" /><Skeleton className={`h-3.5 ${widthFor(i)}`} /></div>
            ))}
          </div>
        </div>
      </div>
    </LoadingRegion>
  )
}

/** Settings/forms: label + input pairs in a grid. */
export function FormSkeleton({ fields = 4, columns = 2, className = '' }: { fields?: number; columns?: 1 | 2 | 3 | 4; className?: string }) {
  const grid = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[columns]
  return (
    <LoadingRegion className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-5 ${className}`}>
      <div className="space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-2.5 w-64" /></div>
      <div className={`grid grid-cols-1 ${grid} gap-4`}>
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-1.5"><Skeleton className="h-2.5 w-24" /><Skeleton className="h-9 w-full rounded-lg" /></div>
        ))}
      </div>
    </LoadingRegion>
  )
}
