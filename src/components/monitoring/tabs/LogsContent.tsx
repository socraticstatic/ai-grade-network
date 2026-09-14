import { useState, useRef, useEffect } from 'react';
import { Activity, Shield, Settings, Globe, Calendar, Copy, Download, ChevronUp, ChevronDown, ChevronRight, X, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { ColumnVisibilityPopover, ColumnDefinition } from '../../common/ColumnVisibilityPopover';
import { useColumnVisibility } from '../../../hooks/useColumnVisibility';

interface LogsContentProps {
  selectedConnection: string;
  connections: any[];
}

const TABLE_ID = 'monitor-logs';

const ALL_COLUMNS: ColumnDefinition[] = [
  { id: 'time', label: 'Time' },
  { id: 'type', label: 'Type' },
  { id: 'severity', label: 'Severity' },
  { id: 'message', label: 'Message' },
  { id: 'source', label: 'Source' },
  { id: 'user', label: 'User' },
];

const SORTABLE_COLUMNS = ['time', 'type', 'severity', 'source', 'user'];

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'type',
    label: 'Log Types',
    type: 'checkbox',
    options: [
      { value: 'system', label: 'System' },
      { value: 'security', label: 'Security' },
      { value: 'user', label: 'User' },
      { value: 'performance', label: 'Performance' },
    ],
  },
  {
    id: 'severity',
    label: 'Severity',
    type: 'checkbox',
    options: [
      { value: 'info', label: 'Info', color: 'info' },
      { value: 'warning', label: 'Warning', color: 'warning' },
      { value: 'error', label: 'Error', color: 'error' },
    ],
  },
  {
    id: 'timeRange',
    label: 'Time Range',
    type: 'select',
    options: [
      { value: '1h', label: 'Last Hour' },
      { value: '6h', label: 'Last 6 Hours' },
      { value: '24h', label: 'Last 24 Hours' },
      { value: '7d', label: 'Last 7 Days' },
      { value: '30d', label: 'Last 30 Days' },
    ],
  },
];

// Full log type with enriched fields
interface Log {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  message: string;
  source: string;
  user: string;
  connectionId: string;
  metadata: Record<string, any>;
  details?: string;
  correlationId?: string;
  rawPayload?: Record<string, any>;
}

function LogsContent({ selectedConnection, connections }: LogsContentProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('time');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const columnButtonRef = useRef<HTMLButtonElement>(null);
  const { isVisible, visibleColumns } = useColumnVisibility(TABLE_ID);

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({
    groups: FILTER_GROUPS,
    initialFilters: { timeRange: ['24h'] },
  });

  // Escape key closes drawer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedLog(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const displayColumns = visibleColumns.length === 0
    ? ALL_COLUMNS
    : ALL_COLUMNS.filter(col => isVisible(col.id));

  // Sample log data — enriched with details, correlationId, rawPayload
  const logs: Log[] = [
    {
      id: '1',
      timestamp: '2024-03-11 15:30',
      type: 'system',
      severity: 'info',
      message: 'Connection status updated to Active',
      source: 'Connection Manager',
      user: 'system',
      connectionId: 'conn-1',
      metadata: {
        status: 'Active',
        previousStatus: 'Inactive'
      },
      details: 'The connection transitioned from Inactive to Active following successful BGP session establishment and route propagation confirmation.',
      correlationId: 'COR-20240311-0001',
      rawPayload: {
        event: 'connection.status.changed',
        connectionId: 'conn-1',
        from: 'Inactive',
        to: 'Active',
        triggeredBy: 'bgp-established',
        ts: '2024-03-11T15:30:00.000Z'
      }
    },
    {
      id: '2',
      timestamp: '2024-03-11 15:25',
      type: 'security',
      severity: 'warning',
      message: 'Multiple failed authentication attempts detected',
      source: 'Security Monitor',
      user: 'system',
      connectionId: 'conn-2',
      metadata: {
        attempts: 3,
        ipAddress: '192.168.1.100'
      },
      details: 'Three consecutive authentication failures were recorded from the same IP address within a 60-second window. The account has been temporarily rate-limited.',
      correlationId: 'COR-20240311-0002',
      rawPayload: {
        event: 'auth.failure.threshold',
        connectionId: 'conn-2',
        attemptCount: 3,
        windowSeconds: 60,
        sourceIp: '192.168.1.100',
        action: 'rate-limit-applied',
        ts: '2024-03-11T15:25:00.000Z'
      }
    },
    {
      id: '3',
      timestamp: '2024-03-11 15:15',
      type: 'user',
      severity: 'info',
      message: 'Modified connection bandwidth settings',
      source: 'User Action',
      user: 'sarah.patel@example.com',
      connectionId: 'conn-1',
      metadata: {
        oldValue: '1 Gbps',
        newValue: '10 Gbps'
      },
      details: 'User submitted a bandwidth upgrade request via the self-service portal. Change was applied immediately after provisioning validation.',
      correlationId: 'COR-20240311-0003',
      rawPayload: {
        event: 'connection.bandwidth.updated',
        connectionId: 'conn-1',
        previousBandwidth: '1 Gbps',
        newBandwidth: '10 Gbps',
        initiatedBy: 'sarah.patel@example.com',
        approvalRequired: false,
        ts: '2024-03-11T15:15:00.000Z'
      }
    },
    {
      id: '4',
      timestamp: '2024-03-11 15:00',
      type: 'performance',
      severity: 'error',
      message: 'High latency detected on connection',
      source: 'Performance Monitor',
      user: 'system',
      connectionId: 'conn-3',
      metadata: {
        latency: '150ms',
        threshold: '100ms'
      },
      details: 'Sustained latency of 150ms was observed over a 5-minute rolling window, exceeding the configured SLA threshold of 100ms. An alert has been dispatched to the on-call engineer.',
      correlationId: 'COR-20240311-0004',
      rawPayload: {
        event: 'performance.latency.threshold_exceeded',
        connectionId: 'conn-3',
        observedLatencyMs: 150,
        thresholdMs: 100,
        windowMinutes: 5,
        alertDispatched: true,
        ts: '2024-03-11T15:00:00.000Z'
      }
    },
    // LMCC-specific log entries
    {
      id: 'lmcc-1',
      timestamp: '2026-07-01 14:00',
      type: 'system',
      severity: 'info',
      message: 'AWS Max provisioning initiated - 4 hosted connections across MX304-SV1-A, MX304-SV1-B, MX304-SV5-A, MX304-SV5-B',
      source: 'AWS Max Orchestrator',
      user: 'system',
      connectionId: 'conn-lmcc-1',
      metadata: { metro: 'San Jose, CA', paths: 4 },
      details: 'AI-grade network provisioning workflow started. Four AWS Interconnect – last mile connections are being configured across two colocation PoPs in San Jose, CA, providing full path redundancy.',
      correlationId: 'COR-20260701-LMCC-001',
      rawPayload: {
        event: 'provisioning.aws_max.initiated',
        connectionId: 'conn-lmcc-1',
        metro: 'San Jose, CA',
        ipes: ['MX304-SV1-A', 'MX304-SV1-B', 'MX304-SV5-A', 'MX304-SV5-B'],
        pathCount: 4,
        ts: '2026-07-01T14:00:00.000Z'
      }
    },
    {
      id: 'lmcc-2',
      timestamp: '2026-07-01 14:05',
      type: 'system',
      severity: 'info',
      message: 'AWS hosted connection dxcon-abc001 accepted by customer in AWS Console',
      source: 'AWS Partner API',
      user: 'customer@company.com',
      connectionId: 'conn-lmcc-1',
      metadata: { awsConnectionId: 'dxcon-abc001', vlan: 1001 },
      details: 'The customer acknowledged and accepted hosted connection dxcon-abc001 via the AWS Console. VLAN 1001 is now active and ready for virtual interface creation.',
      correlationId: 'COR-20260701-LMCC-002',
      rawPayload: {
        event: 'aws.hosted_connection.accepted',
        connectionId: 'conn-lmcc-1',
        awsConnectionId: 'dxcon-abc001',
        vlan: 1001,
        acceptedBy: 'customer@company.com',
        ts: '2026-07-01T14:05:00.000Z'
      }
    },
    {
      id: 'lmcc-3',
      timestamp: '2026-07-01 14:12',
      type: 'system',
      severity: 'info',
      message: 'Path 1 BGP state transition: idle > connect > active > open-sent > open-confirm > established',
      source: 'BGP Monitor',
      user: 'system',
      connectionId: 'conn-lmcc-1',
      metadata: { ipeId: 'MX304-SV1-A', bgpState: 'established' },
      details: 'BGP session on Path 1 (MX304-SV1-A) completed full FSM progression and reached Established state. Routes are now being exchanged with the AWS peer.',
      correlationId: 'COR-20260701-LMCC-003',
      rawPayload: {
        event: 'bgp.session.established',
        connectionId: 'conn-lmcc-1',
        ipeId: 'MX304-SV1-A',
        pathIndex: 1,
        transitions: ['idle', 'connect', 'active', 'open-sent', 'open-confirm', 'established'],
        peerAs: 7224,
        ts: '2026-07-01T14:12:00.000Z'
      }
    },
    {
      id: 'lmcc-4',
      timestamp: '2026-07-01 14:15',
      type: 'system',
      severity: 'info',
      message: 'BFD session established on all 4 paths - failover detection active (3x300ms = 900ms)',
      source: 'BFD Monitor',
      user: 'system',
      connectionId: 'conn-lmcc-1',
      metadata: { bfdInterval: 300, bfdMultiplier: 3 },
      details: 'Bidirectional Forwarding Detection is now active on all four paths with a configured interval of 300ms and multiplier of 3, yielding a 900ms failure detection window.',
      correlationId: 'COR-20260701-LMCC-004',
      rawPayload: {
        event: 'bfd.sessions.all_established',
        connectionId: 'conn-lmcc-1',
        paths: 4,
        intervalMs: 300,
        multiplier: 3,
        detectionWindowMs: 900,
        ts: '2026-07-01T14:15:00.000Z'
      }
    },
    {
      id: 'lmcc-5',
      timestamp: '2026-07-01 14:15',
      type: 'system',
      severity: 'info',
      message: 'AWS Max billing started - BGP Established on all 4 paths. Trial contract, fixed-rate billing.',
      source: 'Billing Engine',
      user: 'system',
      connectionId: 'conn-lmcc-1',
      metadata: { billingTrigger: 'bgp-established', contractType: 'trial' },
      details: 'Billing commenced upon BGP establishment across all four paths, per the trial contract terms. Fixed-rate pricing applies for the 90-day trial window.',
      correlationId: 'COR-20260701-LMCC-005',
      rawPayload: {
        event: 'billing.started',
        connectionId: 'conn-lmcc-1',
        trigger: 'bgp-established',
        contractType: 'trial',
        trialDays: 90,
        rateType: 'fixed',
        ts: '2026-07-01T14:15:00.000Z'
      }
    },
    {
      id: 'lmcc-6',
      timestamp: '2026-07-01 14:15',
      type: 'performance',
      severity: 'info',
      message: '802.1Q VLAN tag verification passed - all 4 IPE sub-interfaces match AWS Console IDs (1001, 1002, 1003, 1004)',
      source: 'AWS Max Orchestrator',
      user: 'system',
      connectionId: 'conn-lmcc-1',
      metadata: { vlans: [1001, 1002, 1003, 1004] },
      details: 'VLAN tag consistency check completed successfully. All four IPE sub-interface tags match the corresponding virtual interface IDs registered in the AWS Console.',
      correlationId: 'COR-20260701-LMCC-006',
      rawPayload: {
        event: 'vlan.verification.passed',
        connectionId: 'conn-lmcc-1',
        vlans: [1001, 1002, 1003, 1004],
        ipes: ['MX304-SV1-A', 'MX304-SV1-B', 'MX304-SV5-A', 'MX304-SV5-B'],
        allMatch: true,
        ts: '2026-07-01T14:15:00.000Z'
      }
    }
  ];

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    if (selectedConnection !== 'all' && log.connectionId !== selectedConnection) {
      return false;
    }

    const typeFilters = filters.type || [];
    if (typeFilters.length > 0 && !typeFilters.includes(log.type)) {
      return false;
    }

    const severityFilters = filters.severity || [];
    if (severityFilters.length > 0 && !severityFilters.includes(log.severity)) {
      return false;
    }

    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(' ');
      const searchableText = [
        log.message,
        log.source,
        log.user,
        log.type,
        log.severity
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    }

    return true;
  });

  const selectedIndex = selectedLog ? filteredLogs.findIndex(l => l.id === selectedLog.id) : -1;

  const getTypeIcon = (type: string, size: string = 'h-4 w-4') => {
    switch (type) {
      case 'system':
        return <Settings className={`${size} text-fw-bodyLight`} />;
      case 'security':
        return <Shield className={`${size} text-fw-error`} />;
      case 'user':
        return <Activity className={`${size} text-brand-blue`} />;
      case 'performance':
        return <Activity className={`${size} text-fw-bodyLight`} />;
      default:
        return <Globe className={`${size} text-fw-bodyLight`} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-fw-errorLight text-fw-error';
      case 'warning':
        return 'bg-fw-wash text-fw-bodyLight';
      case 'info':
        return 'bg-fw-accent text-fw-link';
      default:
        return 'bg-fw-neutral text-fw-body';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-fw-error" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-fw-bodyLight" />;
      default:
        return <Info className="h-4 w-4 text-fw-link" />;
    }
  };

  const handleCopyLog = (log: Log) => {
    const logText = `[${log.timestamp}] [${log.severity.toUpperCase()}] [${log.type}] ${log.message}\nSource: ${log.source}\nUser: ${log.user}\nCorrelation ID: ${log.correlationId || 'N/A'}`;
    navigator.clipboard.writeText(logText);
    window.addToast({
      type: 'success',
      title: 'Copied',
      message: 'Log entry copied to clipboard',
      duration: 2000
    });
  };

  const handleExportLog = () => {
    window.addToast({
      type: 'success',
      title: 'Exported',
      message: 'Log entry exported successfully',
      duration: 2000
    });
  };

  return (
    <div>
      {/* Outer border wraps search bar + flex content area */}
      <div className="border border-fw-secondary rounded-lg overflow-hidden">
        {/* Search/Filter bar */}
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
            onExport={() => {
              window.addToast({
                type: 'success',
                title: 'Logs Exported',
                message: 'Log data has been exported successfully',
                duration: 3000
              });
            }}
          />
        </div>

        {/* Table + Drawer row */}
        <div className="flex gap-0">
          {/* Table — compresses when drawer is open */}
          <div className="flex-1 min-w-0 overflow-auto">
            <table className="w-full table-fixed">
              <thead className="bg-fw-wash border-b border-fw-secondary">
                <tr>
                  {displayColumns.map((col) => {
                    const isSortable = SORTABLE_COLUMNS.includes(col.id);
                    const isSorted = sortField === col.id;
                    return (
                      <th key={col.id} scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading whitespace-nowrap overflow-hidden text-ellipsis align-middle">
                        {isSortable ? (
                          <button onClick={() => handleSort(col.id)} className="group inline-flex items-center space-x-1">
                            <span>{col.label}</span>
                            <span className="flex flex-col">
                              <ChevronUp className={`h-3 w-3 ${isSorted && sortDirection === 'asc' ? 'text-fw-body' : 'text-fw-bodyLight group-hover:text-fw-body'}`} />
                              <ChevronDown className={`h-3 w-3 -mt-1 ${isSorted && sortDirection === 'desc' ? 'text-fw-body' : 'text-fw-bodyLight group-hover:text-fw-body'}`} />
                            </span>
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    );
                  })}
                  <th scope="col" className="w-16 px-6 h-12 align-middle">
                    <div className="flex justify-end">
                      <button
                        ref={columnButtonRef}
                        onClick={() => setShowColumnPopover(!showColumnPopover)}
                        className="p-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral transition-colors"
                        title="Manage Columns"
                      >
                        <Settings className="h-5 w-5" />
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-fw-base divide-y divide-fw-secondary">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={displayColumns.length + 1} className="px-6 py-4 text-center text-fw-bodyLight">
                      No logs match the current filters
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isSelected = selectedLog?.id === log.id;
                    const cellContent: Record<string, React.ReactNode> = {
                      time: (
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-fw-bodyLight mr-2 flex-shrink-0" />
                          <span className="font-mono">{log.timestamp}</span>
                        </div>
                      ),
                      type: (
                        <div className="flex items-center">
                          {getTypeIcon(log.type)}
                          <span className="ml-2 capitalize">{log.type}</span>
                        </div>
                      ),
                      severity: (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-figma-sm font-medium ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      ),
                      message: (
                        <div className="text-fw-heading truncate">{log.message}</div>
                      ),
                      source: <span className="truncate">{log.source}</span>,
                      user: <span className="truncate">{log.user}</span>,
                    };
                    return (
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(isSelected ? null : log)}
                        className={`cursor-pointer transition-colors ${isSelected ? 'bg-fw-accent/50' : 'hover:bg-fw-wash'}`}
                      >
                        {displayColumns.map((col) => (
                          <td key={col.id} className="px-6 py-4 text-[14px] text-fw-body whitespace-nowrap overflow-hidden text-ellipsis">
                            {cellContent[col.id]}
                          </td>
                        ))}
                        <td className="w-16 px-4 py-4">
                          <div className="flex justify-end">
                            <ChevronRight className={`h-4 w-4 transition-colors ${isSelected ? 'text-fw-link' : 'text-fw-secondary'}`} />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Detail Drawer */}
          <div
            className={`flex-shrink-0 border-l border-fw-secondary bg-fw-base flex flex-col transition-all duration-300 overflow-hidden ${
              selectedLog ? 'w-[380px]' : 'w-0'
            }`}
          >
            {selectedLog && (
              <>
                {/* Sticky header */}
                <div className="sticky top-0 z-10 px-5 py-4 border-b border-fw-secondary bg-fw-base flex-shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {getSeverityIcon(selectedLog.severity)}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide ${getSeverityColor(selectedLog.severity)}`}>
                        {selectedLog.severity}
                      </span>
                      <span className="text-figma-xs text-fw-bodyLight capitalize">{selectedLog.type}</span>
                    </div>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="flex-shrink-0 p-1 rounded text-fw-bodyLight hover:text-fw-body hover:bg-fw-wash transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2.5 text-figma-sm font-medium text-fw-heading leading-snug line-clamp-3">
                    {selectedLog.message}
                  </p>
                  <p className="mt-1 text-[11px] font-mono text-fw-bodyLight">#{selectedLog.id}</p>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
                  {/* Details */}
                  {selectedLog.details && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fw-bodyLight mb-2">Details</h4>
                      <p className="text-figma-sm text-fw-body leading-relaxed">{selectedLog.details}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div>
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fw-bodyLight mb-2">Metadata</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                      <div>
                        <p className="text-[11px] text-fw-bodyLight">Timestamp</p>
                        <p className="text-figma-sm font-mono text-fw-heading">{selectedLog.timestamp}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-fw-bodyLight">Source</p>
                        <p className="text-figma-sm text-fw-heading">{selectedLog.source}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-fw-bodyLight">User</p>
                        <p className="text-figma-sm text-fw-heading truncate">{selectedLog.user}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-fw-bodyLight">Connection</p>
                        <p className="text-figma-sm font-mono text-fw-heading">{selectedLog.connectionId}</p>
                      </div>
                      {Object.entries(selectedLog.metadata).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-[11px] text-fw-bodyLight capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-figma-sm text-fw-heading truncate">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Correlation ID */}
                  {selectedLog.correlationId && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fw-bodyLight mb-2">Correlation ID</h4>
                      <p className="text-figma-sm font-mono text-fw-heading bg-fw-wash rounded-md px-3 py-2 break-all">
                        {selectedLog.correlationId}
                      </p>
                    </div>
                  )}

                  {/* Raw Payload */}
                  {selectedLog.rawPayload && (
                    <div>
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fw-bodyLight mb-2">Raw Payload</h4>
                      <pre className="text-[11px] font-mono text-fw-body bg-fw-wash rounded-md px-3 py-3 overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(selectedLog.rawPayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Sticky footer */}
                <div className="sticky bottom-0 px-5 py-3 border-t border-fw-secondary bg-fw-base flex-shrink-0 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLog(selectedLog)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-figma-xs font-medium bg-fw-wash text-fw-body hover:bg-fw-secondary transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                    <button
                      onClick={handleExportLog}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-figma-xs font-medium bg-fw-wash text-fw-body hover:bg-fw-secondary transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => selectedIndex > 0 && setSelectedLog(filteredLogs[selectedIndex - 1])}
                      disabled={selectedIndex <= 0}
                      className="p-1.5 rounded text-fw-bodyLight hover:text-fw-body hover:bg-fw-wash transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Previous log"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <span className="text-[11px] text-fw-bodyLight tabular-nums min-w-[40px] text-center">
                      {selectedIndex + 1} / {filteredLogs.length}
                    </span>
                    <button
                      onClick={() => selectedIndex < filteredLogs.length - 1 && setSelectedLog(filteredLogs[selectedIndex + 1])}
                      disabled={selectedIndex >= filteredLogs.length - 1}
                      className="p-1.5 rounded text-fw-bodyLight hover:text-fw-body hover:bg-fw-wash transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Next log"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showColumnPopover && (
        <ColumnVisibilityPopover
          tableId={TABLE_ID}
          allColumns={ALL_COLUMNS}
          onClose={() => setShowColumnPopover(false)}
          anchorEl={columnButtonRef.current}
        />
      )}
    </div>
  );
}

export default LogsContent;
