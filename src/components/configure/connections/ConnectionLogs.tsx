import { useState, useMemo, useRef, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp, Settings, Copy, Download, X, Clock, Tag, Server, User, Hash, FileText, ChevronRight } from 'lucide-react';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { ColumnVisibilityPopover, ColumnDefinition } from '../../common/ColumnVisibilityPopover';
import { useColumnVisibility } from '../../../hooks/useColumnVisibility';

interface Log {
  id: string;
  logId: number;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'system' | 'security' | 'performance' | 'user';
  message: string;
  details?: string;
  source: string;
  user?: string;
  ip?: string;
  duration?: string;
  bytes?: string;
  correlationId?: string;
  rawPayload?: string;
}

interface ConnectionLogsProps {
  connectionId: string | null;
}

const TABLE_ID = 'connection-logs';

const ALL_COLUMNS: ColumnDefinition[] = [
  { id: 'logId', label: 'Log ID' },
  { id: 'timestamp', label: 'Timestamp' },
  { id: 'type', label: 'Type' },
  { id: 'category', label: 'Category' },
  { id: 'message', label: 'Message' },
  { id: 'source', label: 'Source' },
];

const SORTABLE_COLUMNS = ['logId', 'timestamp', 'type', 'category', 'source'];

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'type',
    label: 'Type',
    type: 'toggle',
    options: [
      { value: 'error', label: 'Error', color: 'error' },
      { value: 'warning', label: 'Warning', color: 'warning' },
      { value: 'info', label: 'Info', color: 'info' },
      { value: 'success', label: 'Success', color: 'success' },
    ],
  },
  {
    id: 'category',
    label: 'Category',
    type: 'toggle',
    options: [
      { value: 'system', label: 'System' },
      { value: 'security', label: 'Security' },
      { value: 'performance', label: 'Performance' },
      { value: 'user', label: 'User' },
    ],
  },
];

const logs: Log[] = [
  {
    id: '1', logId: 10001,
    timestamp: '2024-03-10T15:30:00Z',
    type: 'error', category: 'system',
    message: 'Connection timeout detected',
    details: 'Failed to establish connection after 30s. The remote endpoint did not respond within the configured timeout window. Automatic retry initiated.',
    source: 'System Monitor', user: 'system',
    ip: '203.0.113.42', duration: '30.0s', bytes: '0 B',
    correlationId: 'c1a2b3d4-e5f6-7890-abcd-ef1234567890',
    rawPayload: '{"event":"connection_timeout","endpoint":"203.0.113.42:443","timeout_ms":30000,"retry":true,"attempt":1}'
  },
  {
    id: '2', logId: 10002,
    timestamp: '2024-03-10T15:29:00Z',
    type: 'warning', category: 'performance',
    message: 'High latency detected',
    details: 'Latency spike to 150ms — exceeds warning threshold of 100ms. No packet loss observed. BGP session remains stable.',
    source: 'Performance Monitor', user: 'system',
    ip: '203.0.113.42', duration: '—', bytes: '1.2 MB',
    correlationId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    rawPayload: '{"event":"high_latency","latency_ms":150,"threshold_ms":100,"packet_loss":0,"bgp_stable":true}'
  },
  {
    id: '3', logId: 10003,
    timestamp: '2024-03-10T15:28:00Z',
    type: 'success', category: 'system',
    message: 'Connection established',
    details: 'Successfully established BGP session. 4 paths active across 2 sites. Bandwidth: 1 Gbps × 4 paths.',
    source: 'Connection Manager', user: 'system',
    ip: '203.0.113.42', duration: '1.2s', bytes: '4.8 KB',
    correlationId: 'a3b4c5d6-e7f8-9012-cdef-123456789012',
    rawPayload: '{"event":"connection_established","paths":4,"sites":2,"bandwidth_gbps":1,"bgp_asn_local":65001,"bgp_asn_remote":16509}'
  },
  {
    id: '4', logId: 10004,
    timestamp: '2024-03-10T15:27:00Z',
    type: 'info', category: 'security',
    message: 'Security scan completed',
    details: 'Scheduled vulnerability scan completed successfully. No CVEs detected. Certificate expiry: 287 days. MACsec status: enabled.',
    source: 'Security Scanner', user: 'system',
    ip: '—', duration: '4.3s', bytes: '—',
    correlationId: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    rawPayload: '{"event":"security_scan","cve_count":0,"cert_expiry_days":287,"macsec":true,"ddos_protection":true}'
  },
  {
    id: '5', logId: 10005,
    timestamp: '2024-03-10T15:26:00Z',
    type: 'warning', category: 'security',
    message: 'Multiple failed login attempts',
    details: '3 consecutive failed authentication attempts from IP 192.168.1.100. Account temporarily locked after threshold exceeded. Alert sent to admin.',
    source: 'Security Monitor', user: 'system',
    ip: '192.168.1.100', duration: '—', bytes: '—',
    correlationId: 'e5f6a7b8-c9d0-1234-efab-345678901234',
    rawPayload: '{"event":"auth_failure","attempts":3,"threshold":3,"source_ip":"192.168.1.100","action":"account_lock","alert_sent":true}'
  },
  {
    id: '6', logId: 10006,
    timestamp: '2024-03-10T15:25:00Z',
    type: 'info', category: 'user',
    message: 'Configuration updated',
    details: 'BGP route policy updated by Sarah Patel. Changed: route-map OUT prepend AS-path. Previous: no prepend. Change reference: CHG-20240310-001.',
    source: 'Config Manager', user: 'sarah.patel@att.com',
    ip: '10.0.1.55', duration: '0.4s', bytes: '2.1 KB',
    correlationId: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
    rawPayload: '{"event":"config_change","user":"sarah.patel@att.com","field":"bgp_route_policy","change_ref":"CHG-20240310-001","rollback_available":true}'
  },
  {
    id: '7', logId: 10007,
    timestamp: '2024-03-10T15:24:00Z',
    type: 'success', category: 'performance',
    message: 'Bandwidth threshold restored',
    details: 'Bandwidth utilization returned to normal range (28%). Alert auto-resolved. Peak during spike: 94% for 3m 12s.',
    source: 'Performance Monitor', user: 'system',
    ip: '—', duration: '—', bytes: '—',
    correlationId: 'a7b8c9d0-e1f2-3456-abcd-567890123456',
    rawPayload: '{"event":"threshold_restored","metric":"bandwidth_util","current_pct":28,"peak_pct":94,"spike_duration_s":192}'
  },
];

export function ConnectionLogs({ connectionId }: ConnectionLogsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<keyof Log>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const columnButtonRef = useRef<HTMLButtonElement>(null);
  const { isVisible, visibleColumns } = useColumnVisibility(TABLE_ID);
  const drawerRef = useRef<HTMLDivElement>(null);

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({
    groups: FILTER_GROUPS,
  });

  // Close drawer on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedLog(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSort = (field: keyof Log) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredLogs = useMemo(() => {
    const typeFilters = filters.type || [];
    const categoryFilters = filters.category || [];

    return logs
      .filter(log => {
        if (typeFilters.length > 0 && !typeFilters.includes(log.type)) return false;
        if (categoryFilters.length > 0 && !categoryFilters.includes(log.category)) return false;
        if (searchQuery.trim()) {
          const searchTerms = searchQuery.toLowerCase().split(' ');
          const searchableText = [
            log.logId.toString(), log.message, log.details, log.source, log.type, log.category
          ].filter(Boolean).join(' ').toLowerCase();
          return searchTerms.every(term => searchableText.includes(term));
        }
        return true;
      })
      .sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        const modifier = sortDirection === 'asc' ? 1 : -1;
        if (sortField === 'timestamp') return (new Date(aValue as string).getTime() - new Date(bValue as string).getTime()) * modifier;
        if (sortField === 'logId') return (a.logId - b.logId) * modifier;
        return String(aValue).localeCompare(String(bValue)) * modifier;
      });
  }, [searchQuery, filters, sortField, sortDirection]);

  const getTypeIcon = (type: string, size = 'h-4 w-4') => {
    switch (type) {
      case 'error':   return <AlertTriangle className={`${size} text-fw-error`} />;
      case 'warning': return <AlertTriangle className={`${size} text-fw-bodyLight`} />;
      case 'success': return <CheckCircle className={`${size} text-fw-success`} />;
      default:        return <Info className={`${size} text-fw-link`} />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'error':   return 'bg-fw-errorLight text-fw-error';
      case 'warning': return 'bg-fw-neutral text-fw-body';
      case 'success': return 'bg-fw-successLight text-fw-success';
      default:        return 'bg-fw-accent text-fw-link';
    }
  };

  const copyLog = (log: Log) => {
    const text = `[${new Date(log.timestamp).toLocaleString()}] [${log.type.toUpperCase()}] [${log.category}] ${log.message}${log.details ? '\n' + log.details : ''}${log.rawPayload ? '\n\nRaw: ' + log.rawPayload : ''}`;
    navigator.clipboard.writeText(text);
    window.addToast({ type: 'success', title: 'Copied', message: 'Log entry copied to clipboard', duration: 2000 });
  };

  const exportLog = () => {
    window.addToast({ type: 'success', title: 'Exported', message: 'Log entry exported successfully', duration: 2000 });
  };

  if (!connectionId) {
    return <div className="text-center py-12 text-[14px] text-fw-bodyLight">Select a connection to view logs</div>;
  }

  const displayColumns = visibleColumns.length === 0
    ? ALL_COLUMNS
    : ALL_COLUMNS.filter(col => isVisible(col.id));

  const renderCellContent = (log: Log, columnId: string) => {
    switch (columnId) {
      case 'logId':
        return <span className="font-medium text-fw-heading">#{log.logId}</span>;
      case 'timestamp':
        return <span className="tabular-nums">{new Date(log.timestamp).toLocaleString()}</span>;
      case 'type':
        return (
          <div className="flex items-center gap-2">
            {getTypeIcon(log.type)}
            <span className={`px-2 py-0.5 text-[12px] font-medium rounded-md capitalize ${getTypeBadge(log.type)}`}>
              {log.type}
            </span>
          </div>
        );
      case 'category':
        return (
          <span className="px-2 py-0.5 text-[12px] font-medium bg-fw-neutral text-fw-body rounded-md">
            {log.category}
          </span>
        );
      case 'message':
        return (
          <div>
            <div className="text-fw-heading truncate">{log.message}</div>
            {log.details && <div className="mt-0.5 text-[12px] text-fw-bodyLight truncate">{log.details}</div>}
          </div>
        );
      case 'source':
        return <span className="text-fw-bodyLight">{log.source}</span>;
      default:
        return null;
    }
  };

  // Navigate between logs in the drawer
  const currentIdx = selectedLog ? filteredLogs.findIndex(l => l.id === selectedLog.id) : -1;
  const prevLog = currentIdx > 0 ? filteredLogs[currentIdx - 1] : null;
  const nextLog = currentIdx < filteredLogs.length - 1 ? filteredLogs[currentIdx + 1] : null;

  return (
    <div className="relative flex gap-0">
      {/* Table hub — shrinks when drawer is open */}
      <div className={`flex-1 min-w-0 rounded-lg border border-fw-secondary overflow-hidden transition-all duration-300`}>
        <div className="px-6 py-4 border-b border-fw-secondary">
          <SearchFilterBar
            searchPlaceholder="Search logs..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilter={toggle}
            activeFilterCount={activeCount}
            isFilterOpen={isOpen}
            filterPanel={
              <TableFilterPanel
                groups={FILTER_GROUPS}
                activeFilters={filters}
                onFiltersChange={setFilters}
                isOpen={isOpen}
                onToggle={toggle}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            }
            onExport={() => window.addToast?.({ type: 'success', title: 'Logs Exported', message: 'Log data exported successfully', duration: 3000 })}
          />
        </div>

        <table className="w-full table-fixed">
          <thead className="bg-fw-wash border-b border-fw-secondary">
            <tr>
              {displayColumns.map((col) => {
                const isSortable = SORTABLE_COLUMNS.includes(col.id);
                const isSorted = sortField === col.id;
                return (
                  <th key={col.id} scope="col" className="px-6 h-11 text-left text-[13px] font-medium text-fw-heading whitespace-nowrap overflow-hidden text-ellipsis align-middle">
                    {isSortable ? (
                      <button onClick={() => handleSort(col.id as keyof Log)} className="group inline-flex items-center gap-1">
                        <span>{col.label}</span>
                        <span className="flex flex-col">
                          <ChevronUp className={`h-3 w-3 ${isSorted && sortDirection === 'asc' ? 'text-fw-body' : 'text-fw-bodyLight group-hover:text-fw-body'}`} />
                          <ChevronDown className={`h-3 w-3 -mt-1 ${isSorted && sortDirection === 'desc' ? 'text-fw-body' : 'text-fw-bodyLight group-hover:text-fw-body'}`} />
                        </span>
                      </button>
                    ) : col.label}
                  </th>
                );
              })}
              <th scope="col" className="w-12 px-4 h-11 align-middle">
                <div className="flex justify-end">
                  <button
                    ref={columnButtonRef}
                    onClick={() => setShowColumnPopover(!showColumnPopover)}
                    className="p-1.5 text-fw-bodyLight hover:text-fw-body rounded hover:bg-fw-neutral transition-colors"
                    title="Manage Columns"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-fw-base divide-y divide-fw-secondary">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={displayColumns.length + 1} className="px-6 py-8 text-center text-[14px] text-fw-bodyLight">
                  No logs match the current filters
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                  className={`hover:bg-fw-wash transition-colors cursor-pointer ${selectedLog?.id === log.id ? 'bg-fw-accent/50' : ''}`}
                >
                  {displayColumns.map((col) => (
                    <td key={col.id} className="px-6 py-3.5 text-[13px] text-fw-body overflow-hidden">
                      {renderCellContent(log, col.id)}
                    </td>
                  ))}
                  <td className="w-12 px-4 py-3.5">
                    <div className="flex justify-end">
                      <ChevronRight className={`h-4 w-4 transition-colors ${selectedLog?.id === log.id ? 'text-fw-link' : 'text-fw-disabled'}`} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {showColumnPopover && (
          <ColumnVisibilityPopover
            tableId={TABLE_ID}
            allColumns={ALL_COLUMNS}
            onClose={() => setShowColumnPopover(false)}
            anchorEl={columnButtonRef.current}
          />
        )}
      </div>

      {/* Detail drawer — slides in from the right */}
      <div
        ref={drawerRef}
        className={`
          flex-shrink-0 border-l border-fw-secondary bg-fw-base overflow-hidden
          transition-all duration-300 ease-in-out
          ${selectedLog ? 'w-[380px] opacity-100' : 'w-0 opacity-0'}
        `}
      >
        {selectedLog && (
          <div className="w-[380px] h-full flex flex-col">
            {/* Drawer header */}
            <div className="px-5 py-4 border-b border-fw-secondary flex items-start justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {getTypeIcon(selectedLog.type, 'h-4 w-4')}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-figma-xs font-medium text-fw-bodyLight tabular-nums">#{selectedLog.logId}</span>
                    <span className={`px-1.5 py-0.5 text-[11px] font-medium rounded capitalize ${getTypeBadge(selectedLog.type)}`}>
                      {selectedLog.type}
                    </span>
                  </div>
                  <p className="text-figma-sm font-semibold text-fw-heading mt-0.5 leading-snug">{selectedLog.message}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-fw-bodyLight hover:text-fw-body hover:bg-fw-wash rounded transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              {/* Details block */}
              {selectedLog.details && (
                <div className="px-5 py-4 border-b border-fw-secondary">
                  <div className="flex items-center gap-1.5 mb-2">
                    <FileText className="h-3.5 w-3.5 text-fw-bodyLight" />
                    <span className="text-figma-xs font-medium text-fw-bodyLight uppercase tracking-wide">Details</span>
                  </div>
                  <p className="text-figma-sm text-fw-body leading-relaxed">{selectedLog.details}</p>
                </div>
              )}

              {/* Metadata */}
              <div className="px-5 py-4 border-b border-fw-secondary space-y-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Hash className="h-3.5 w-3.5 text-fw-bodyLight" />
                  <span className="text-figma-xs font-medium text-fw-bodyLight uppercase tracking-wide">Metadata</span>
                </div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-figma-sm">
                  <div className="flex items-center gap-1.5 text-fw-bodyLight">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Timestamp</span>
                  </div>
                  <span className="text-fw-heading font-medium tabular-nums">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </span>

                  <div className="flex items-center gap-1.5 text-fw-bodyLight">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Category</span>
                  </div>
                  <span className="text-fw-heading font-medium capitalize">{selectedLog.category}</span>

                  <div className="flex items-center gap-1.5 text-fw-bodyLight">
                    <Server className="h-3.5 w-3.5" />
                    <span>Source</span>
                  </div>
                  <span className="text-fw-heading font-medium">{selectedLog.source}</span>

                  {selectedLog.user && (
                    <>
                      <div className="flex items-center gap-1.5 text-fw-bodyLight">
                        <User className="h-3.5 w-3.5" />
                        <span>User</span>
                      </div>
                      <span className="text-fw-heading font-medium truncate">{selectedLog.user}</span>
                    </>
                  )}

                  {selectedLog.ip && selectedLog.ip !== '—' && (
                    <>
                      <span className="text-fw-bodyLight pl-5">IP</span>
                      <span className="text-fw-heading font-medium font-mono text-[12px]">{selectedLog.ip}</span>
                    </>
                  )}

                  {selectedLog.duration && selectedLog.duration !== '—' && (
                    <>
                      <span className="text-fw-bodyLight pl-5">Duration</span>
                      <span className="text-fw-heading font-medium tabular-nums">{selectedLog.duration}</span>
                    </>
                  )}

                  {selectedLog.bytes && selectedLog.bytes !== '—' && (
                    <>
                      <span className="text-fw-bodyLight pl-5">Bytes</span>
                      <span className="text-fw-heading font-medium tabular-nums">{selectedLog.bytes}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Correlation ID */}
              {selectedLog.correlationId && (
                <div className="px-5 py-3.5 border-b border-fw-secondary">
                  <span className="text-figma-xs text-fw-bodyLight block mb-1">Correlation ID</span>
                  <span className="text-[11px] font-mono text-fw-body break-all">{selectedLog.correlationId}</span>
                </div>
              )}

              {/* Raw payload */}
              {selectedLog.rawPayload && (
                <div className="px-5 py-4 border-b border-fw-secondary">
                  <span className="text-figma-xs font-medium text-fw-bodyLight uppercase tracking-wide block mb-2">Raw Payload</span>
                  <pre className="text-[11px] font-mono text-fw-body bg-fw-wash rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(JSON.parse(selectedLog.rawPayload), null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer: actions + prev/next */}
            <div className="px-5 py-3 border-t border-fw-secondary flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyLog(selectedLog)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-figma-xs font-medium text-fw-body bg-fw-wash hover:bg-fw-neutral border border-fw-secondary rounded-lg transition-colors"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
                <button
                  onClick={exportLog}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-figma-xs font-medium text-fw-body bg-fw-wash hover:bg-fw-neutral border border-fw-secondary rounded-lg transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
              </div>

              {/* Prev / Next navigation */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => prevLog && setSelectedLog(prevLog)}
                  disabled={!prevLog}
                  className="p-1.5 text-fw-bodyLight hover:text-fw-body disabled:opacity-30 disabled:cursor-not-allowed hover:bg-fw-wash rounded transition-colors"
                  title="Previous log"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <span className="text-figma-xs text-fw-bodyLight tabular-nums w-12 text-center">
                  {currentIdx + 1} / {filteredLogs.length}
                </span>
                <button
                  onClick={() => nextLog && setSelectedLog(nextLog)}
                  disabled={!nextLog}
                  className="p-1.5 text-fw-bodyLight hover:text-fw-body disabled:opacity-30 disabled:cursor-not-allowed hover:bg-fw-wash rounded transition-colors"
                  title="Next log"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
