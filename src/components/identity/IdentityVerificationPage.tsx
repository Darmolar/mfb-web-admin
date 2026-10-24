import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, ImageOff, RefreshCw, UserRound } from 'lucide-react'
import moment from 'moment'
import { getIdentityVerifications } from '../../api'
import {
  IDENTITY_TYPES, IDENTITY_TYPE_LABELS, identitySearchParams, maskIdNumber, readIdentityRecords, type IdentityRecord,
} from '../../api/identityVerification'
import { useApi } from '../../hooks/useApi'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { SearchInput } from '../ui/SearchInput'

const PAGE_SIZE = 50

export function IdentityVerificationPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [idType, setIdType] = useState('')
  const [page, setPage] = useState(0)

  // Search runs on the server so it covers every stored record, not just the loaded page.
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(0) }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, loading, error, refetch } = useApi(
    async () => readIdentityRecords((await getIdentityVerifications({ ...identitySearchParams(query), idType, page, size: PAGE_SIZE })).data),
    [query, idType, page],
  )

  const records = data?.records ?? []
  const total = data?.total ?? 0
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)

  const columns: ColumnDef<IdentityRecord>[] = [
    {
      header: 'Name',
      accessorKey: 'fullName',
      cell: r => <span className="text-sm font-semibold text-slate-700">{r.fullName}</span>,
    },
    {
      header: 'Identity Number',
      accessorKey: 'idNumber',
      cell: r => <span className="text-xs font-mono font-bold text-slate-600">{maskIdNumber(r.idNumber) || '—'}</span>,
    },
    {
      header: 'Identity Type',
      accessorKey: 'idType',
      cell: r => <Badge label={IDENTITY_TYPE_LABELS[r.idType] ?? r.idType ?? '—'} variant="blue" />,
    },
    {
      header: 'Customer ID',
      accessorKey: 'customerId',
      cell: r => r.customerId
        ? <span className="text-[11px] font-mono text-slate-500">{r.customerId}</span>
        : <span className="text-xs text-slate-300">Not linked</span>,
    },
    {
      header: 'Photo',
      accessorKey: 'hasImage',
      cell: r => r.hasImage
        ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><UserRound size={13} /> On file</span>
        : <span className="inline-flex items-center gap-1 text-xs text-slate-400"><ImageOff size={13} /> None</span>,
    },
    {
      header: 'Verified',
      accessorKey: 'verifiedAt',
      cell: r => <span className="text-xs text-slate-400">{r.verifiedAt ? moment(r.verifiedAt).format('DD MMM YYYY') : '—'}</span>,
    },
    {
      header: 'Actions',
      sortable: false,
      cell: r => (
        <Button size="sm" variant="secondary" onClick={() => navigate(`/identity/${encodeURIComponent(r.id)}`)}>
          <Eye size={13} /> View
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-600">Verified Identities</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Every BVN and NIN verification stored on the platform, for compliance review and investigations.
          </p>
        </div>
        <button onClick={refetch} className="text-slate-300 hover:text-slate-500 cursor-pointer" title="Refresh">
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or BVN/NIN number…" />
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {['', ...IDENTITY_TYPES].map(t => (
            <button
              key={t || 'ALL'}
              onClick={() => { setIdType(t); setPage(0) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                idType === t ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t ? IDENTITY_TYPE_LABELS[t] : 'All types'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-6 py-10 text-center">
          <p className="text-xs text-red-500 mb-3">{error}</p>
          <Button size="sm" variant="secondary" onClick={refetch}>Retry</Button>
        </div>
      )}

      {!error && (
        <>
          <DataTable<IdentityRecord>
            columns={columns}
            data={records}
            loading={loading}
            searchable={false}
            pageSize={PAGE_SIZE}
            emptyMessage={query || idType ? 'No identity records match these filters.' : 'No identity records stored yet.'}
          />
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-end gap-3 text-xs text-slate-500">
              <span>Page {page + 1} of {lastPage + 1} · {total.toLocaleString()} records</span>
              <Button size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
