import { useState, useEffect } from 'react';
import { Tag, AlertTriangle, Plus, CheckCircle, HelpCircle, Info, X, Route, Network } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { Button } from '../../common/Button';
import { FormField } from '../../form/FormField';
import { SideDrawer } from '../../common/SideDrawer';

export interface VLAN {
  id: string;
  name: string;
  vlanId: number;
  status: 'active' | 'inactive';
  description?: string;
  tags?: string[];
  ipSubnet?: string;
  mtu?: number;
  qosPriority?: number;
  type?: 'data' | 'voice' | 'management' | 'storage' | 'guest' | 'dmz' | 'other' | 'application';
  hubIds: string[];
  createdAt: string;
  updatedAt?: string;
  bandwidth?: string; // Added bandwidth field
}

interface Link extends VLAN {
  // Link is essentially the same as VLAN with potentially additional properties
  linkId?: number; // Some implementations might use linkId instead of vlanId
  bandwidth?: string; // Bandwidth allocation for this link
}

interface VLANModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vlan: Partial<VLAN>) => void;
  vlan?: VLAN; // If provided, we're in edit mode
  connectionId: string;
  availableBandwidth?: number; // Available bandwidth in Gbps
  hubs: Array<{ id: string; name: string }>;
  selectedHubId?: string;
}

export function VLANModal({
  isOpen,
  onClose,
  onSave,
  vlan,
  connectionId,
  availableBandwidth = 10,
  hubs,
  selectedHubId
}: VLANModalProps) {
  const isEditMode = !!vlan;

  // Form state
  const [name, setName] = useState('');
  const [vlanId, setVlanId] = useState<number | ''>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [ipSubnet, setIpSubnet] = useState('');
  const [mtu, setMtu] = useState<number>(1500);
  const [qosPriority, setQosPriority] = useState<number>(0);
  const [trafficType, setTrafficType] = useState<VLAN['type']>('data');
  const [linkType, setLinkType] = useState<'Layer 1' | 'Layer 2' | 'Layer 3'>('Layer 3');
  const [bandwidth, setBandwidth] = useState<string>('1');
  const [hubIds, setHubIds] = useState<string[]>(selectedHubId ? [selectedHubId] : []);

  // Routing state
  const [routingProtocol, setRoutingProtocol] = useState<'bgp' | 'static' | 'none'>('bgp');
  const [localAsn, setLocalAsn] = useState<string>('');
  const [remoteAsn, setRemoteAsn] = useState<string>('');
  const [bgpPassword, setBgpPassword] = useState<string>('');
  const [staticRoutes, setStaticRoutes] = useState<Array<{destination: string, nextHop: string}>>([]);
  const [newRouteDestination, setNewRouteDestination] = useState('');
  const [newRouteNextHop, setNewRouteNextHop] = useState('');
  const [routeFilters, setRouteFilters] = useState<Array<{prefix: string, action: 'permit' | 'deny'}>>([]);
  const [newFilterPrefix, setNewFilterPrefix] = useState('');
  const [newFilterAction, setNewFilterAction] = useState<'permit' | 'deny'>('permit');
  const [bfdEnabled, setBfdEnabled] = useState(false);
  const [bfdInterval, setBfdInterval] = useState<number>(300);
  const [bfdMultiplier, setBfdMultiplier] = useState<number>(3);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Populate form fields in edit mode
  useEffect(() => {
    if (vlan) {
      setName(vlan.name);
      setVlanId(vlan.vlanId);
      setStatus(vlan.status);
      setDescription(vlan.description || '');
      setTags(vlan.tags || []);
      setIpSubnet(vlan.ipSubnet || '');
      setMtu(vlan.mtu || 1500);
      setQosPriority(vlan.qosPriority || 0);
      setTrafficType(vlan.type || 'data');
      setHubIds(vlan.hubIds || []);
      // Set bandwidth if available, otherwise default to 1
      setBandwidth(vlan.bandwidth ? vlan.bandwidth.replace(/[^\d.]/g, '') : '1');
      // Default to Layer 3 for existing VLANs if not specified
      setLinkType('Layer 3');
    } else {
      // Default values for new VLANs
      setName('');
      setVlanId('');
      setStatus('active');
      setDescription('');
      setTags([]);
      setIpSubnet('');
      setMtu(1500);
      setQosPriority(0);
      setTrafficType('data');
      setBandwidth('1');
      setLinkType('Layer 3');
    }
    setErrors({});
  }, [vlan, isOpen]);

  // Field validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (hubIds.length === 0) {
      newErrors.hubIds = 'At least one hub must be selected';
    }

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (vlanId === '') {
      newErrors.vlanId = 'Link ID is required';
    } else if (typeof vlanId === 'number') {
      if (vlanId < 1 || vlanId > 4094) {
        newErrors.vlanId = 'Link ID must be between 1 and 4094';
      }
    }

    if (ipSubnet && !isValidCIDR(ipSubnet)) {
      newErrors.ipSubnet = 'Enter a valid CIDR notation (e.g., 192.168.1.0/24)';
    }

    if (mtu < 1280 || mtu > 9216) {
      newErrors.mtu = 'MTU must be between 1280 and 9216';
    }

    // Validate bandwidth
    if (!bandwidth || isNaN(parseFloat(bandwidth)) || parseFloat(bandwidth) <= 0) {
      newErrors.bandwidth = 'Bandwidth must be a positive number';
    } else if (parseFloat(bandwidth) > availableBandwidth) {
      newErrors.bandwidth = `Bandwidth cannot exceed available ${availableBandwidth.toFixed(1)} Gbps`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidCIDR = (cidr: string): boolean => {
    const cidrRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;
    if (!cidrRegex.test(cidr)) {
      return false;
    }

    // Validate IP portion is valid
    const ip = cidr.split('/')[0];
    const ipParts = ip.split('.');
    for (const part of ipParts) {
      const num = parseInt(part, 10);
      if (num < 0 || num > 255) {
        return false;
      }
    }
    return true;
  };

  // Handle tag input
  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      handleAddTag();
    }
  };

  // Handle static routes
  const handleAddStaticRoute = () => {
    if (newRouteDestination.trim() && newRouteNextHop.trim()) {
      setStaticRoutes([...staticRoutes, { destination: newRouteDestination, nextHop: newRouteNextHop }]);
      setNewRouteDestination('');
      setNewRouteNextHop('');
    }
  };

  const handleRemoveStaticRoute = (index: number) => {
    setStaticRoutes(staticRoutes.filter((_, i) => i !== index));
  };

  // Handle route filters
  const handleAddRouteFilter = () => {
    if (newFilterPrefix.trim()) {
      setRouteFilters([...routeFilters, { prefix: newFilterPrefix, action: newFilterAction }]);
      setNewFilterPrefix('');
      setNewFilterAction('permit');
    }
  };

  const handleRemoveRouteFilter = (index: number) => {
    setRouteFilters(routeFilters.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // If this is a deletion confirmation, skip this step
    if (showConfirmation) {
      setShowConfirmation(false);
      return;
    }

    // Prepare data for save
    const vlanData: Partial<VLAN> = {
      name,
      vlanId: vlanId as number,
      status,
      description: description || undefined,
      tags: tags.length > 0 ? tags : undefined,
      ipSubnet: ipSubnet || undefined,
      mtu: mtu !== 1500 ? mtu : undefined,
      qosPriority: qosPriority !== 0 ? qosPriority : undefined,
      type: trafficType,
      hubIds,
      bandwidth: `${bandwidth} Gbps` // Add bandwidth to the VLAN data
    };

    // If in edit mode, retain the original ID
    if (isEditMode && vlan) {
      vlanData.id = vlan.id;
      vlanData.createdAt = vlan.createdAt;
      vlanData.updatedAt = new Date().toISOString();
    } else {
      // Generate ID for new VLANs
      vlanData.id = `vlan-${Date.now()}`;
      vlanData.createdAt = new Date().toISOString();
    }

    onSave(vlanData);
    onClose();
  };

  const drawerTitle = (
    <div className="flex items-center">
      <span>{isEditMode ? 'Edit Link' : 'Add New Link'}</span>
      {isEditMode && (
        <span className="ml-2 px-2 py-1 text-figma-sm bg-fw-accent text-fw-linkHover rounded-full">
          ID: {vlan?.vlanId}
        </span>
      )}
    </div>
  );

  const drawerFooter = (
    <div className="flex justify-end space-x-3">
      <Button
        variant="outline"
        onClick={onClose}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        type="submit"
        form="vlan-form"
      >
        {isEditMode ? 'Update Link' : 'Create Link'}
      </Button>
    </div>
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={drawerTitle as any}
      size="lg"
      footer={drawerFooter}
    >
      {/* Warning message when editing */}
      {isEditMode && (
        <div className="mb-6 bg-fw-warn/10 border border-fw-warn/30 rounded-lg p-3 flex items-start">
          <AlertTriangle className="h-5 w-5 text-fw-warn mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <p className="text-figma-base text-fw-heading font-medium">
              Warning: Editing Link Configuration
            </p>
            <p className="text-figma-base text-fw-body mt-1">
              Changes to link settings may impact network traffic. Ensure all connected systems are properly configured for the updated settings.
            </p>
          </div>
        </div>
      )}

      <div>
          <form id="vlan-form" onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Hub Association */}
              <div>
                <FormField
                  label="Hubs"
                  error={errors.hubIds}
                  required
                  helpText="Select one or more hubs this link will be associated with"
                >
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-fw-secondary rounded-md p-3">
                    {hubs.length === 0 ? (
                      <p className="text-figma-base text-fw-bodyLight">No hubs available</p>
                    ) : (
                      hubs.map(router => (
                        <label key={router.id} className="flex items-center space-x-2 cursor-pointer hover:bg-fw-wash p-2 rounded">
                          <input
                            type="checkbox"
                            checked={hubIds.includes(router.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setHubIds([...hubIds, router.id]);
                              } else {
                                setHubIds(hubIds.filter(id => id !== router.id));
                              }
                            }}
                            className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary rounded"
                          />
                          <span className="text-figma-base text-fw-body">{router.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </FormField>
              </div>

              {/* Basic VLAN Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1">
                  <FormField
                    label="Link Name"
                    error={errors.name}
                    required
                  >
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                      placeholder="e.g., Production Network"
                    />
                  </FormField>
                </div>
                
                <div className="col-span-1">
                  <FormField 
                    label="Link ID" 
                    error={errors.vlanId} 
                    required
                    helpText="Valid range: 1-4094"
                  >
                    <input
                      type="number"
                      value={vlanId}
                      onChange={(e) => setVlanId(e.target.value ? parseInt(e.target.value) : '')}
                      className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                      placeholder="1-4094"
                      min="1"
                      max="4094"
                    />
                  </FormField>
                </div>
                
                <div className="col-span-1">
                  <FormField 
                    label="Status" 
                    required
                  >
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                      className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </FormField>
                </div>
                
                <div className="col-span-1">
                  <FormField 
                    label="Traffic Type"
                  >
                    <select
                      value={trafficType}
                      onChange={(e) => setTrafficType(e.target.value as VLAN['type'])}
                      className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                    >
                      <option value="data">Data</option>
                      <option value="voice">Voice</option>
                      <option value="management">Management</option>
                      <option value="storage">Storage</option>
                      <option value="guest">Guest Network</option>
                      <option value="dmz">DMZ</option>
                      <option value="application">Application</option>
                      <option value="other">Other</option>
                    </select>
                  </FormField>
                </div>

                <div className="col-span-1">
                  <FormField 
                    label="Link Type"
                  >
                    <select
                      value={linkType}
                      onChange={(e) => setLinkType(e.target.value as 'Layer 1' | 'Layer 2' | 'Layer 3')}
                      className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                    >
                      <option value="Layer 1">Layer 1</option>
                      <option value="Layer 2">Layer 2</option>
                      <option value="Layer 3">Layer 3</option>
                    </select>
                  </FormField>
                </div>

                <div className="col-span-1">
                  <FormField 
                    label="Bandwidth (Gbps)" 
                    error={errors.bandwidth}
                    helpText={`Available: ${availableBandwidth.toFixed(1)} Gbps`}
                    required
                  >
                    <input
                      type="number"
                      value={bandwidth}
                      onChange={(e) => setBandwidth(e.target.value)}
                      className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                      placeholder="e.g., 1"
                      min="0.1"
                      max={availableBandwidth}
                      step="0.1"
                    />
                  </FormField>
                </div>
                
                <div className="col-span-2">
                  <FormField 
                    label="IP Subnet" 
                    error={errors.ipSubnet}
                    helpText="CIDR notation (e.g., 192.168.1.0/24)"
                  >
                    <input
                      type="text"
                      value={ipSubnet}
                      onChange={(e) => setIpSubnet(e.target.value)}
                      className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                      placeholder="e.g., 192.168.1.0/24"
                    />
                  </FormField>
                </div>
                
                <div className="col-span-2">
                  <FormField 
                    label="Description"
                  >
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="vlan-input w-full px-3 py-2 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                      rows={3}
                      placeholder="Enter a description for this link"
                    />
                  </FormField>
                </div>
                
                <div className="col-span-2">
                  <FormField 
                    label="Tags"
                    helpText="Add tags to categorize this link"
                  >
                    <div className="flex">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active mr-2 flex-1"
                        placeholder="Enter a tag and press Enter"
                      />
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddTag}
                        disabled={!tagInput.trim()}
                      >
                        Add
                      </Button>
                    </div>
                    
                    {/* Display tags */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {tags.map((tag, index) => (
                          <div 
                            key={index}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-figma-sm font-medium bg-fw-accent text-fw-linkHover"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1.5 text-fw-link hover:text-fw-link"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </FormField>
                </div>
              </div>

              {/* Routing Configuration Section */}
              <div className="pt-6 border-t-2 border-fw-secondary">
                <div className="flex items-center mb-4">
                  <AttIcon name="hub" className="h-6 w-6 text-fw-link mr-2" />
                  <h3 className="text-lg font-semibold text-fw-heading">Routing Configuration</h3>
                </div>

                <div className="space-y-6 bg-fw-accent border border-fw-active rounded-lg p-6">
                  {/* Routing Protocol Selection */}
                  <div>
                    <FormField label="Routing Protocol" required>
                      <select
                        value={routingProtocol}
                        onChange={(e) => setRoutingProtocol(e.target.value as 'bgp' | 'static' | 'none')}
                        className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                      >
                        <option value="bgp">BGP (Border Hub Protocol)</option>
                        <option value="static">Static Routes</option>
                        <option value="none">No Routing</option>
                      </select>
                    </FormField>
                  </div>

                  {/* BGP Configuration */}
                  {routingProtocol === 'bgp' && (
                    <div className="space-y-4 bg-fw-base p-4 rounded-lg border border-fw-active">
                      <div className="flex items-center mb-2">
                        <Network className="h-4 w-4 text-fw-link mr-2" />
                        <h4 className="text-figma-base font-semibold text-fw-heading">BGP Settings</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          label="Local ASN"
                          required
                          helpText="Your Autonomous System Number"
                        >
                          <input
                            type="text"
                            value={localAsn}
                            onChange={(e) => setLocalAsn(e.target.value)}
                            className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                            placeholder="e.g., 65001"
                          />
                        </FormField>

                        <FormField
                          label="Remote ASN"
                          required
                          helpText="Peer's Autonomous System Number"
                        >
                          <input
                            type="text"
                            value={remoteAsn}
                            onChange={(e) => setRemoteAsn(e.target.value)}
                            className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                            placeholder="e.g., 65002"
                          />
                        </FormField>

                        <FormField
                          label="BGP MD5 Password"
                          helpText="Optional authentication"
                        >
                          <input
                            type="password"
                            value={bgpPassword}
                            onChange={(e) => setBgpPassword(e.target.value)}
                            className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                            placeholder="Leave empty for no auth"
                          />
                        </FormField>

                        <div className="flex items-center">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={bfdEnabled}
                              onChange={(e) => setBfdEnabled(e.target.checked)}
                              className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary rounded"
                            />
                            <span className="ml-2 text-figma-base font-medium text-fw-body">
                              Enable BFD (Bidirectional Forwarding Detection)
                            </span>
                          </label>
                        </div>
                      </div>

                      {bfdEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-fw-wash rounded border border-fw-secondary">
                          <FormField
                            label="BFD Interval (ms)"
                            helpText="Detection interval"
                          >
                            <input
                              type="number"
                              value={bfdInterval}
                              onChange={(e) => setBfdInterval(parseInt(e.target.value))}
                              className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                              min="50"
                              max="1000"
                              step="50"
                            />
                          </FormField>

                          <FormField
                            label="BFD Multiplier"
                            helpText="Missed packets before failure"
                          >
                            <input
                              type="number"
                              value={bfdMultiplier}
                              onChange={(e) => setBfdMultiplier(parseInt(e.target.value))}
                              className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                              min="2"
                              max="10"
                              step="1"
                            />
                          </FormField>
                        </div>
                      )}

                      {/* Route Filters */}
                      <div className="mt-6">
                        <FormField
                          label="Route Filters (Prefix Lists)"
                          helpText="Control which routes to accept/advertise"
                        >
                          <div className="space-y-3">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newFilterPrefix}
                                onChange={(e) => setNewFilterPrefix(e.target.value)}
                                className="vlan-input flex-1 px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                                placeholder="e.g., 10.0.0.0/8"
                              />
                              <select
                                value={newFilterAction}
                                onChange={(e) => setNewFilterAction(e.target.value as 'permit' | 'deny')}
                                className="vlan-input px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                              >
                                <option value="permit">Permit</option>
                                <option value="deny">Deny</option>
                              </select>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddRouteFilter}
                                disabled={!newFilterPrefix.trim()}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            {routeFilters.length > 0 && (
                              <div className="space-y-2">
                                {routeFilters.map((filter, index) => (
                                  <div key={index} className="flex items-center justify-between bg-fw-base p-3 rounded border border-fw-secondary">
                                    <div className="flex items-center space-x-3">
                                      <span className="text-figma-base font-mono text-fw-body">{filter.prefix}</span>
                                      <span className={`px-2 py-0.5 text-figma-sm font-medium rounded ${
                                        filter.action === 'permit'
                                          ? 'bg-fw-successLight text-fw-success'
                                          : 'bg-fw-errorLight text-fw-error'
                                      }`}>
                                        {filter.action}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRouteFilter(index)}
                                      className="text-fw-bodyLight hover:text-fw-error"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormField>
                      </div>
                    </div>
                  )}

                  {/* Static Routes Configuration */}
                  {routingProtocol === 'static' && (
                    <div className="space-y-4 bg-fw-base p-4 rounded-lg border border-fw-active">
                      <div className="flex items-center mb-2">
                        <Route className="h-4 w-4 text-fw-link mr-2" />
                        <h4 className="text-figma-base font-semibold text-fw-heading">Static Routes</h4>
                      </div>

                      <FormField
                        label="Add Static Route"
                        helpText="Define static routes for this link"
                      >
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={newRouteDestination}
                              onChange={(e) => setNewRouteDestination(e.target.value)}
                              className="vlan-input px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                              placeholder="Destination (e.g., 10.0.0.0/24)"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newRouteNextHop}
                                onChange={(e) => setNewRouteNextHop(e.target.value)}
                                className="vlan-input flex-1 px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                                placeholder="Next Hop (e.g., 192.168.1.1)"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddStaticRoute}
                                disabled={!newRouteDestination.trim() || !newRouteNextHop.trim()}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {staticRoutes.length > 0 && (
                            <div className="space-y-2">
                              {staticRoutes.map((route, index) => (
                                <div key={index} className="flex items-center justify-between bg-fw-wash p-3 rounded border border-fw-secondary">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-figma-base font-mono text-fw-body">{route.destination}</span>
                                    <span className="text-fw-bodyLight">→</span>
                                    <span className="text-figma-base font-mono text-fw-body">{route.nextHop}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStaticRoute(index)}
                                    className="text-fw-bodyLight hover:text-fw-error"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormField>
                    </div>
                  )}

                  {/* No Routing Info */}
                  {routingProtocol === 'none' && (
                    <div className="bg-fw-wash border border-fw-secondary rounded-lg p-4">
                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-fw-bodyLight mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="text-figma-base text-fw-body font-medium">No Routing Protocol Selected</p>
                          <p className="text-figma-base text-fw-bodyLight mt-1">
                            This link will not participate in dynamic routing. Layer 2 switching will be used for traffic forwarding.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <div className="pt-4 border-t border-fw-secondary">
                <button
                  type="button"
                  className="text-figma-base font-medium text-fw-link hover:text-fw-linkHover flex items-center"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                  <svg
                    className={`ml-1 h-4 w-4 transition-transform transform ${showAdvanced ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Advanced Settings */}
              {showAdvanced && (
                <div className="pt-4 pb-2 space-y-4 bg-fw-wash p-4 rounded-lg border border-fw-secondary">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1">
                      <FormField 
                        label="MTU Size" 
                        error={errors.mtu}
                        helpText="Maximum Transmission Unit (1280-9216)"
                      >
                        <input
                          type="number"
                          value={mtu}
                          onChange={(e) => setMtu(parseInt(e.target.value))}
                          className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                          min="1280"
                          max="9216"
                          step="1"
                        />
                      </FormField>
                    </div>
                    
                    <div className="col-span-1">
                      <FormField 
                        label="QoS Priority" 
                        helpText="0 (lowest) to 7 (highest)"
                      >
                        <select
                          value={qosPriority}
                          onChange={(e) => setQosPriority(parseInt(e.target.value))}
                          className="vlan-input w-full px-3 h-9 border border-fw-secondary rounded-lg shadow-sm text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                        >
                          <option value="0">0 - Background (lowest)</option>
                          <option value="1">1 - Best Effort</option>
                          <option value="2">2 - Excellent Effort</option>
                          <option value="3">3 - Critical Applications</option>
                          <option value="4">4 - Video</option>
                          <option value="5">5 - Voice</option>
                          <option value="6">6 - Internetwork Control</option>
                          <option value="7">7 - Network Control (highest)</option>
                        </select>
                      </FormField>
                    </div>
                  </div>

                  {/* Help information */}
                  <div className="bg-fw-accent border border-fw-active rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <HelpCircle className="h-5 w-5 text-fw-link" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-figma-base font-medium text-fw-linkHover">Advanced Link Settings</h3>
                        <div className="mt-2 text-figma-base text-fw-linkHover">
                          <p>
                            <strong>MTU Size:</strong> Defines the maximum packet size. Standard is 1500, but jumbo frames allow values up to 9216.
                          </p>
                          <p className="mt-1">
                            <strong>QoS Priority:</strong> Determines traffic priority for this link. Higher values receive preferential treatment.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
      </div>
    </SideDrawer>
  );
}

// Export as both VLANModal and LinkModal
;