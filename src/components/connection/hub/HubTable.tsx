import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Edit2, Trash2, Eye, MapPin } from 'lucide-react';
import { Hub } from '../../../types/hub';
import { OverflowMenu } from '../../common/OverflowMenu';
import { VNF } from '../../../types/vnf';
import { EnhancedTable, TableColumn } from '../../common/EnhancedTable';
import { useStore } from '../../../store/useStore';
import { getHubUtilization, getHubPeakUtilization, getHubSla } from '../../../utils/connectionFacts';
import { UtilizationMeter, SlaBadge } from '../facts/FactBadges';

interface HubTableProps {
  hubs: Hub[];
  vnfs?: VNF[]; // VNFs to display with hubs
  onEdit: (hub: Hub) => void;
  onDelete: (hub: Hub) => void;
  connectionBandwidth?: string; // Total connection bandwidth
  usedBandwidth?: number; // Total used bandwidth across all routers
}

export function HubTable({
  hubs,
  vnfs = [],
  onEdit,
  onDelete,
  connectionBandwidth = '10 Gbps',
  usedBandwidth = 0
}: HubTableProps) {
  const navigate = useNavigate();
  const allConnections = useStore(state => state.connections);
  const [activeOverflow, setActiveOverflow] = useState<string | null>(null);
  const connsFor = (router: Hub) => allConnections.filter(c => router.connectionIds?.includes(c.id));

  // Count VNFs by hub
  const vnfCountByRouter = vnfs.reduce((counts, vnf) => {
    if (vnf.hubId) {
      counts[vnf.hubId] = (counts[vnf.hubId] || 0) + 1;
    }
    return counts;
  }, {} as Record<string, number>);

  // Calculate total bandwidth and available bandwidth
  const totalBandwidth = parseFloat(connectionBandwidth.replace(/[^\d.]/g, ''));
  const availableBandwidth = Math.max(0, totalBandwidth - usedBandwidth);

  const getBandwidthUsedByRouter = (router: Hub): number => {
    if (!router.links || router.links.length === 0) return 0;

    return router.links.reduce((total, link) => {
      if (link.bandwidth) {
        const bandwidthMatch = link.bandwidth.match(/(\d+(\.\d+)?)/);
        if (bandwidthMatch) {
          return total + parseFloat(bandwidthMatch[0]);
        }
      }
      return total;
    }, 0);
  };

  const columns: TableColumn<Hub>[] = [
    {
      id: 'name',
      label: 'Name',
      sortable: true,
      sortKey: 'name',
      render: (router) => (
        <div>
          <button
            onClick={() => navigate(`/hubs/${router.id}`)}
            className="text-figma-base font-medium text-fw-link hover:text-fw-linkHover hover:underline text-left"
          >
            {router.name}
          </button>
          {router.description && (
            <div className="text-figma-sm text-fw-bodyLight truncate mt-0.5">{router.description}</div>
          )}
        </div>
      ),
      csvRender: (router) => router.name
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      sortKey: 'status',
      render: (router) => (
        <span className={`px-2.5 py-0.5 inline-flex text-figma-sm leading-5 font-medium rounded-lg ${
          router.status === 'active' ? 'bg-fw-successLight text-fw-success' :
          router.status === 'inactive' ? 'bg-fw-neutral text-fw-body' :
          router.status === 'provisioning' ? 'bg-fw-accent text-fw-linkHover' :
          'bg-fw-errorLight text-fw-error'
        }`}>
          {router.status.charAt(0).toUpperCase() + router.status.slice(1)}
        </span>
      ),
      csvRender: (router) => router.status.charAt(0).toUpperCase() + router.status.slice(1)
    },
    {
      id: 'location',
      label: 'Location',
      sortable: true,
      sortKey: 'location',
      render: (router) => (
        <div className="flex items-center text-figma-base text-fw-body">
          <MapPin className="h-3.5 w-3.5 text-fw-bodyLight mr-1" />
          <span className="truncate">{router.location}</span>
        </div>
      ),
      csvRender: (router) => router.location
    },
    {
      id: 'connections',
      label: 'Connections',
      render: (router) => <span className="text-figma-base text-fw-body tabular-nums">{connsFor(router).length}</span>,
      csvRender: (router) => String(connsFor(router).length)
    },
    {
      id: 'utilization',
      label: 'Peak Util',
      render: (router) => {
        const conns = connsFor(router);
        return <UtilizationMeter pct={getHubPeakUtilization(conns)} title={`Peak ${getHubPeakUtilization(conns)}% · avg ${getHubUtilization(conns)}%`} />;
      },
      csvRender: (router) => `${getHubPeakUtilization(connsFor(router))}%`
    },
    {
      id: 'sla',
      label: 'SLA (mo)',
      render: (router) => <SlaBadge value={getHubSla(connsFor(router))} />,
      csvRender: (router) => getHubSla(connsFor(router))
    },
    {
      id: 'resources',
      label: 'Links',
      render: (router) => (
        <div className="flex items-center text-figma-base text-fw-body">
          <Network className="h-3.5 w-3.5 text-fw-bodyLight mr-1" />
          <span>{router.links?.length || 0}</span>
        </div>
      ),
      csvRender: (router) => String(router.links?.length || 0)
    }
  ];

  return (
    <EnhancedTable
        data={hubs}
        columns={columns}
        keyExtractor={(router) => router.id}
        emptyMessage="No hubs configured"
        pageSize={50}
        showPagination={hubs.length > 50}
        stickyHeader={true}
        showExport={false}
        tableId="hub"
        showColumnManager={true}
        rowActions={(router) => (
          <OverflowMenu
            items={[
              {
                id: 'view',
                label: 'View Details',
                icon: <Eye className="h-4 w-4" />,
                onClick: () => onEdit(router)
              },
              {
                id: 'edit',
                label: 'Edit Hub',
                icon: <Edit2 className="h-4 w-4" />,
                onClick: () => onEdit(router)
              },
              {
                id: 'delete',
                label: 'Delete Hub',
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => onDelete(router),
                variant: 'danger'
              }
            ]}
            isOpen={activeOverflow === router.id}
            onOpenChange={(isOpen) => {
              setActiveOverflow(isOpen ? router.id : null);
            }}
          />
        )}
      />
  );
}
