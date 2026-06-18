import { useState } from 'react'
import { DataTable, type ColumnDef } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { getCountries, getStates, getTowns, getSectors } from '../../api'
import type { ReferenceCountry, ReferenceState, ReferenceTown, ReferenceSector, PaginatedData } from '../../api/types'

const TABS = [
  { id: 'countries', label: 'Countries' },
  { id: 'states', label: 'States' },
  { id: 'towns', label: 'Towns' },
  { id: 'sectors', label: 'Sectors' },
] as const

type TabId = typeof TABS[number]['id']

const countryColumns: ColumnDef<ReferenceCountry>[] = [
  { header: 'Code', accessorKey: 'code', cell: (r) => <span className="text-xs font-mono font-bold text-slate-600">{r.code}</span> },
  { header: 'Name', accessorKey: 'name', cell: (r) => <span className="text-sm text-slate-700">{r.name}</span> },
]

const stateColumns: ColumnDef<ReferenceState>[] = [
  { header: 'Code', accessorKey: 'code', cell: (r) => <span className="text-xs font-mono font-bold text-slate-600">{r.code}</span> },
  { header: 'Name', accessorKey: 'name', cell: (r) => <span className="text-sm text-slate-700">{r.name}</span> },
  { header: 'Country', accessorKey: 'countryCode', cell: (r) => <span className="text-xs font-mono text-slate-500">{r.countryCode}</span> },
]

const townColumns: ColumnDef<ReferenceTown>[] = [
  { header: 'Code', accessorKey: 'code', cell: (r) => <span className="text-xs font-mono font-bold text-slate-600">{r.code}</span> },
  { header: 'Name', accessorKey: 'name', cell: (r) => <span className="text-sm text-slate-700">{r.name}</span> },
  { header: 'State', accessorKey: 'stateCode', cell: (r) => <span className="text-xs font-mono text-slate-500">{r.stateCode}</span> },
]

const sectorColumns: ColumnDef<ReferenceSector>[] = [
  { header: 'Code', accessorKey: 'code', cell: (r) => <span className="text-xs font-mono font-bold text-slate-600">{r.code}</span> },
  { header: 'Name', accessorKey: 'name', cell: (r) => <span className="text-sm text-slate-700">{r.name}</span> },
]

function TabContent({ tab }: { tab: TabId }) {
  const countries = useApi<PaginatedData<ReferenceCountry>>(() => getCountries().then(r => r.data), tab === 'countries' ? [] : null)
  const states = useApi<PaginatedData<ReferenceState>>(() => getStates().then(r => r.data), tab === 'states' ? [] : null)
  const towns = useApi<PaginatedData<ReferenceTown>>(() => getTowns().then(r => r.data), tab === 'towns' ? [] : null)
  const sectors = useApi<PaginatedData<ReferenceSector>>(() => getSectors().then(r => r.data), tab === 'sectors' ? [] : null)

  if (tab === 'countries') {
    if (countries.loading) return <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
    if (countries.error) return <div className="py-12 text-center text-sm text-red-500">{countries.error}</div>
    return <DataTable<ReferenceCountry> columns={countryColumns} data={countries.data?.content ?? []} searchPlaceholder="Search countries…" emptyMessage="No countries found." />
  }
  if (tab === 'states') {
    if (states.loading) return <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
    if (states.error) return <div className="py-12 text-center text-sm text-red-500">{states.error}</div>
    return <DataTable<ReferenceState> columns={stateColumns} data={states.data?.content ?? []} searchPlaceholder="Search states…" emptyMessage="No states found." />
  }
  if (tab === 'towns') {
    if (towns.loading) return <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
    if (towns.error) return <div className="py-12 text-center text-sm text-red-500">{towns.error}</div>
    return <DataTable<ReferenceTown> columns={townColumns} data={towns.data?.content ?? []} searchPlaceholder="Search towns…" emptyMessage="No towns found." />
  }
  if (tab === 'sectors') {
    if (sectors.loading) return <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
    if (sectors.error) return <div className="py-12 text-center text-sm text-red-500">{sectors.error}</div>
    return <DataTable<ReferenceSector> columns={sectorColumns} data={sectors.data?.content ?? []} searchPlaceholder="Search sectors…" emptyMessage="No sectors found." />
  }
  return null
}

export function ReferencePage() {
  const [tab, setTab] = useState<TabId>('countries')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">Reference Data</h1>
        <p className="text-sm text-slate-500 mt-0.5">Core banking lookup tables — countries, states, towns, and sectors.</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <TabContent tab={tab} />
    </div>
  )
}
