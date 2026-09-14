import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { VNFTable } from './VNFTable';
import { VNF, VNFType } from '../../../types/vnf';
import { Hub } from '../../../types/hub';
import { VNFModal } from '../modals/VNFModal';
import { DeleteVNFModal } from '../modals/DeleteVNFModal';

interface DetachedVNFTableProps {
  connectionId?: string;
}

export function DetachedVNFTable({ connectionId: initialConnectionId }: DetachedVNFTableProps) {
  const { windowId, connectionId: routeConnectionId } = useParams<{ windowId: string; connectionId: string }>();
  const connectionId = initialConnectionId || routeConnectionId;

  // Initialize with mock data for immediate display
  const [vnfs, setVnfs] = useState<VNF[]>([
    {
      id: 'vnf-1',
      name: 'Edge Firewall',
      type: 'firewall',
      vendor: 'Palo Alto Networks',
      model: 'VM-Series',
      version: '10.2.3',
      status: 'active',
      throughput: '5 Gbps',
      hubId: 'cr-1',
      licenseExpiry: '2025-06-30T00:00:00Z',
      configuration: {
        interfaces: [
          { id: 'if-1', name: 'WAN1', type: 'wan', ipAddress: '203.0.113.10', subnetMask: '255.255.255.0', status: 'up' },
          { id: 'if-2', name: 'LAN1', type: 'lan', ipAddress: '10.0.0.1', subnetMask: '255.255.255.0', status: 'up' }
        ],
        routingProtocols: ['BGP', 'OSPF'],
        highAvailability: true,
        managementIP: '192.168.1.10'
      },
      createdAt: '2024-01-10T12:00:00Z',
      updatedAt: '2024-03-15T09:30:00Z',
      description: 'Primary edge firewall for cloud connectivity',
      connectionId: connectionId || ''
    },
    {
      id: 'vnf-2',
      name: 'Branch SD-WAN',
      type: 'sdwan',
      vendor: 'Versa Networks',
      model: 'FlexVNF',
      version: '21.1.2',
      status: 'active',
      throughput: '2 Gbps',
      hubId: 'cr-1',
      configuration: {
        interfaces: [
          { id: 'if-1', name: 'WAN1', type: 'wan', ipAddress: '203.0.113.20', subnetMask: '255.255.255.0', status: 'up' },
          { id: 'if-2', name: 'WAN2', type: 'wan', ipAddress: '198.51.100.20', subnetMask: '255.255.255.0', status: 'up' }
        ],
        routingProtocols: ['BGP'],
        highAvailability: false,
        managementIP: '192.168.1.20'
      },
      createdAt: '2024-01-15T14:30:00Z',
      updatedAt: '2024-02-20T10:15:00Z',
      description: 'SD-WAN for branch office connectivity',
      connectionId: connectionId || ''
    },
    {
      id: 'vnf-3',
      name: 'Data Center Router',
      type: 'router',
      vendor: 'Cisco',
      model: 'CSR 1000V',
      version: '17.3.1',
      status: 'active',
      throughput: '10 Gbps',
      hubId: 'cr-2',
      configuration: {
        interfaces: [
          { id: 'if-1', name: 'GigE0/0', type: 'wan', ipAddress: '203.0.113.30', subnetMask: '255.255.255.0', status: 'up' },
          { id: 'if-2', name: 'GigE0/1', type: 'lan', ipAddress: '10.10.0.1', subnetMask: '255.255.255.0', status: 'up' }
        ],
        routingProtocols: ['BGP', 'OSPF', 'EIGRP'],
        highAvailability: true,
        managementIP: '192.168.1.30'
      },
      createdAt: '2024-01-20T08:00:00Z',
      updatedAt: '2024-03-10T11:20:00Z',
      description: 'Core routing for data center connectivity',
      connectionId: connectionId || ''
    },
    {
      id: 'vnf-4',
      name: 'DMZ Firewall',
      type: 'firewall',
      vendor: 'Fortinet',
      model: 'FortiGate-VM',
      version: '7.2.1',
      status: 'active',
      throughput: '3 Gbps',
      hubId: 'cr-1',
      licenseExpiry: '2025-12-31T00:00:00Z',
      configuration: {
        interfaces: [
          { id: 'if-1', name: 'port1', type: 'wan', ipAddress: '203.0.113.40', subnetMask: '255.255.255.0', status: 'up' },
          { id: 'if-2', name: 'port2', type: 'dmz', ipAddress: '172.16.0.1', subnetMask: '255.255.255.0', status: 'up' }
        ],
        routingProtocols: ['Static'],
        highAvailability: true,
        managementIP: '192.168.1.40'
      },
      createdAt: '2024-02-01T10:30:00Z',
      updatedAt: '2024-03-12T14:45:00Z',
      description: 'DMZ protection and segmentation',
      connectionId: connectionId || ''
    },
    {
      id: 'vnf-5',
      name: 'Regional SD-WAN Hub',
      type: 'sdwan',
      vendor: 'VMware',
      model: 'SD-WAN Edge',
      version: '4.5.0',
      status: 'provisioning',
      throughput: '5 Gbps',
      hubId: 'cr-2',
      configuration: {
        interfaces: [
          { id: 'if-1', name: 'ge1', type: 'wan', ipAddress: '203.0.113.50', subnetMask: '255.255.255.0', status: 'up' },
          { id: 'if-2', name: 'ge2', type: 'wan', ipAddress: '198.51.100.50', subnetMask: '255.255.255.0', status: 'up' }
        ],
        routingProtocols: ['BGP'],
        highAvailability: true,
        managementIP: '192.168.1.50'
      },
      createdAt: '2024-03-01T09:00:00Z',
      updatedAt: '2024-03-15T16:30:00Z',
      description: 'Regional hub for SD-WAN orchestration',
      connectionId: connectionId || ''
    },
    {
      id: 'vnf-6',
      name: 'Cloud NAT Hub',
      type: 'vnat',
      vendor: 'Generic',
      model: 'Virtual NAT',
      version: '2.1.0',
      status: 'active',
      throughput: '1 Gbps',
      hubId: 'cr-1',
      configuration: {
        interfaces: [
          { id: 'if-1', name: 'eth0', type: 'wan', ipAddress: '203.0.113.60', subnetMask: '255.255.255.0', status: 'up' },
          { id: 'if-2', name: 'eth1', type: 'lan', ipAddress: '10.20.0.1', subnetMask: '255.255.255.0', status: 'up' }
        ],
        routingProtocols: ['Static'],
        highAvailability: false,
        managementIP: '192.168.1.60'
      },
      createdAt: '2024-02-15T13:00:00Z',
      updatedAt: '2024-03-08T10:00:00Z',
      description: 'NAT hub for cloud services',
      connectionId: connectionId || ''
    },
    {
      id: 'vnf-7',
      name: 'Backup Router',
      type: 'router',
      vendor: 'Juniper',
      model: 'vSRX',
      version: '20.4R2',
      status: 'inactive',
      throughput: '5 Gbps',
      configuration: {
        interfaces: [
          { id: 'if-1', name: 'ge-0/0/0', type: 'wan', ipAddress: '203.0.113.70', subnetMask: '255.255.255.0', status: 'down' },
          { id: 'if-2', name: 'ge-0/0/1', type: 'lan', ipAddress: '10.30.0.1', subnetMask: '255.255.255.0', status: 'down' }
        ],
        routingProtocols: ['BGP', 'OSPF'],
        highAvailability: false,
        managementIP: '192.168.1.70'
      },
      createdAt: '2024-01-25T11:00:00Z',
      updatedAt: '2024-02-28T15:00:00Z',
      description: 'Standby router for failover scenarios',
      connectionId: connectionId || ''
    },
    {
      id: 'vnf-8',
      name: 'Web Application Firewall',
      type: 'firewall',
      vendor: 'F5 Networks',
      model: 'BIG-IP Virtual',
      version: '16.1.2',
      status: 'active',
      throughput: '4 Gbps',
      hubId: 'cr-2',
      licenseExpiry: '2025-09-30T00:00:00Z',
      configuration: {
        interfaces: [
          { id: 'if-1', name: '1.1', type: 'wan', ipAddress: '203.0.113.80', subnetMask: '255.255.255.0', status: 'up' },
          { id: 'if-2', name: '1.2', type: 'lan', ipAddress: '10.40.0.1', subnetMask: '255.255.255.0', status: 'up' }
        ],
        routingProtocols: ['Static'],
        highAvailability: true,
        managementIP: '192.168.1.80'
      },
      createdAt: '2024-02-10T14:30:00Z',
      updatedAt: '2024-03-14T12:15:00Z',
      description: 'Application-layer security and load balancing',
      connectionId: connectionId || ''
    }
  ]);

  const [hubs, setHubs] = useState<Hub[]>([
    {
      id: 'cr-1',
      name: 'Primary Hub',
      description: 'Main hub for US-East region',
      status: 'active',
      location: 'US-East',
      links: [],
      policies: {
        routingPolicy: 'default',
        securityPolicy: 'standard',
        qosPolicy: 'standard'
      },
      connectionId: connectionId || '',
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-03-15T00:00:00Z'
    },
    {
      id: 'cr-2',
      name: 'Secondary Hub',
      description: 'Backup router for redundancy',
      status: 'active',
      location: 'US-West',
      links: [],
      policies: {
        routingPolicy: 'default',
        securityPolicy: 'standard',
        qosPolicy: 'standard'
      },
      connectionId: connectionId || '',
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-03-12T00:00:00Z'
    }
  ]);

  const [editingVNF, setEditingVNF] = useState<VNF | undefined>();
  const [deletingVNF, setDeletingVNF] = useState<VNF | undefined>();
  const [showAddVNFModal, setShowAddVNFModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [vnfTypeFilter, setVnfTypeFilter] = useState<VNFType | 'all'>('all');

  // Listen for data updates from parent window via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('vnf-sync');

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'VNF_UPDATED':
          setVnfs(payload.vnfs);
          break;
        case 'HUBS_UPDATED':
          setHubs(payload.hubs);
          break;
        case 'FULL_SYNC':
          setVnfs(payload.vnfs || []);
          setHubs(payload.hubs || []);
          break;
      }
    };

    channel.addEventListener('message', handleMessage);

    // Request initial data from parent
    channel.postMessage({ type: 'REQUEST_SYNC', windowId });

    return () => {
      // Notify parent that this window is closing
      channel.postMessage({ type: 'DETACHED_CLOSED', windowId });
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [windowId]);

  // Sync changes back to parent window
  const syncToParent = (updatedVnfs: VNF[]) => {
    const channel = new BroadcastChannel('vnf-sync');
    channel.postMessage({
      type: 'VNF_UPDATED_FROM_DETACHED',
      payload: { vnfs: updatedVnfs },
      windowId
    });
    channel.close();
  };

  const handleEditVNF = (vnf: VNF) => {
    setEditingVNF(vnf);
    setShowAddVNFModal(true);
  };

  const handleDeleteVNF = (vnf: VNF) => {
    setDeletingVNF(vnf);
  };

  const handleSaveVNF = (vnfData: VNF) => {
    let updatedVnfs: VNF[];
    if (editingVNF) {
      updatedVnfs = vnfs.map((v) => (v.id === vnfData.id ? vnfData : v));
    } else {
      updatedVnfs = [...vnfs, vnfData];
    }

    setVnfs(updatedVnfs);
    syncToParent(updatedVnfs);
    setShowAddVNFModal(false);
    setEditingVNF(undefined);

    window.addToast?.({
      type: 'success',
      title: editingVNF ? 'VNF Updated' : 'VNF Created',
      message: `${vnfData.name} has been ${editingVNF ? 'updated' : 'created'} successfully.`,
      duration: 3000
    });
  };

  const handleConfirmDeleteVNF = () => {
    if (deletingVNF) {
      const updatedVnfs = vnfs.filter((v) => v.id !== deletingVNF.id);
      setVnfs(updatedVnfs);
      syncToParent(updatedVnfs);

      window.addToast?.({
        type: 'success',
        title: 'VNF Deleted',
        message: `${deletingVNF.name} has been deleted successfully.`,
        duration: 3000
      });
      setDeletingVNF(undefined);
    }
  };

  const getAllLinks = () => {
    return hubs.flatMap((router) => router.links || []);
  };

  // Filter VNFs by search query and type
  const filteredVnfs = vnfs.filter(vnf => {
    const matchesType = vnfTypeFilter === 'all' || vnf.type === vnfTypeFilter;

    if (!searchQuery) return matchesType;

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = (
      vnf.name.toLowerCase().includes(searchLower) ||
      vnf.vendor?.toLowerCase().includes(searchLower) ||
      vnf.type.toLowerCase().includes(searchLower)
    );

    return matchesType && matchesSearch;
  });

  const handleExportCSV = () => {
    const getTypeName = (type: VNFType) => {
      switch(type) {
        case 'firewall': return 'Firewall';
        case 'sdwan': return 'SD-WAN';
        case 'router': return 'Router';
        case 'vnat': return 'NAT';
        case 'custom': return 'Custom';
        default: return type.toUpperCase();
      }
    };
    const headers = ['Name', 'Type', 'Status'].join(',');
    const rows = filteredVnfs.map(vnf =>
      `"${vnf.name}","${getTypeName(vnf.type)}","${vnf.status.charAt(0).toUpperCase() + vnf.status.slice(1)}"`
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'network-functions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col bg-fw-base overflow-hidden m-0 p-0">
      {/* Search Bar and Actions - Fixed at top */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-fw-secondary">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search VNFs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 h-9 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-active focus:border-fw-active text-figma-base w-full"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fw-bodyLight h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={vnfTypeFilter}
              onChange={(e) => setVnfTypeFilter(e.target.value as VNFType | 'all')}
              className="px-4 h-10 text-figma-base font-medium text-fw-body bg-fw-base border border-fw-secondary rounded-lg hover:bg-fw-wash focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fw-active"
            >
              <option value="all">All Types</option>
              <option value="firewall">Firewall</option>
              <option value="sdwan">SD-WAN</option>
              <option value="router">Router</option>
              <option value="vnat">NAT</option>
              <option value="custom">Custom</option>
            </select>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center px-4 h-10 text-figma-base font-medium text-fw-body bg-fw-base border border-fw-secondary rounded-lg hover:bg-fw-wash focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fw-active"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Table - Takes remaining space */}
      <div className="flex-1 overflow-auto">
        <VNFTable
          vnfs={filteredVnfs}
          hubs={hubs}
          onEdit={handleEditVNF}
          onDelete={handleDeleteVNF}
        />
      </div>

      {/* Modals */}
      <VNFModal
        isOpen={showAddVNFModal}
        onClose={() => {
          setShowAddVNFModal(false);
          setEditingVNF(undefined);
        }}
        onSave={handleSaveVNF}
        vnf={editingVNF}
        connectionId={connectionId || ''}
        links={getAllLinks()}
      />

      <DeleteVNFModal
        isOpen={!!deletingVNF}
        onClose={() => setDeletingVNF(undefined)}
        onConfirm={handleConfirmDeleteVNF}
        vnfName={deletingVNF?.name || ''}
      />
    </div>
  );
}
