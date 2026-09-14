import { useState, useMemo } from 'react';
import { Plus, Download, LayoutGrid, List, ChevronDown, ChevronUp } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { Button } from '../../common/Button';
import { SearchFilterBar } from '../../common/SearchFilterBar';
import { TableFilterPanel, useTableFilters, FilterGroup } from '../../common/TableFilterPanel';
import { Connection, Link } from '../../../types';

const LINK_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'status',
    label: 'Status',
    type: 'toggle',
    options: [
      { value: 'active', label: 'Active', color: 'success' },
      { value: 'inactive', label: 'Inactive', color: 'warning' },
      { value: 'maintenance', label: 'Maintenance', color: 'info' },
    ],
  },
  {
    id: 'type',
    label: 'Type',
    type: 'toggle',
    options: [
      { value: 'data', label: 'Data' },
      { value: 'management', label: 'Management' },
      { value: 'backup', label: 'Backup' },
    ],
  },
];
import { LinkTable } from './LinkTable';
import { LinkStatusSummary } from './LinkStatusSummary';
import { VLANModal } from '../modals/VLANModal';
import { DeleteLinkModal } from '../modals/DeleteVLANModal';
import { Hub } from '../../../types/hub';

interface LinkSectionProps {
  /** Optional — present on the connection page. On the hub page, pass bandwidth/ownerId instead. */
  connection?: Connection;
  allLinks?: Array<Link & { cloudRouterName?: string, hubId?: string }>;
  hubs?: Hub[];
  isEditing?: boolean;
  /** Total bandwidth for the status summary when there's no single connection. */
  bandwidth?: string;
  /** Owner id passed to the VLAN modal (connection id or hub id). */
  ownerId?: string;
}

export function LinkSection({
  connection,
  allLinks = [],
  hubs = [],
  isEditing = false,
  bandwidth,
  ownerId
}: LinkSectionProps) {
  // Use provided links or fallback to sample data
  const [links, setLinks] = useState<Array<Link & { cloudRouterName?: string, hubId?: string }>>(
    allLinks.length > 0 ? allLinks : [
      {
        id: 'vlan-1',
        name: 'Production Traffic',
        vlanId: 100,
        status: 'active',
        description: 'Main production network traffic',
        tags: ['production', 'primary'],
        ipSubnet: '10.100.0.0/24',
        mtu: 1500,
        qosPriority: 3,
        type: 'data',
        createdAt: '2024-01-15T09:30:00Z',
        updatedAt: '2024-03-20T14:22:00Z',
        cloudRouterName: 'Hub A',
        hubId: 'cr-1',
        hubIds: ['cr-1'],
        bandwidth: '5 Gbps'
      },
      {
        id: 'vlan-2',
        name: 'Development Environment',
        vlanId: 200,
        status: 'active',
        description: 'Development and testing workloads',
        tags: ['development', 'testing'],
        ipSubnet: '10.200.0.0/24',
        mtu: 1500,
        qosPriority: 1,
        type: 'data',
        createdAt: '2024-01-20T10:45:00Z',
        updatedAt: '2024-02-18T11:30:00Z',
        cloudRouterName: 'Hub A',
        hubId: 'cr-1',
        hubIds: ['cr-1'],
        bandwidth: '2 Gbps'
      },
      {
        id: 'vlan-3',
        name: 'Management Traffic',
        vlanId: 300,
        status: 'active',
        description: 'Network management and control plane',
        tags: ['management', 'control'],
        ipSubnet: '10.0.0.0/24',
        mtu: 1500,
        qosPriority: 5,
        type: 'management',
        createdAt: '2024-01-25T08:15:00Z',
        updatedAt: '2024-03-05T16:10:00Z',
        cloudRouterName: 'Hub B',
        hubId: 'cr-2',
        hubIds: ['cr-2'],
        bandwidth: '1 Gbps'
      },
      {
        id: 'vlan-4',
        name: 'Voice Systems',
        vlanId: 400,
        status: 'active',
        description: 'VoIP and communication systems',
        tags: ['voice', 'comms'],
        ipSubnet: '10.40.0.0/24',
        mtu: 1500,
        qosPriority: 5,
        type: 'voice',
        createdAt: '2024-02-10T13:20:00Z',
        cloudRouterName: 'Hub B',
        hubId: 'cr-2',
        hubIds: ['cr-2'],
        bandwidth: '2 Gbps'
      }
    ]
  );

  const [sortField, setSortField] = useState<keyof Link>('vlanId');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [collapsedRouters, setCollapsedRouters] = useState<Set<string>>(new Set());

  const toggleRouter = (id: string) => {
    setCollapsedRouters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const { filters: linkFilters, setFilters: setLinkFilters, isOpen: linkFilterOpen, toggle: toggleLinkFilter, activeCount: linkFilterCount } = useTableFilters({
    groups: LINK_FILTER_GROUPS,
  });
  const [editingLink, setEditingLink] = useState<Link & { cloudRouterName?: string, hubId?: string } | undefined>();
  const [deletingLink, setDeletingLink] = useState<Link & { cloudRouterName?: string, hubId?: string } | undefined>();
  const [selectedHub, setSelectedHub] = useState<string>('all');

  // Calculate total used bandwidth across all hubs
  const calculateTotalUsedBandwidth = () => {
    return links.reduce((total, link) => {
      // Extract numeric value and unit from bandwidth
      const bandwidthMatch = link.bandwidth?.match(/(\d+)\s*(Gbps|Mbps|Tbps)/i);
      if (bandwidthMatch) {
        const value = parseInt(bandwidthMatch[1]);
        const unit = bandwidthMatch[2].toLowerCase();
        
        // Convert to Gbps for consistent calculation
        if (unit === 'gbps') return total + value;
        if (unit === 'mbps') return total + (value / 1000);
        if (unit === 'tbps') return total + (value * 1000);
      }
      return total + 1; // Default to 1 Gbps if not specified
    }, 0);
  };

  // Parse connection bandwidth string to number in Gbps
  const parseTotalBandwidth = (bandwidthStr?: string) => {
    if (!bandwidthStr) return 10; // Default to 10 Gbps if not specified
    
    const match = bandwidthStr.match(/(\d+)\s*(Gbps|Mbps|Tbps)/i);
    if (!match) return 10;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit === 'gbps') return value;
    if (unit === 'mbps') return value / 1000;
    if (unit === 'tbps') return value * 1000;
    
    return 10; // Default fallback
  };

  // Calculate available bandwidth
  const totalBandwidth = parseTotalBandwidth(connection?.bandwidth ?? bandwidth ?? '0');
  const usedBandwidth = calculateTotalUsedBandwidth();
  const availableBandwidth = Math.max(0, totalBandwidth - usedBandwidth);

  // Link handlers
  const handleSort = (field: keyof Link) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddLink = () => {
    setShowAddModal(true);
  };

  const handleEditLink = (link: Link & { cloudRouterName?: string, hubId?: string }) => {
    setEditingLink(link);
  };

  const handleDeleteLink = (link: Link & { cloudRouterName?: string, hubId?: string }) => {
    setDeletingLink(link);
  };

  const handleSaveLink = (linkData: Partial<Link>) => {
    // In a real app, we would need to update the hub
    // For now, just update our local state
    if (editingLink) {
      // Update existing link
      setLinks(links.map(v => v.id === editingLink.id ? { ...v, ...linkData } as typeof v : v));
      setEditingLink(undefined);
      
      window.addToast({
        type: 'success',
        title: 'Link Updated',
        message: `Link ${linkData.name} has been updated successfully`,
        duration: 3000
      });
    } else {
      // Add new link
      const newLink = {
        ...linkData,
        id: `vlan-${Date.now()}`,
        createdAt: new Date().toISOString(),
        cloudRouterName: selectedHub !== 'all' 
          ? hubs.find(cr => cr.id === selectedHub)?.name 
          : 'Hub A',
        hubId: selectedHub !== 'all' 
          ? selectedHub
          : hubs[0]?.id || 'cr-1'
      } as Link & { cloudRouterName?: string, hubId?: string };
      
      setLinks([...links, newLink]);
      
      window.addToast({
        type: 'success',
        title: 'Link Created',
        message: `Link ${newLink.name} has been created successfully`,
        duration: 3000
      });
    }
    
    setShowAddModal(false);
  };

  const handleConfirmDelete = () => {
    if (deletingLink) {
      setLinks(links.filter(v => v.id !== deletingLink.id));
      
      window.addToast({
        type: 'success',
        title: 'Link Deleted',
        message: `Link ${deletingLink.name} has been deleted successfully`,
        duration: 3000
      });
      
      setDeletingLink(undefined);
    }
  };

  // Sort links based on current sort field and direction
  const sortedLinks = [...links].sort((a, b) => {
    // For hub sorting
    if (sortField === 'hubId' as keyof Link) {
      const aRouter = a.cloudRouterName || '';
      const bRouter = b.cloudRouterName || '';
      return sortDirection === 'asc' 
        ? aRouter.localeCompare(bRouter)
        : bRouter.localeCompare(aRouter);
    }
    
    const aValue = a[sortField];
    const bValue = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return aValue.localeCompare(bValue) * modifier;
    } else {
      return ((aValue as any) < (bValue as any) ? -1 : 1) * modifier;
    }
  });

  // Filter links based on search query, selected hub, and filter panel
  const filteredLinks = useMemo(() => {
    const statusFilters = linkFilters.status || [];
    const typeFilters = linkFilters.type || [];

    return sortedLinks.filter(link => {
      if (selectedHub !== 'all' && link.hubId !== selectedHub) {
        return false;
      }
      if (statusFilters.length > 0 && !statusFilters.includes(link.status)) return false;
      if (typeFilters.length > 0 && !typeFilters.includes(link.type || '')) return false;

      if (!searchQuery) return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        link.name.toLowerCase().includes(searchLower) ||
        link.ipSubnet?.toLowerCase().includes(searchLower) ||
        link.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
        link.type?.toLowerCase().includes(searchLower) ||
        link.vlanId.toString().includes(searchLower) ||
        (link.cloudRouterName && link.cloudRouterName.toLowerCase().includes(searchLower))
      );
    });
  }, [sortedLinks, selectedHub, searchQuery, linkFilters]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">Links</h2>
          <p className="text-figma-base text-fw-bodyLight mt-1">
            Manage network links (VLANs) and their configurations
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={handleAddLink}
        >
          Add Link
        </Button>
      </div>

      {/* Link Status Summary */}
      <LinkStatusSummary links={links} />

      {/* Table / Grouped view */}
      <div className="rounded-lg border border-fw-secondary overflow-hidden">
        <div className="px-6 py-4 border-b border-fw-secondary flex items-center gap-3">
          <div className="flex-1">
            <SearchFilterBar
              searchPlaceholder="Search links ..."
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              onFilter={toggleLinkFilter}
              activeFilterCount={linkFilterCount}
              isFilterOpen={linkFilterOpen}
              filterPanel={
                <TableFilterPanel
                  groups={LINK_FILTER_GROUPS}
                  activeFilters={linkFilters}
                  onFiltersChange={setLinkFilters}
                  isOpen={linkFilterOpen}
                  onToggle={toggleLinkFilter}
                  searchQuery={searchQuery}
                  onClearSearch={() => setSearchQuery('')}
                />
              }
              onExport={() => {
                const headers = ['VLAN ID', 'Name', 'Status', 'Hub'].join(',');
                const rows = filteredLinks.map(link =>
                  `"${link.vlanId}","${link.name}","${link.status.charAt(0).toUpperCase() + link.status.slice(1)}","${link.cloudRouterName || 'Not assigned'}"`
                );
                const csv = [headers, ...rows].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'links.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
            />
          </div>
          {hubs.length > 0 && (
            <div className="flex items-center gap-1 shrink-0 border border-fw-secondary rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grouped' ? 'bg-fw-wash text-fw-heading' : 'text-fw-disabled hover:text-fw-bodyLight'}`}
                title="Group by router"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('flat')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'flat' ? 'bg-fw-wash text-fw-heading' : 'text-fw-disabled hover:text-fw-bodyLight'}`}
                title="Flat table"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {viewMode === 'flat' || hubs.length === 0 ? (
          <LinkTable
            links={filteredLinks}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={handleEditLink}
            onDelete={handleDeleteLink}
            searchQuery={searchQuery}
            showHub={true}
          />
        ) : (
          <div className="divide-y divide-fw-secondary">
            {hubs.map(router => {
              const routerLinks = (router.links || []).filter(link => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                  link.name?.toLowerCase().includes(q) ||
                  String(link.vlanId).includes(q) ||
                  link.status?.toLowerCase().includes(q)
                );
              });
              const isCollapsed = collapsedRouters.has(router.id);
              return (
                <div key={router.id}>
                  <button
                    onClick={() => toggleRouter(router.id)}
                    className="w-full flex items-center gap-3 px-5 py-3 bg-fw-wash hover:bg-fw-neutral transition-colors text-left"
                  >
                    <AttIcon name="hub" className="h-4 w-4 text-fw-bodyLight shrink-0" />
                    <span className="text-figma-sm font-semibold text-fw-heading flex-1">{router.name}</span>
                    <span className={`text-figma-xs px-2 py-0.5 rounded-full font-medium ${
                      router.status === 'active' ? 'bg-fw-successLight text-fw-success' : 'bg-fw-secondary text-fw-disabled'
                    }`}>
                      {router.status}
                    </span>
                    <span className="text-figma-xs text-fw-bodyLight">{routerLinks.length} link{routerLinks.length !== 1 ? 's' : ''}</span>
                    {isCollapsed ? <ChevronDown className="h-4 w-4 text-fw-bodyLight" /> : <ChevronUp className="h-4 w-4 text-fw-bodyLight" />}
                  </button>
                  {!isCollapsed && (
                    routerLinks.length === 0 ? (
                      <div className="px-5 py-4 text-figma-sm text-fw-disabled italic">No links on this router</div>
                    ) : (
                      <LinkTable
                        links={routerLinks as any}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        onEdit={handleEditLink}
                        onDelete={handleDeleteLink}
                        searchQuery={searchQuery}
                        showHub={false}
                      />
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <VLANModal
        isOpen={showAddModal || !!editingLink}
        onClose={() => {
          setShowAddModal(false);
          setEditingLink(undefined);
        }}
        onSave={handleSaveLink}
        vlan={editingLink}
        connectionId={(connection?.id ?? ownerId ?? '').toString()}
        availableBandwidth={availableBandwidth}
        hubs={hubs}
        selectedHubId={selectedHub !== 'all' ? selectedHub : undefined}
      />

      {/* Delete Link Confirmation Modal */}
      {deletingLink && (
        <DeleteLinkModal
          isOpen={!!deletingLink}
          onClose={() => setDeletingLink(undefined)}
          onConfirm={handleConfirmDelete}
          linkName={deletingLink.name}
          linkId={deletingLink.vlanId}
        />
      )}
    </div>
  );
}