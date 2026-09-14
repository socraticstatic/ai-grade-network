import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, ChevronDown, Settings, Ticket, Eye, Edit, Trash2 } from 'lucide-react';
import { Button } from '../common/Button';
import { SearchFilterBar } from '../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../common/TableFilterPanel';
import { OverflowMenu } from '../common/OverflowMenu';
import { ColumnVisibilityPopover, ColumnDefinition } from '../common/ColumnVisibilityPopover';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';

type TroubleType = 'info' | 'trouble' | 'configuration';
type TicketStatus = 'open' | 'in-progress' | 'pending' | 'closed';

interface Ticket {
  id: string;
  ticketNumber: string;
  description: string;
  troubleType: TroubleType;
  status: TicketStatus;
  connection: string;
  asset: string;
  bcOrgId: string;
  externalTicketId: string;
  resolution: string;
}

const TROUBLE_TYPE_STYLES: Record<TroubleType, string> = {
  'info': 'bg-fw-accent text-fw-link',
  'trouble': 'bg-fw-error/10 text-fw-error',
  'configuration': 'bg-fw-warn/10 text-fw-warn',
};

const TROUBLE_TYPE_LABELS: Record<TroubleType, string> = {
  'info': 'Information',
  'trouble': 'Trouble',
  'configuration': 'Configuration',
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  'open': 'bg-fw-active/10 text-fw-link',
  'in-progress': 'bg-fw-warn/10 text-fw-warn',
  'pending': 'bg-fw-neutral text-fw-bodyLight',
  'closed': 'bg-fw-success/10 text-fw-success',
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  'open': 'Open',
  'in-progress': 'In Progress',
  'pending': 'Pending',
  'closed': 'Closed',
};

const MOCK_TICKETS: Ticket[] = [
  { id: '1', ticketNumber: 'TKT-2024-001', description: 'Tunnel status down on AWS Interconnect – last mile', troubleType: 'trouble', status: 'open', connection: 'AWS Interconnect – last mile - US East', asset: 'PALO-FW-PROD-01', bcOrgId: 'BC-ORG-44821', externalTicketId: 'AOTS-TKT-88432', resolution: '' },
  { id: '2', ticketNumber: 'TKT-2024-002', description: 'Request BGP peering configuration change', troubleType: 'configuration', status: 'in-progress', connection: 'Azure ExpressRoute - West', asset: 'CR-EAST-01', bcOrgId: 'BC-ORG-44821', externalTicketId: '', resolution: '' },
  { id: '3', ticketNumber: 'TKT-2024-003', description: 'Bandwidth upgrade inquiry for Q2', troubleType: 'info', status: 'open', connection: 'Google Interconnect - Central', asset: '', bcOrgId: 'BC-ORG-55102', externalTicketId: '', resolution: '' },
  { id: '4', ticketNumber: 'TKT-2024-004', description: 'High latency on Oracle FastConnect link', troubleType: 'trouble', status: 'pending', connection: 'Oracle FastConnect - Phoenix', asset: 'CR-WEST-02', bcOrgId: 'BC-ORG-44821', externalTicketId: 'AOTS-TKT-90011', resolution: '' },
  { id: '5', ticketNumber: 'TKT-2024-005', description: 'Add VLAN tagging to production link', troubleType: 'configuration', status: 'closed', connection: 'AWS Interconnect – last mile - US East', asset: 'VLAN-100', bcOrgId: 'BC-ORG-44821', externalTicketId: '', resolution: 'Completed - VLAN 100 tagged on all 4 paths' },
  { id: '6', ticketNumber: 'TKT-2024-006', description: 'VNF firewall rule update request', troubleType: 'configuration', status: 'open', connection: 'Azure ExpressRoute - West', asset: 'PALO-FW-DEV-01', bcOrgId: 'BC-ORG-55102', externalTicketId: '', resolution: '' },
  { id: '7', ticketNumber: 'TKT-2024-007', description: 'Connection failover test scheduling', troubleType: 'info', status: 'in-progress', connection: 'AWS Interconnect – last mile - US East', asset: '', bcOrgId: 'BC-ORG-44821', externalTicketId: '', resolution: '' },
  { id: '8', ticketNumber: 'TKT-2024-008', description: 'Packet loss detected on Hub B', troubleType: 'trouble', status: 'open', connection: 'Google Interconnect - Central', asset: 'CR-CENTRAL-01', bcOrgId: 'BC-ORG-55102', externalTicketId: 'AOTS-TKT-90455', resolution: '' },
  { id: '9', ticketNumber: 'TKT-2024-009', description: 'Decommission old SD-WAN VNF', troubleType: 'configuration', status: 'closed', connection: 'Oracle FastConnect - Phoenix', asset: 'SDWAN-BRANCH-01', bcOrgId: 'BC-ORG-44821', externalTicketId: '', resolution: 'Decommissioned - VNF removed from inventory' },
  { id: '10', ticketNumber: 'TKT-2024-010', description: 'SLA compliance report request', troubleType: 'info', status: 'pending', connection: 'AWS Interconnect – last mile - US East', asset: '', bcOrgId: 'BC-ORG-55102', externalTicketId: '', resolution: '' },
];

const PAGE_SIZE = 20;

const FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'troubleType',
    label: 'Trouble Type',
    type: 'toggle',
    options: [
      { value: 'info', label: 'Information', color: 'info' },
      { value: 'trouble', label: 'Trouble', color: 'error' },
      { value: 'configuration', label: 'Configuration', color: 'warning' },
    ],
  },
  {
    id: 'status',
    label: 'Status',
    type: 'toggle',
    options: [
      { value: 'open', label: 'Open', color: 'info' },
      { value: 'in-progress', label: 'In Progress', color: 'warning' },
      { value: 'pending', label: 'Pending' },
      { value: 'closed', label: 'Closed', color: 'success' },
    ],
  },
];

export function TicketingIndex() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string>('ticketNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showColumnPopover, setShowColumnPopover] = useState(false);
  const columnButtonRef = useRef<HTMLButtonElement>(null);
  const { isVisible, visibleColumns } = useColumnVisibility('tickets');

  const { filters, setFilters, isOpen, toggle, activeCount } = useTableFilters({
    groups: FILTER_GROUPS,
  });

  const filteredTickets = useMemo(() => {
    const troubleTypeFilters = filters.troubleType || [];
    const statusFilters = filters.status || [];

    return MOCK_TICKETS.filter(ticket => {
      const matchesSearch = searchQuery === '' ||
        ticket.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.connection.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.asset.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTroubleType = troubleTypeFilters.length === 0 || troubleTypeFilters.includes(ticket.troubleType);
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(ticket.status);
      return matchesSearch && matchesTroubleType && matchesStatus;
    });
  }, [searchQuery, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startItem = filteredTickets.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, filteredTickets.length);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const allColumns: Array<{ key: string; label: string }> = [
    { key: 'ticketNumber', label: 'Ticket' },
    { key: 'description', label: 'Description' },
    { key: 'troubleType', label: 'Trouble Type' },
    { key: 'status', label: 'Status' },
    { key: 'bcOrgId', label: 'BC Org' },
    { key: 'connection', label: 'Connection' },
    { key: 'asset', label: 'Asset' },
    { key: 'externalTicketId', label: 'AOTS Ref' },
    { key: 'resolution', label: 'Resolution' },
  ];

  const columns = visibleColumns.length === 0
    ? allColumns
    : allColumns.filter(c => isVisible(c.key));

  const columnDefs: ColumnDefinition[] = allColumns.map(c => ({ id: c.key, label: c.label }));

  return (
    <div className="space-y-6">
      {/* Table */}
      <div className="rounded-lg border border-fw-secondary overflow-hidden">
        {/* SearchFilterBar inside border */}
        <div className="px-6 py-4 border-b border-fw-secondary">
          <SearchFilterBar
            searchPlaceholder="Search tickets ..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            onFilter={toggle}
            activeFilterCount={activeCount}
            isFilterOpen={isOpen}
            filterPanel={
              <TableFilterPanel
                groups={FILTER_GROUPS}
                activeFilters={filters}
                onFiltersChange={(f) => { setFilters(f); setCurrentPage(1); }}
                isOpen={isOpen}
                onToggle={toggle}
                searchQuery={searchQuery}
                onClearSearch={() => setSearchQuery('')}
              />
            }
            onExport={() => window.addToast?.({ type: 'success', title: 'Exported', message: 'Tickets exported', duration: 3000 })}
            actions={
              <Button variant="primary" icon={Plus} onClick={() => navigate('/tickets/create')}>
                Create
              </Button>
            }
          />
        </div>

        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-fw-wash border-b border-fw-secondary">
            <tr>
              <th className="w-10 px-4 h-12 align-middle">
                <input type="checkbox" className="h-4 w-4 rounded border-fw-secondary" />
              </th>
              {columns.map(col => {
                const widthClass = col.key === 'ticketNumber' ? 'w-[130px]'
                  : col.key === 'description' ? 'min-w-[240px]'
                  : col.key === 'troubleType' ? 'w-[120px]'
                  : col.key === 'status' ? 'w-[100px]'
                  : col.key === 'connection' ? 'min-w-[200px]'
                  : col.key === 'asset' ? 'w-[140px]'
                  : '';
                return (
                  <th
                    key={col.key}
                    className={`px-4 h-12 text-left text-figma-sm font-medium text-fw-heading whitespace-nowrap align-middle ${widthClass}`}
                  >
                    <button onClick={() => handleSort(col.key)} className="group inline-flex items-center space-x-1">
                      <span>{col.label}</span>
                      <span className="flex flex-col">
                        <ChevronUp className={`h-3 w-3 ${sortColumn === col.key && sortDirection === 'asc' ? 'text-fw-body' : 'text-fw-bodyLight group-hover:text-fw-body'}`} />
                        <ChevronDown className={`h-3 w-3 -mt-1 ${sortColumn === col.key && sortDirection === 'desc' ? 'text-fw-body' : 'text-fw-bodyLight group-hover:text-fw-body'}`} />
                      </span>
                    </button>
                  </th>
                );
              })}
              <th className="w-12 px-2 h-12 align-middle">
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
            {paginatedTickets.map(ticket => {
              const cellMap: Record<string, React.ReactNode> = {
                ticketNumber: (
                  <td key="ticketNumber" className="px-4 py-3 text-figma-sm text-fw-link font-medium whitespace-nowrap">
                    {ticket.ticketNumber}
                  </td>
                ),
                description: (
                  <td key="description" className="px-4 py-3 text-figma-sm text-fw-body max-w-[320px] truncate">
                    {ticket.description}
                  </td>
                ),
                troubleType: (
                  <td key="troubleType" className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[8px] text-[12px] font-medium ${TROUBLE_TYPE_STYLES[ticket.troubleType]}`}>
                      {TROUBLE_TYPE_LABELS[ticket.troubleType]}
                    </span>
                  </td>
                ),
                status: (
                  <td key="status" className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[8px] text-[12px] font-medium ${STATUS_STYLES[ticket.status]}`}>
                      {STATUS_LABELS[ticket.status]}
                    </span>
                  </td>
                ),
                connection: (
                  <td key="connection" className="px-4 py-3 text-figma-sm text-fw-body whitespace-nowrap">
                    {ticket.connection || '-'}
                  </td>
                ),
                asset: (
                  <td key="asset" className="px-4 py-3 text-figma-sm text-fw-body whitespace-nowrap">
                    {ticket.asset || '-'}
                  </td>
                ),
                bcOrgId: (
                  <td key="bcOrgId" className="px-4 py-3 text-figma-sm text-fw-body whitespace-nowrap font-mono">
                    {ticket.bcOrgId || '-'}
                  </td>
                ),
                externalTicketId: (
                  <td key="externalTicketId" className="px-4 py-3 text-figma-sm text-fw-link whitespace-nowrap font-mono">
                    {ticket.externalTicketId || '-'}
                  </td>
                ),
                resolution: (
                  <td key="resolution" className="px-4 py-3 text-figma-sm text-fw-body max-w-[200px] truncate">
                    {ticket.resolution || '-'}
                  </td>
                ),
              };
              return (
                <tr key={ticket.id} className="hover:bg-fw-wash transition-colors cursor-pointer" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                  <td className="px-4 py-3 align-middle" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="h-4 w-4 rounded border-fw-secondary" />
                  </td>
                  {columns.map(col => cellMap[col.key])}
                  <td className="w-12 px-2 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end">
                    <OverflowMenu items={[
                      { id: 'view', label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => navigate(`/tickets/${ticket.id}`) },
                      { id: 'edit', label: 'Edit Ticket', icon: <Edit className="h-4 w-4" />, onClick: () => navigate(`/tickets/${ticket.id}`) },
                      { id: 'delete', label: 'Delete', icon: <Trash2 className="h-4 w-4" />, onClick: () => {}, variant: 'danger' as const },
                    ]} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginatedTickets.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-6 py-16 text-center">
                  <Ticket className="h-12 w-12 text-fw-bodyLight mx-auto mb-4" />
                  <h3 className="text-[16px] font-bold text-fw-heading mb-2">No tickets found</h3>
                  <p className="text-[14px] text-fw-bodyLight max-w-md mx-auto mb-6">
                    {searchQuery || activeCount > 0
                      ? 'Try adjusting your search or filters.'
                      : 'No support tickets have been created yet.'}
                  </p>
                  <Button variant="primary" icon={Plus} onClick={() => navigate('/tickets/create')}>
                    Create Ticket
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-fw-secondary">
          <span className="text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em]">
            {startItem} - {endItem} of {filteredTickets.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-fw-wash disabled:opacity-30"
            >
              <ChevronsLeft className="h-5 w-5 text-fw-heading" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-fw-wash disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5 text-fw-heading" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`h-5 w-5 flex items-center justify-center rounded text-figma-sm font-medium ${
                  page === currentPage ? 'bg-fw-active text-white' : 'text-fw-heading hover:bg-fw-wash'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-fw-wash disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5 text-fw-heading" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-fw-wash disabled:opacity-30"
            >
              <ChevronsRight className="h-5 w-5 text-fw-heading" />
            </button>
            <div className="w-px h-5 bg-fw-secondary mx-1" />
            <span className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">20</span>
            <ChevronDown className="h-4 w-4 text-fw-heading" />
          </div>
        </div>
      </div>

      {showColumnPopover && (
        <ColumnVisibilityPopover
          tableId="tickets"
          allColumns={columnDefs}
          onClose={() => setShowColumnPopover(false)}
          anchorEl={columnButtonRef.current}
        />
      )}
    </div>
  );
}
