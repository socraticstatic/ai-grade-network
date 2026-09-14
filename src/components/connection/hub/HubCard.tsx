import { useState } from 'react';
import { Network, Settings, ChevronDown, ChevronUp, Edit2, Trash2, Plus, Shield, ServerCog } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { Hub } from '../../../types/hub';
import { OverflowMenu } from '../../common/OverflowMenu';
import { Link } from '../../../types/connection';
import { VLANModal as LinkModal } from '../modals/VLANModal';
import { DeleteLinkModal } from '../modals/DeleteVLANModal';
import { VNF } from '../../../types/vnf';
import { VLANTable } from '../vlan/VLANTable';

interface HubCardProps {
  hub: Hub;
  vnfs?: VNF[]; // VNFs associated with this hub
  onEdit: () => void;
  onDelete: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  connectionBandwidth?: string; // Total connection bandwidth
  usedBandwidth?: number; // Total used bandwidth across all routers
}

export function HubCard({
  hub,
  vnfs = [],
  onEdit,
  onDelete,
  isExpanded = true, // Default to expanded
  onToggleExpand,
  connectionBandwidth = '10 Gbps',
  usedBandwidth = 0
}: HubCardProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | undefined>();
  const [deletingLink, setDeletingLink] = useState<Link | undefined>();
  const [links, setLinks] = useState<Link[]>(hub.links || []);

  // Filter VNFs that belong to this hub
  const associatedVNFs = vnfs.filter(vnf => vnf.hubIds?.includes(hub.id) ?? false);

  // Calculate bandwidth used by this router's links
  const routerBandwidthUsed = links.reduce((total, link) => {
    // Extract numeric value from VLAN bandwidth if available
    const linkBandwidth = link.bandwidth ? parseFloat(link.bandwidth.replace(/[^\d.]/g, '')) : 0;
    return total + linkBandwidth;
  }, 0);

  // Parse connection bandwidth to a number
  const totalBandwidth = parseFloat(connectionBandwidth.replace(/[^\d.]/g, ''));

  // Calculate available bandwidth (total - used across all routers)
  const availableBandwidth = Math.max(0, totalBandwidth - usedBandwidth);

  // Get VNF type icon
  const getVnfIcon = (type: string) => {
    switch(type) {
      case 'firewall': return <Shield className="h-4 w-4 text-fw-link" />;
      case 'sdwan': return <Network className="h-4 w-4 text-fw-purple" />;
      case 'router': return <ServerCog className="h-4 w-4 text-fw-link" />;
      case 'vnat': return <Network className="h-4 w-4 text-fw-success" />;
      default: return <ServerCog className="h-4 w-4 text-fw-bodyLight" />;
    }
  };

  const handleAddLink = () => {
    setShowLinkModal(true);
  };

  const handleEditLink = (link: Link) => {
    setEditingLink(link);
    setShowLinkModal(true);
  };

  const handleDeleteLink = (link: Link) => {
    setDeletingLink(link);
  };

  const handleSaveLink = (linkData: Partial<Link>) => {
    if (editingLink) {
      // Update existing link
      const updatedLinks = links.map(link =>
        link.id === editingLink.id ? { ...link, ...linkData } as Link : link
      );
      setLinks(updatedLinks);

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
        id: `link-${Date.now()}`,
        createdAt: new Date().toISOString(),
        status: 'active'
      } as Link;

      setLinks([...links, newLink]);

      window.addToast({
        type: 'success',
        title: 'Link Created',
        message: `Link ${newLink.name} has been created successfully`,
        duration: 3000
      });
    }

    setEditingLink(undefined);
    setShowLinkModal(false);
  };

  const handleConfirmDeleteLink = () => {
    if (deletingLink) {
      setLinks(links.filter(link => link.id !== deletingLink.id));

      window.addToast({
        type: 'success',
        title: 'Link Deleted',
        message: `Link ${deletingLink.name} has been deleted successfully`,
        duration: 3000
      });

      setDeletingLink(undefined);
    }
  };

  return (
    <div className="bg-fw-base rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-fw-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 flex items-center justify-center bg-fw-link rounded-lg mr-3">
              <AttIcon name="hub" className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-figma-lg font-medium text-fw-heading">{hub.name}</h3>
              <p className="text-figma-sm text-fw-bodyLight">{hub.description}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggleExpand}
              className="p-1.5 text-fw-bodyLight hover:text-fw-body hover:bg-fw-neutral rounded-full"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <OverflowMenu
              items={[
                {
                  id: 'edit',
                  label: 'Edit Hub',
                  icon: <Edit2 className="h-4 w-4" />,
                  onClick: onEdit
                },
                {
                  id: 'delete',
                  label: 'Delete Hub',
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: onDelete,
                  variant: 'danger'
                }
              ]}
            />
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-3 flex items-center justify-between">
          <span className={`inline-flex items-center px-2 py-1 rounded-lg text-figma-sm font-medium uppercase ${
            hub.status === 'active' ? 'bg-fw-successLight text-fw-success' :
            hub.status === 'inactive' ? 'bg-fw-secondary text-fw-disabled' :
            hub.status === 'provisioning' ? 'bg-fw-accent text-fw-link' :
            'bg-fw-errorLight text-fw-error'
          }`}>
            {hub.status.charAt(0).toUpperCase() + hub.status.slice(1)}
          </span>
          <div className="flex space-x-3 text-figma-sm text-fw-bodyLight">
            <span>Available Bandwidth: {availableBandwidth.toFixed(1)} Gbps</span>
            <span className="border-l border-fw-secondary pl-3">Used: {routerBandwidthUsed.toFixed(1)} Gbps</span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4">
          {/* VNFs Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.04em] flex items-center">
                <Shield className="h-4 w-4 text-fw-bodyLight mr-1.5" />
                VNFs
              </h4>
            </div>

            {associatedVNFs.length > 0 ? (
              <div className="space-y-2">
                {associatedVNFs.map(vnf => (
                  <div key={vnf.id} className="flex items-center justify-between p-2 bg-fw-wash rounded-2xl border border-fw-secondary">
                    <div className="flex items-center">
                      {getVnfIcon(vnf.type)}
                      <div className="ml-2">
                        <div className="text-figma-base font-medium text-fw-heading">{vnf.name}</div>
                        <div className="text-figma-sm text-fw-bodyLight">
                          {vnf.vendor} {vnf.model} • {vnf.throughput || 'Standard Throughput'}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-figma-sm rounded-lg ${
                      vnf.status === 'active' ? 'bg-fw-successLight text-fw-success' :
                      vnf.status === 'inactive' ? 'bg-fw-neutral text-fw-body' :
                      'bg-fw-accent text-fw-linkHover'
                    }`}>
                      {vnf.status.charAt(0).toUpperCase() + vnf.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 bg-fw-wash rounded-lg">
                <p className="text-figma-base text-fw-bodyLight">No VNFs attached to this hub</p>
              </div>
            )}
          </div>

          {/* VLANs Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.04em] flex items-center">
                <Network className="h-4 w-4 text-fw-bodyLight mr-1.5" />
                Virtual Links (VLANs)
              </h4>
              <button
                onClick={handleAddLink}
                className="inline-flex items-center px-3 py-1.5 text-figma-base font-medium text-white bg-brand-blue rounded-full hover:bg-brand-darkBlue transition-colors"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add VLAN
              </button>
            </div>

            <VLANTable
              vlans={links}
              cloudRouterName={hub.name}
              onEdit={handleEditLink}
              onDelete={handleDeleteLink}
            />
          </div>

          {/* Policies Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.04em] flex items-center">
                <Settings className="h-4 w-4 text-fw-bodyLight mr-1.5" />
                Policies
              </h4>
            </div>

            {hub.policies ? (
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(hub.policies).map(([key, value]) => (
                  <div key={key} className="p-2 bg-fw-wash rounded-2xl border border-fw-secondary">
                    <div className="text-figma-sm text-fw-bodyLight capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="text-figma-base font-medium text-fw-heading capitalize">{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 bg-fw-wash rounded-lg">
                <p className="text-figma-base text-fw-bodyLight">No policies configured</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Link Modals */}
      <LinkModal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setEditingLink(undefined);
        }}
        onSave={handleSaveLink}
        vlan={editingLink}
        connectionId={hub.connectionIds?.[0] ?? ''}
        availableBandwidth={availableBandwidth}
        hubs={[{ id: hub.id, name: hub.name }]}
        selectedHubId={hub.id}
      />

      {/* Delete Link Confirmation Modal */}
      {deletingLink && (
        <DeleteLinkModal
          isOpen={!!deletingLink}
          onClose={() => setDeletingLink(undefined)}
          onConfirm={handleConfirmDeleteLink}
          linkName={deletingLink.name}
          linkId={deletingLink.vlanId}
        />
      )}
    </div>
  );
}
