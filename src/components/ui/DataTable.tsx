import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'

export type ColumnDef<T> = {
  header: string
  accessorKey?: keyof T
  cell?: (item: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  searchable?: boolean
  searchPlaceholder?: string
  searchFields?: (keyof T)[]
  onRowClick?: (item: T) => void
  pageSize?: number
  emptyMessage?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchFields = [],
  onRowClick,
  pageSize = 10,
  emptyMessage = 'No results found.',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: keyof T; direction: 'asc' | 'desc' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const handleSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const filteredData = useMemo(() => {
    if (!searchTerm) return data

    const lowerSearch = searchTerm.toLowerCase()
    return data.filter(item => {
      // If searchFields are specified, only search those, else search all string/number fields
      const keysToSearch = searchFields.length > 0 ? searchFields : Object.keys(item) as (keyof T)[]
      
      return keysToSearch.some(key => {
        const val = item[key]
        if (val === null || val === undefined) return false
        return String(val).toLowerCase().includes(lowerSearch)
      })
    })
  }, [data, searchTerm, searchFields])

  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]
      
      if (aVal === null || aVal === undefined) return sortConfig.direction === 'asc' ? -1 : 1
      if (bVal === null || bVal === undefined) return sortConfig.direction === 'asc' ? 1 : -1

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortConfig])

  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  // Reset to page 1 if data or search changes
  useMemo(() => setCurrentPage(1), [searchTerm, sortConfig])

  return (
    <div className="flex flex-col space-y-4">
      {searchable && (
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/30">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${col.sortable !== false && col.accessorKey ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  onClick={() => {
                    if (col.sortable !== false && col.accessorKey) {
                      handleSort(col.accessorKey)
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable !== false && col.accessorKey && sortConfig?.key === col.accessorKey && (
                      sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((item, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 text-xs">
                      {col.cell ? col.cell(item) : (col.accessorKey ? (item[col.accessorKey] as React.ReactNode) : null)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} entries
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
