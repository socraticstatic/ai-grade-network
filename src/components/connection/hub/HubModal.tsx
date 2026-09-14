import { useState, useEffect } from 'react';
import { X, Network, Settings, Info, Plus, AlertTriangle, ExternalLink } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { Button } from '../../common/Button';
import { Hub } from '../../../types/hub';
import { FormField } from '../../form/FormField';
import { Link } from '../../../types/connection';
import { SideDrawer } from '../../common/SideDrawer';
import { useStore } from '../../../store/useStore';

interface HubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hub: Hub) => void;
  hub?: Hub;
  connectionId: string;
  links: Link[];
}

export function HubModal({
  isOpen,
  onClose,
  onSave,
  hub,
  connectionId,
  links: providedLinks
}: HubModalProps) {
  const isEditMode = !!hub;

  // Get all connections from store
  const connections = useStore(state => state.connections);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Hub['status']>('inactive');
  const [location, setLocation] = useState('');
  const [routingPolicy, setRoutingPolicy] = useState('default');
  const [securityPolicy, setSecurityPolicy] = useState('standard');
  const [qosPolicy, setQosPolicy] = useState('standard');
  const [links, setLinks] = useState<Link[]>([]);
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const [selectedConnectionForLinks, setSelectedConnectionForLinks] = useState<string>(connectionId);
  const [asn, setAsn] = useState<number | undefined>(undefined);
  const [bgpEnabled, setBgpEnabled] = useState(false);
  const [routeFilters, setRouteFilters] = useState<string[]>([]);
  const [routeFilterInput, setRouteFilterInput] = useState('');

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get available links from the selected connection
  const getAvailableLinks = (): Link[] => {
    // If selecting current connection, use the provided links
    if (selectedConnectionForLinks === connectionId) {
      return providedLinks;
    }

    // For cross-connection, we need to get links from the selected connection
    const selectedConn = connections.find(c => c.id === selectedConnectionForLinks);
    if (!selectedConn) return [];

    // Return empty for now - in production, you'd fetch/access the connection's links here
    return [];
  };

  const availableLinks = getAvailableLinks();
  const isCrossConnection = selectedConnectionForLinks !== connectionId;

  // Populate form fields in edit mode
  useEffect(() => {
    if (hub) {
      setName(hub.name);
      setDescription(hub.description || '');
      setStatus(hub.status);
      setLocation(hub.location);
      setLinks(hub.links || []);
      setLinkIds((hub.links || []).map(link => link.id));

      // Set policies if available
      if (hub.policies) {
        setRoutingPolicy(hub.policies.routingPolicy || 'default');
        setSecurityPolicy(hub.policies.securityPolicy || 'standard');
        setQosPolicy(hub.policies.qosPolicy || 'standard');
      }

      // Set configuration if available
      if (hub.configuration) {
        setAsn(hub.configuration.asn);
        setBgpEnabled(hub.configuration.bgpEnabled || false);
        setRouteFilters(hub.configuration.routeFilters || []);
      }
    } else {
      // Default values for new hubs
      setName('');
      setDescription('');
      setStatus('inactive');
      setLocation('');
      setLinks([]);
      setLinkIds([]);
      setRoutingPolicy('default');
      setSecurityPolicy('standard');
      setQosPolicy('standard');
      setAsn(undefined);
      setBgpEnabled(false);
      setRouteFilters([]);
      setSelectedConnectionForLinks(connectionId);
    }
    setErrors({});
  }, [hub, isOpen, connectionId]);

  // Field validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!location.trim()) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddRouteFilter = () => {
    if (routeFilterInput.trim()) {
      setRouteFilters([...routeFilters, routeFilterInput.trim()]);
      setRouteFilterInput('');
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

    // Convert linkIds back to Link objects
    const selectedLinks = availableLinks.filter(link => linkIds.includes(link.id));

    // Prepare hub data
    const hubData: Hub = {
      id: hub?.id || '',
      name,
      description,
      status,
      location,
      createdAt: hub?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      connectionId,
      links: selectedLinks,
      policies: {
        routingPolicy,
        securityPolicy,
        qosPolicy
      },
      configuration: {
        asn,
        bgpEnabled,
        routeFilters
      }
    };

    onSave(hubData);
  };

  const drawerTitle = (
    <div className="flex items-center">
      <AttIcon name="hub" className="h-6 w-6 text-brand-blue mr-2" />
      {isEditMode ? 'Edit Hub' : 'Add New Hub'}
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
        form="hub-form"
      >
        {isEditMode ? 'Update Hub' : 'Create Hub'}
      </Button>
    </div>
  );

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={drawerTitle as any}
      size="xl"
      footer={drawerFooter}
    >
      <form id="hub-form" onSubmit={handleSubmit}>
        <div>
            {/* Warning message when editing */}
            {isEditMode && (
              <div className="mb-6 bg-fw-warn/10 border border-fw-warn/30 rounded-lg p-3 flex items-start">
                <AlertTriangle className="h-5 w-5 text-fw-warn mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-figma-base text-fw-heading font-medium">
                    Warning: Editing Hub Configuration
                  </p>
                  <p className="mt-1 text-figma-base text-fw-body">
                    Changes to hub settings may impact network connectivity. Ensure all connected systems are properly configured for the updated settings.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="md:col-span-2">
                <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em] mb-4 flex items-center">
                  <AttIcon name="hub" className="h-4 w-4 text-fw-bodyLight mr-2" />
                  Basic Information
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    label="Hub Name"
                    error={errors.name}
                    required
                  >
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                      placeholder="e.g., Primary Hub"
                    />
                  </FormField>

                  <FormField
                    label="Status"
                  >
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Hub['status'])}
                      className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                    >
                      <option value="inactive">Inactive</option>
                      <option value="active">Active</option>
                      <option value="provisioning">Provisioning</option>
                      <option value="error">Error</option>
                    </select>
                  </FormField>

                  <FormField
                    label="Location"
                    error={errors.location}
                    required
                  >
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                    >
                      <option value="">Select a location</option>
                      <option value="US East">US East</option>
                      <option value="US West">US West</option>
                      <option value="EU West">EU West</option>
                      <option value="Asia Pacific">Asia Pacific</option>
                    </select>
                  </FormField>

                  <div className="md:col-span-2">
                    <FormField
                      label="Description"
                    >
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                        placeholder="Enter a description for this hub"
                      />
                    </FormField>
                  </div>
                </div>
              </div>

              {/* Link Association */}
              <div className="md:col-span-2 pt-6 border-t border-fw-secondary">
                <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em] mb-4 flex items-center">
                  <Network className="h-4 w-4 text-fw-bodyLight mr-2" />
                  Link Association
                </h4>

                <div className="space-y-4">
                  <FormField
                    label="Connection for Links"
                    helpText="Select which connection's links/VLANs to associate with this hub"
                  >
                    <select
                      value={selectedConnectionForLinks}
                      onChange={(e) => {
                        setSelectedConnectionForLinks(e.target.value);
                        // Clear selected links when changing connection
                        setLinkIds([]);
                      }}
                      className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                    >
                      {connections.map(conn => (
                        <option key={conn.id} value={conn.id}>
                          {conn.name} ({conn.type}) - {conn.status}
                          {conn.id === connectionId ? ' (Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  {isCrossConnection && (
                    <div className="bg-fw-accent border border-fw-active rounded-lg p-3 flex items-start">
                      <ExternalLink className="h-4 w-4 text-fw-link mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-figma-base text-fw-linkHover font-medium">
                          Cross-Connection Association
                        </p>
                        <p className="text-figma-sm text-fw-link mt-1">
                          This hub will be associated with links from a different connection. Ensure network policies allow cross-connection routing.
                        </p>
                      </div>
                    </div>
                  )}

                  <FormField
                    label="Links / VLANs"
                    helpText="Select one or more links to associate with this hub"
                  >
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-fw-secondary rounded-md p-3">
                      {availableLinks.length === 0 ? (
                        <div className="text-figma-base text-fw-bodyLight">
                          <p>No links available for this connection</p>
                          {isCrossConnection && (
                            <p className="text-figma-sm mt-1 text-fw-bodyLight">
                              Cross-connection links need to be loaded separately. Navigate to the selected connection to view its links.
                            </p>
                          )}
                        </div>
                      ) : (
                        availableLinks.map(link => (
                          <label key={link.id} className="flex items-center space-x-2 cursor-pointer hover:bg-fw-wash p-2 rounded">
                            <input
                              type="checkbox"
                              checked={linkIds.includes(link.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setLinkIds([...linkIds, link.id]);
                                } else {
                                  setLinkIds(linkIds.filter(id => id !== link.id));
                                }
                              }}
                              className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary rounded"
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-figma-base text-fw-body">{link.name} (VLAN {link.vlanId})</span>
                              {isCrossConnection && (
                                <span className="text-figma-sm px-2 py-0.5 bg-fw-accent text-fw-link rounded-full flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  External
                                </span>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </FormField>
                </div>
              </div>

              {/* Policies */}
              <div className="md:col-span-2">
                <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em] mb-4 flex items-center">
                  <Settings className="h-4 w-4 text-fw-bodyLight mr-2" />
                  Policies
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    label="Routing Policy"
                  >
                    <select
                      value={routingPolicy}
                      onChange={(e) => setRoutingPolicy(e.target.value)}
                      className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                    >
                      <option value="default">Default</option>
                      <option value="backup">Backup</option>
                      <option value="load-balancing">Load Balancing</option>
                      <option value="failover">Failover</option>
                    </select>
                  </FormField>

                  <FormField
                    label="Security Policy"
                  >
                    <select
                      value={securityPolicy}
                      onChange={(e) => setSecurityPolicy(e.target.value)}
                      className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                    >
                      <option value="standard">Standard</option>
                      <option value="strict">Strict</option>
                      <option value="custom">Custom</option>
                    </select>
                  </FormField>

                  <FormField
                    label="QoS Policy"
                  >
                    <select
                      value={qosPolicy}
                      onChange={(e) => setQosPolicy(e.target.value)}
                      className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                    >
                      <option value="standard">Standard</option>
                      <option value="business-critical">Business Critical</option>
                      <option value="real-time">Real-Time</option>
                      <option value="custom">Custom</option>
                    </select>
                  </FormField>
                </div>
              </div>

              {/* Advanced Settings Toggle */}
              <div className="md:col-span-2 pt-4 border-t border-fw-secondary">
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
                <div className="md:col-span-2 pt-4 pb-2 space-y-6 bg-fw-wash p-4 rounded-lg border border-fw-secondary">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      label="ASN (Autonomous System Number)"
                    >
                      <input
                        type="number"
                        value={asn || ''}
                        onChange={(e) => setAsn(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                        placeholder="e.g., 65000"
                      />
                    </FormField>

                    <FormField
                      label="BGP Enabled"
                    >
                      <div className="flex items-center h-full">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={bgpEnabled}
                            onChange={(e) => setBgpEnabled(e.target.checked)}
                            className="rounded border-fw-secondary text-fw-link focus:ring-fw-active h-4 w-4"
                          />
                          <span className="ml-2 text-figma-base text-fw-body">Enable BGP routing</span>
                        </label>
                      </div>
                    </FormField>
                  </div>

                  <div>
                    <FormField
                      label="Route Filters"
                    >
                      <div className="space-y-2">
                        <div className="flex">
                          <input
                            type="text"
                            value={routeFilterInput}
                            onChange={(e) => setRouteFilterInput(e.target.value)}
                            className="flex-1 px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active mr-2"
                            placeholder="e.g., 10.0.0.0/8"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddRouteFilter}
                            disabled={!routeFilterInput.trim()}
                          >
                            Add
                          </Button>
                        </div>

                        {routeFilters.length > 0 ? (
                          <div className="space-y-2 mt-2">
                            {routeFilters.map((filter, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-fw-base rounded-md border border-fw-secondary">
                                <span className="text-figma-base text-fw-body">{filter}</span>
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
                        ) : (
                          <p className="text-figma-base text-fw-bodyLight mt-2">No route filters added</p>
                        )}
                      </div>
                    </FormField>
                  </div>
                </div>
              )}
            </div>
        </div>
      </form>
    </SideDrawer>
  );
}
