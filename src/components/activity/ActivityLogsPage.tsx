import { useState } from 'react'
import { Download, Flag, AlertTriangle, Loader2 } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DataTable } from '../ui/DataTable'
import { useApi } from '../../hooks/useApi'
import { getAuditLogs } from '../../api'
import type { AuditLogEntry } from '../../api/types'
import moment from 'moment'

function severityVariant(eventType: string): 'blue' | 'amber' | 'red' {
  if (eventType.includes('FAILED') || eventType.includes('ERROR')) return 'red'
  if (eventType.includes('SENT') || eventType.includes('REFRESHED')) return 'amber'
  return 'blue'
}

export function ActivityLogsPage() {
  const [selected, setSelected] = useState<AuditLogEntry | null>(null)

  const { data, loading, error, refetch } = useApi(
    () => getAuditLogs({ size: 100 }).then(r => r.data),
    [],
  )

  const logs = data?.content ?? []

  return (
    <>
      <div className="space-y-5">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-700">Regulatory Compliance Notice</p>
            <p className="text-xs text-amber-600 mt-0.5">All activity logs are retained for 7 years in compliance with CBN directive on electronic records preservation.</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">RETAIL NETWORK SYSTEM MONITORING</h3>
            <p className="text-sm text-slate-400 mt-0.5">All admin and system actions are recorded here.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={refetch}><Download size={13} /> Refresh</Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-sm text-red-500 mb-3">{error}</p>
            <button onClick={refetch} className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer">Retry</button>
          </div>
        )}

        {!loading && !error && (
          <DataTable 
            columns={[
              {
                header: 'Customer / Actor',
                accessorKey: 'customerId',
                cell: (log) => (
                  <>
                    <p className="text-xs font-semibold text-slate-700 max-w-[150px] truncate" title={log.customerId}>{log.customerId ?? 'System'}</p>
                    <p className="text-[10px] text-slate-400">Customer ID</p>
                  </>
                )
              },
              {
                header: 'Event Type',
                accessorKey: 'eventType',
                cell: (log) => <span className="font-mono text-slate-600 max-w-[180px] truncate">{log.eventType}</span>
              },
              {
                header: 'Description',
                accessorKey: 'description',
                cell: (log) => <span className="text-slate-500 max-w-[200px] truncate" title={log.description}>{log.description}</span>
              },
              {
                header: 'Account Number',
                accessorKey: 'accountNumber',
                cell: (log) => <span className="font-mono text-slate-400">{log.accountNumber ?? '—'}</span>
              },
              {
                header: 'Timestamp',
                accessorKey: 'createdAt',
                cell: (log) => <span className="text-slate-400">{log.createdAt ? moment(log.createdAt).fromNow() : ''}</span>
              },
              {
                header: 'Severity',
                accessorKey: 'eventType',
                cell: (log) => <Badge label={log.eventType.includes('FAILED') ? 'Critical' : 'Info'} variant={severityVariant(log.eventType)} />
              },
              {
                header: '',
                sortable: false,
                cell: () => (
                  <button
                    className="text-slate-300 hover:text-amber-500 cursor-pointer"
                    onClick={e => { e.stopPropagation(); /* modal logic can just use row click */ }}
                    title="Flag for revision"
                  >
                    <Flag size={14} />
                  </button>
                )
              }
            ]}
            data={logs}
            searchFields={['customerId', 'eventType', 'description', 'accountNumber']}
            onRowClick={setSelected}
            emptyMessage="No audit log entries found."
          />
        )}
      </div>

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Audit Event Dispatched">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Customer ID',        value: selected.customerId ?? 'System' },
                { label: 'Event Type',         value: selected.eventType },
                { label: 'Description',        value: selected.description },
                { label: 'Account Number',     value: selected.accountNumber ?? '—' },
                { label: 'Device ID',          value: selected.deviceId ?? '—' },
                { label: 'IP Address',         value: selected.ipAddress ?? '—' },
                { label: 'Timestamp',          value: selected.createdAt },
                { label: 'Severity',           value: selected.eventType.includes('FAILED') ? 'Critical' : 'Info' },
              ].map(r => (
                <div key={r.label}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.label}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{r.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Event Lifecycle</p>
              <div className="flex items-center gap-2">
                {['Received', 'Validated', 'Executed', 'Logged'].map((step, i, arr) => (
                  <>
                    <div key={step} className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <span className="text-white text-[8px] font-black">✓</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{step}</span>
                    </div>
                    {i < arr.length - 1 && <span key={`a-${i}`} className="text-slate-300">→</span>}
                  </>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>
                <Flag size={13} /> Flag for Revision
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>
                <Download size={13} /> Export JSON
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
