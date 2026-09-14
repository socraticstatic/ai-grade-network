import { useState } from 'react';
import { Plus, Filter, Download, Activity, Shield } from 'lucide-react';
import { Button } from '../../../common/Button';
import { Group } from '../../../../types/group';
import { Connection } from '../../../../types';
import { VNFSection } from '../../../connection/vnf/VNFSection';
import { LinkSection } from '../../../connection/links/LinkSection';
import { VNF } from '../../../../types/vnf';
import { VNFModal } from '../../../connection/modals/VNFModal';
import { DeleteLinkModal } from '../../../connection/modals/DeleteVLANModal';

interface GroupNetworkTabProps {
  group: Group;
  connections: Connection[];
}

export function GroupNetworkTab({ group, connections }: GroupNetworkTabProps) {
  // Active tab state (VNFs or Links)
  const [activeTabSection, setActiveTabSection] = useState<'vnfs' | 'links'>('vnfs');
  
  // VNF state for the modal
  const [showAddVNFModal, setShowAddVNFModal] = useState(false);
  const [editingVNF, setEditingVNF] = useState<VNF | undefined>();
  const [deletingVNF, setDeletingVNF] = useState<VNF | undefined>();

  // Sample VNF data
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
      licenseExpiry: '2025-06-30T00:00:00Z',
      configuration: {
        interfaces: [
          { 
            id: 'if-1', 
            name: 'WAN1', 
            type: 'wan', 
            ipAddress: '203.0.113.10', 
            subnetMask: '255.255.255.0', 
            status: 'up' 
          },
          { 
            id: 'if-2', 
            name: 'LAN1', 
            type: 'lan', 
            ipAddress: '10.0.0.1', 
            subnetMask: '255.255.255.0', 
            status: 'up' 
          }
        ],
        routingProtocols: ['BGP', 'OSPF'],
        highAvailability: true,
        managementIP: '192.168.1.10'
      },
      createdAt: '2024-01-10T12:00:00Z',
      updatedAt: '2024-03-15T09:30:00Z',
      description: 'Primary edge firewall for cloud connectivity',
      connectionId: connections[0]?.id.toString() || 'conn-001'
    }
  ]);

  // VNF handlers
  const handleAddVNF = () => {
    setShowAddVNFModal(true);
  };

  const handleEditVNF = (vnf: VNF) => {
    setEditingVNF(vnf);
  };

  const handleDeleteVNF = (vnf: VNF) => {
    setDeletingVNF(vnf);
  };

  const handleSaveVNF = (vnfData: VNF) => {
    if (editingVNF) {
      // Update existing VNF
      setVnfs(vnfs.map(v => v.id === editingVNF.id ? vnfData : v));
      
      window.addToast({
        type: 'success',
        title: 'VNF Updated',
        message: `VNF ${vnfData.name} has been updated successfully`,
        duration: 3000
      });
    } else {
      // Add new VNF with generated ID and timestamps
      const newVnf: VNF = {
        ...vnfData,
        id: `vnf-${Date.now()}`,
        createdAt: new Date().toISOString(),
        connectionId: connections[0]?.id.toString() || 'conn-001'
      };
      
      setVnfs([...vnfs, newVnf]);
      
      window.addToast({
        type: 'success',
        title: 'VNF Created',
        message: `VNF ${newVnf.name} has been created successfully`,
        duration: 3000
      });
    }
    
    setEditingVNF(undefined);
    setShowAddVNFModal(false);
  };

  const handleConfirmDeleteVNF = () => {
    if (deletingVNF) {
      setVnfs(vnfs.filter(v => v.id !== deletingVNF.id));
      
      window.addToast({
        type: 'success',
        title: 'VNF Deleted',
        message: `VNF ${deletingVNF.name} has been deleted successfully`,
        duration: 3000
      });
      
      setDeletingVNF(undefined);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Section Tabs */}
      <div className="flex space-x-1 bg-fw-neutral rounded-lg p-1 mb-6 max-w-xs">
        <button
          onClick={() => setActiveTabSection('vnfs')}
          className={`flex items-center flex-1 justify-center py-2 px-3 rounded-md text-figma-base font-medium ${
            activeTabSection === 'vnfs'
              ? 'bg-fw-base text-fw-heading shadow-sm'
              : 'text-fw-bodyLight hover:text-fw-body'
          }`}
        >
          <Shield className="h-4 w-4 mr-1.5" />
          VNF Functions
          <span className="relative ml-1 group">
            <span className="cursor-help text-figma-sm text-fw-bodyLight">i</span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-fw-gray-900 text-white text-figma-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              VNF (Virtual Network Function): Software-based network services that run on virtualized infrastructure, replacing traditional hardware appliances.
            </div>
          </span>
        </button>
        <button
          onClick={() => setActiveTabSection('links')}
          className={`flex items-center flex-1 justify-center py-2 px-3 rounded-md text-figma-base font-medium ${
            activeTabSection === 'links'
              ? 'bg-fw-base text-fw-heading shadow-sm'
              : 'text-fw-bodyLight hover:text-fw-body'
          }`}
        >
          <Activity className="h-4 w-4 mr-1.5" />
          Links
          <span className="relative ml-1 group">
            <span className="cursor-help text-figma-sm text-fw-bodyLight">i</span>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-fw-gray-900 text-white text-figma-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              Virtual Link: A logical network segment that allows devices to communicate as if they were on the same physical network, even when they are on different physical segments.
            </div>
          </span>
        </button>
      </div>

      {/* VNF Section */}
      {activeTabSection === 'vnfs' && (
        <VNFSection 
          vnfs={vnfs} 
          onAdd={handleAddVNF} 
          onEdit={handleEditVNF} 
          onDelete={handleDeleteVNF}
          connectionId={connections[0]?.id.toString() || 'conn-001'}
        />
      )}

      {/* Links Section */}
      {activeTabSection === 'links' && (
        <LinkSection 
          connection={connections[0] || {id: 'conn-001'}}
          isEditing={false}
        />
      )}

      {/* VNF Modals */}
      <VNFModal
        isOpen={showAddVNFModal || !!editingVNF}
        onClose={() => {
          setShowAddVNFModal(false);
          setEditingVNF(undefined);
        }}
        onSave={handleSaveVNF}
        vnf={editingVNF}
        connectionId={connections[0]?.id.toString() || 'conn-001'}
        links={[]}
      />

      {/* Delete VNF Confirmation Modal */}
      {deletingVNF && (
        <DeleteVNFModal
          isOpen={!!deletingVNF}
          onClose={() => setDeletingVNF(undefined)}
          onConfirm={handleConfirmDeleteVNF}
          vnfName={deletingVNF.name}
          vnfType={deletingVNF.type}
        />
      )}
    </div>
  );
}

// Import missing components
import { DeleteVNFModal } from '../../../connection/modals/DeleteVNFModal';