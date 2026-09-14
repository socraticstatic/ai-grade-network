import { useState, useEffect } from 'react';
import { X, AlertTriangle, Plus, Info, Network, Shield, Settings, Globe, ServerCog, Cloud, ExternalLink } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';

function HubIcon({ className }: { className?: string }) {
  return <AttIcon name="hub" className={className} />;
}
import { Button } from '../../common/Button';
import { FormField } from '../../form/FormField';
import { VNF, VNFType, VNFInterface, VNFTemplate, VNFSize, VNF_SIZE_TIERS } from '../../../types/vnf';
import { VNFSizePicker } from '../vnf/VNFSizePicker';
import { Link } from '../../../types/connection';
import { SideDrawer } from '../../common/SideDrawer';
import { useStore } from '../../../store/useStore';

// Utility function to get user-friendly VNF type names
const getTypeName = (type: VNFType): string => {
  switch (type) {
    case 'firewall':
      return 'Firewall';
    case 'sdwan':
      return 'SD-WAN';
    case 'router':
      return 'Router';
    case 'vnat':
      return 'NAT';
    case 'custom':
      return 'Custom';
    default:
      return type.toUpperCase();
  }
};

// Sample VNF templates for quick selection
export const VNF_TEMPLATES: VNFTemplate[] = [
  {
    id: 'template-velocloud-sdwan',
    name: 'VeloCloud SD-WAN',
    description: 'Cloud-delivered SD-WAN for optimized application performance across sites',
    type: 'sdwan',
    vendor: 'VMware',
    model: 'VeloCloud',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'WAN1', type: 'wan', status: 'up' },
        { name: 'WAN2', type: 'wan', status: 'up' },
        { name: 'LAN1', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP'],
    },
    icon: Globe,
    recommendedUseCase: 'Multi-site connectivity, bandwidth optimization',
    licenseRequired: true,
  },
  {
    id: 'template-cisco-sdwan',
    name: 'Cisco SD-WAN',
    description: 'Enterprise SD-WAN built on Viptela for secure, scalable branch connectivity',
    type: 'sdwan',
    vendor: 'Cisco',
    model: 'Viptela',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'WAN1', type: 'wan', status: 'up' },
        { name: 'LAN1', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP', 'OSPF'],
    },
    icon: Globe,
    recommendedUseCase: 'Branch office, secure cloud on-ramp',
    licenseRequired: true,
  },
  {
    id: 'template-hpe-sdwan',
    name: 'HPE EdgeConnect SD-WAN',
    description: 'Application-aware SD-WAN with built-in WAN optimization',
    type: 'sdwan',
    vendor: 'HPE',
    model: 'EdgeConnect',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'WAN1', type: 'wan', status: 'up' },
        { name: 'LAN1', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP'],
    },
    icon: Globe,
    recommendedUseCase: 'WAN optimization, hybrid cloud access',
    licenseRequired: true,
  },
  {
    id: 'template-palo-alto-fw',
    name: 'Palo Alto FW',
    description: 'Next-generation firewall with advanced threat prevention',
    type: 'firewall',
    vendor: 'Palo Alto Networks',
    model: 'VM-Series',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'WAN1', type: 'wan', status: 'up' },
        { name: 'LAN1', type: 'lan', status: 'up' },
        { name: 'MGMT', type: 'management', status: 'up' },
      ],
      routingProtocols: ['BGP', 'OSPF'],
      highAvailability: true,
    },
    icon: Shield,
    recommendedUseCase: 'Perimeter security, secure cloud access',
    licenseRequired: true,
  },
  {
    id: 'template-fortinet-fw',
    name: 'Fortinet FW',
    description: 'High-performance virtual firewall with integrated security fabric',
    type: 'firewall',
    vendor: 'Fortinet',
    model: 'FortiGate-VM',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'port1', type: 'wan', status: 'up' },
        { name: 'port2', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP', 'OSPF'],
    },
    icon: Shield,
    recommendedUseCase: 'Network security, threat intelligence',
    licenseRequired: true,
  },
  {
    id: 'template-cisco-vrouter',
    name: 'Cisco vRouter',
    description: 'Virtual router for flexible enterprise routing and multi-cloud connectivity',
    type: 'router',
    vendor: 'Cisco',
    model: 'CSR 1000v',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'GigabitEthernet0/0', type: 'wan', status: 'up' },
        { name: 'GigabitEthernet0/1', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP', 'OSPF', 'EIGRP'],
    },
    icon: Network,
    recommendedUseCase: 'Enterprise routing, branch connectivity',
    licenseRequired: true,
  },
  {
    id: 'template-juniper-srvx',
    name: 'Juniper sVRX',
    description: 'Virtualized SRX-series firewall and router with advanced routing',
    type: 'router',
    vendor: 'Juniper',
    model: 'SRX Series',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'ge-0/0/0', type: 'wan', status: 'up' },
        { name: 'ge-0/0/1', type: 'lan', status: 'up' },
      ],
      routingProtocols: ['BGP', 'OSPF'],
    },
    icon: Network,
    recommendedUseCase: 'Carrier-grade routing, security services',
    licenseRequired: true,
  },
  {
    id: 'template-f5-bigip',
    name: 'F5 BIG-IP PE',
    description: 'Advanced load balancer and application delivery controller',
    type: 'load_balancer',
    vendor: 'F5',
    model: 'BIG-IP',
    throughput: 'Size-dependent',
    defaultConfiguration: {
      interfaces: [
        { name: 'mgmt', type: 'management', status: 'up' },
        { name: 'external', type: 'wan', status: 'up' },
        { name: 'internal', type: 'lan', status: 'up' },
      ],
    },
    icon: ServerCog,
    recommendedUseCase: 'Application delivery, SSL offload, load balancing',
    licenseRequired: true,
  },
  {
    id: 'template-ubuntu',
    name: 'Ubuntu (Custom)',
    description: 'Bring your own image — Ubuntu Server base for custom network functions',
    type: 'custom',
    vendor: 'Canonical',
    model: 'Ubuntu Server',
    throughput: 'Size-dependent',
    defaultConfiguration: {},
    icon: ServerCog,
    recommendedUseCase: 'Custom network functions, specialized appliances',
    licenseRequired: false,
  },
];

interface VNFModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vnf: VNF) => void;
  vnf?: VNF;
  connectionId: string;
  links: Link[];
}

export function VNFModal({
  isOpen,
  onClose,
  onSave,
  vnf,
  connectionId,
  links
}: VNFModalProps) {
  const isEditMode = !!vnf;
  const [showVnfTooltip, setShowVnfTooltip] = useState(false);

  // Get all connections from store
  const connections = useStore(state => state.connections);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<VNFType>('custom');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState<VNF['status']>('inactive');
  const [throughput, setThroughput] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [description, setDescription] = useState('');
  const [interfaces, setInterfaces] = useState<VNFInterface[]>([]);
  const [highAvailability, setHighAvailability] = useState(false);
  const [managementIP, setManagementIP] = useState('');
  const [routingProtocols, setRoutingProtocols] = useState<string[]>([]);
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const [selectedConnectionsForLinks, setSelectedConnectionsForLinks] = useState<string[]>([connectionId]);

  // New interface form
  const [newInterface, setNewInterface] = useState<Partial<VNFInterface>>({
    name: '',
    type: 'lan',
    status: 'down'
  });

  // Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showTemplates, setShowTemplates] = useState(!isEditMode);

  // Size selection
  const [selectedSize, setSelectedSize] = useState<VNFSize | null>(null);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get available links from the selected connections
  const getAvailableLinks = (): Array<Link & { connectionName: string; connectionId: string }> => {
    const allLinks: Array<Link & { connectionName: string; connectionId: string }> = [];

    selectedConnectionsForLinks.forEach(connId => {
      // If selecting current connection, use the provided links
      if (connId === connectionId) {
        allLinks.push(...links.map(link => ({
          ...link,
          connectionName: connections.find(c => c.id === connId)?.name || 'Current Connection',
          connectionId: connId
        })));
      } else {
        // For cross-connection, we need to get links from the selected connection
        // In a real implementation, this would fetch from the connection's stored links
        // For now, we'll indicate these need to be loaded
        const selectedConn = connections.find(c => c.id === connId);
        if (selectedConn) {
          // In production, you'd fetch/access the connection's links here
          // This could be: selectedConn.links or an API call
          // For demo purposes, return empty for cross-connection
        }
      }
    });

    return allLinks;
  };

  const availableLinks = getAvailableLinks();
  const hasMultipleConnections = selectedConnectionsForLinks.length > 1;
  const hasCrossConnection = selectedConnectionsForLinks.some(id => id !== connectionId);

  // Populate form fields in edit mode
  useEffect(() => {
    if (vnf) {
      setName(vnf.name);
      setType(vnf.type);
      setVendor(vnf.vendor);
      setModel(vnf.model || '');
      setVersion(vnf.version || '');
      setStatus(vnf.status);
      setThroughput(vnf.throughput || '');
      setLicenseExpiry(vnf.licenseExpiry ? new Date(vnf.licenseExpiry).toISOString().split('T')[0] : '');
      setDescription(vnf.description || '');
      setInterfaces(vnf.configuration?.interfaces || []);
      setHighAvailability(vnf.configuration?.highAvailability || false);
      setManagementIP(vnf.configuration?.managementIP || '');
      setRoutingProtocols(vnf.configuration?.routingProtocols || []);
      setLinkIds(vnf.linkIds || []);
      setSelectedSize(vnf.size ?? null);

      // Hide templates in edit mode
      setShowTemplates(false);
    } else {
      resetForm();
      setShowTemplates(true);
    }
    setErrors({});
  }, [vnf, isOpen]);

  // Reset form to defaults
  const resetForm = () => {
    setName('');
    setType('custom');
    setVendor('');
    setModel('');
    setVersion('');
    setStatus('inactive');
    setThroughput('');
    setLicenseExpiry('');
    setDescription('');
    setInterfaces([]);
    setHighAvailability(false);
    setManagementIP('');
    setRoutingProtocols([]);
    setSelectedTemplate('');
    setLinkIds([]);
    setSelectedSize(null);
  };

  // Apply template settings
  const applyTemplate = (templateId: string) => {
    const template = VNF_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setName(template.name);
    setType(template.type);
    setVendor(template.vendor);
    setModel(template.model || '');
    setThroughput(template.throughput);
    setDescription(template.description);

    // Set configuration from template
    if (template.defaultConfiguration) {
      if (template.defaultConfiguration.interfaces) {
        setInterfaces(template.defaultConfiguration.interfaces.map((iface, index) => ({
          id: `if-${index + 1}`,
          name: iface.name || '',
          type: iface.type || 'lan',
          status: 'down',
          ...iface
        })) as VNFInterface[]);
      }

      if (template.defaultConfiguration.routingProtocols) {
        setRoutingProtocols(template.defaultConfiguration.routingProtocols);
      }

      if (template.defaultConfiguration.highAvailability !== undefined) {
        setHighAvailability(template.defaultConfiguration.highAvailability);
      }
    }

    // Move to configuration form
    setShowTemplates(false);
    setSelectedTemplate(templateId);
  };

  // Field validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (selectedConnectionsForLinks.length === 0) {
      newErrors.connections = 'At least one connection must be selected';
    }

    if (linkIds.length === 0) {
      newErrors.linkIds = 'At least one link must be selected';
    }

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!vendor.trim()) {
      newErrors.vendor = 'Vendor is required';
    }

    if (managementIP && !isValidIP(managementIP)) {
      newErrors.managementIP = 'Enter a valid IP address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidIP = (ip: string): boolean => {
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return false;
    }

    return ip.split('.').every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  };

  // Handle interface management
  const handleAddInterface = () => {
    if (!newInterface.name) {
      setErrors({...errors, newInterface: 'Interface name is required'});
      return;
    }

    const newIf: VNFInterface = {
      id: `if-${Date.now()}`,
      name: newInterface.name,
      type: newInterface.type as 'wan' | 'lan' | 'management' | 'ha',
      status: newInterface.status as 'up' | 'down',
      ipAddress: newInterface.ipAddress,
      subnetMask: newInterface.subnetMask,
      hub: newInterface.hub,
      vlanId: newInterface.vlanId,
      mtu: newInterface.mtu
    };

    setInterfaces([...interfaces, newIf]);

    // Reset form
    setNewInterface({
      name: '',
      type: 'lan',
      status: 'down'
    });

    // Clear any errors
    if (errors.newInterface) {
      const { newInterface, ...restErrors } = errors;
      setErrors(restErrors);
    }
  };

  const handleRemoveInterface = (id: string) => {
    setInterfaces(interfaces.filter(iface => iface.id !== id));
  };

  const handleToggleRoutingProtocol = (protocol: string) => {
    if (routingProtocols.includes(protocol)) {
      setRoutingProtocols(routingProtocols.filter(p => p !== protocol));
    } else {
      setRoutingProtocols([...routingProtocols, protocol]);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Prepare VNF data
    const vnfData: VNF = {
      id: isEditMode && vnf ? vnf.id : `vnf-${Date.now()}`,
      name,
      type,
      vendor,
      model: model || undefined,
      version: version || undefined,
      status,
      throughput: throughput || undefined,
      size: selectedSize ?? undefined,
      licenseExpiry: licenseExpiry || undefined,
      description: description || undefined,
      configuration: {
        interfaces: interfaces.length > 0 ? interfaces : undefined,
        routingProtocols: routingProtocols.length > 0 ? routingProtocols : undefined,
        highAvailability: highAvailability || undefined,
        managementIP: managementIP || undefined,
      },
      createdAt: isEditMode && vnf ? vnf.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      connectionId,
      linkIds
    };

    onSave(vnfData);
  };

  // Back button handler
  const handleBack = () => {
    if (showTemplates) {
      onClose();
    } else {
      setShowTemplates(true);
    }
  };

  const drawerTitle = (
    <div className="flex items-center">
      {isEditMode ? (
        'Edit VNF'
      ) : showTemplates ? (
        'Select VNF Template'
      ) : (
        <>
          Configure VNF
          <div className="relative ml-2">
            <Info
              className="h-4 w-4 text-fw-bodyLight cursor-help"
              onMouseEnter={() => setShowVnfTooltip(true)}
              onMouseLeave={() => setShowVnfTooltip(false)}
            />
            {showVnfTooltip && (
              <div className="absolute z-10 left-0 top-full mt-1 w-72 p-3 bg-fw-heading text-white text-figma-base rounded-lg">

                <p>
                  A <strong>VNF</strong> (Virtual Network Function) is a software-based network service such as a firewall, router, or load balancer, deployed on standard compute infrastructure.
                </p>
              </div>
            )}
          </div>
        </>
      )}
      {selectedTemplate && !showTemplates && (
        <span className="ml-2 px-2.5 py-0.5 text-figma-sm font-medium rounded-full bg-fw-accent text-fw-linkHover">
          {VNF_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
        </span>
      )}
    </div>
  );

  const selectedSizeTier = selectedSize
    ? VNF_SIZE_TIERS.find(t => t.id === selectedSize) ?? null
    : null;

  const drawerFooter = (
    <div className="flex items-center justify-between">
      <Button variant="outline" onClick={handleBack}>
        {showTemplates ? 'Cancel' : 'Back'}
      </Button>

      {!showTemplates && selectedSizeTier && (
        <span className="text-figma-base text-fw-bodyLight">
          <span className="font-semibold text-fw-heading">${selectedSizeTier.monthlyPrice.toLocaleString()}</span>/mo
        </span>
      )}

      {!showTemplates && (
        <Button variant="primary" type="submit" form="vnf-form">
          {isEditMode ? 'Update VNF' : 'Create VNF'}
        </Button>
      )}
    </div>
  );

  return (
    <>
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={drawerTitle as any}
      size="xl"
      footer={drawerFooter}
    >
      {isEditMode && (
          <div className="m-6 mb-0 bg-fw-warn/10 border border-fw-warn/30 rounded-lg p-3 flex items-start">
            <AlertTriangle className="h-5 w-5 text-fw-warn mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-figma-base text-fw-heading font-medium">
                Warning: Editing VNF Configuration
              </p>
              <p className="text-figma-base text-fw-body mt-1">
                Changes to VNF settings may impact network connectivity and security. Ensure you understand the implications of these changes.
              </p>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {showTemplates ? (
            /* Template Selection View */
            <div className="space-y-6">
              <p className="text-figma-base text-fw-bodyLight">
                Choose a template to quickly configure a pre-defined VNF, or create a custom one.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {VNF_TEMPLATES.map(template => {
                  const Icon = template.icon;
                  return (
                    <div
                      key={template.id}
                      className={`
                        border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
                          selectedTemplate === template.id
                            ? 'border-fw-active bg-fw-accent ring-2 ring-fw-active/50'
                            : 'border-fw-secondary hover:border-fw-active hover:bg-fw-accent/50'
                        }`}
                      onClick={() => applyTemplate(template.id)}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          template.type === 'firewall' ? 'bg-fw-infoLight' :
                          template.type === 'sdwan' ? 'bg-fw-wash' :
                          template.type === 'router' ? 'bg-fw-accent' :
                          template.type === 'vnat' ? 'bg-fw-successLight' :
                          'bg-fw-neutral'
                        }`}>
                          <Icon className={`h-6 w-6 ${
                            template.type === 'firewall' ? 'text-fw-link' :
                            template.type === 'sdwan' ? 'text-fw-purple' :
                            template.type === 'router' ? 'text-fw-link' :
                            template.type === 'vnat' ? 'text-fw-success' :
                            'text-fw-body'
                          }`} />
                        </div>
                        <div>
                          <h4 className="text-base font-medium text-fw-heading">{template.name}</h4>
                          <span className="text-figma-sm text-fw-bodyLight">{template.vendor} {template.model}</span>
                        </div>
                      </div>

                      <p className="text-figma-base text-fw-bodyLight mb-2 line-clamp-2">{template.description}</p>

                      <div className="flex justify-between text-figma-base">
                        <span className="text-fw-bodyLight">{getTypeName(template.type)}</span>
                        <span className="font-medium text-fw-heading">{template.throughput}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-fw-wash border border-fw-secondary rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-fw-link mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-figma-base text-fw-body font-medium">
                      BYOL - Bring Your Own License
                    </p>
                    <p className="text-figma-base text-fw-bodyLight mt-1">
                      For vendor-specific VNFs, you'll need to provide your own license. Custom VNFs allow you to configure any network function compatible with your environment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Configuration Form */
            <form id="vnf-form" onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Basic VNF Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1">
                    <FormField
                      label="VNF Name"
                      error={errors.name}
                      required
                    >
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                        placeholder="e.g., Edge Firewall"
                      />
                    </FormField>
                  </div>

                  <div className="col-span-1">
                    <FormField
                      label="VNF Type"
                      required
                    >
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as VNFType)}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                      >
                        <option value="firewall">Firewall</option>
                        <option value="sdwan">SD-WAN</option>
                        <option value="router">Router</option>
                        <option value="vnat">Virtual NAT</option>
                        <option value="custom">Custom</option>
                      </select>
                    </FormField>
                  </div>

                  <div className="col-span-1">
                    <FormField
                      label="Vendor"
                      error={errors.vendor}
                      required
                    >
                      <input
                        type="text"
                        value={vendor}
                        onChange={(e) => setVendor(e.target.value)}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                        placeholder="e.g., Palo Alto Networks"
                      />
                    </FormField>
                  </div>

                  <div className="col-span-1">
                    <FormField
                      label="Model"
                    >
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                        placeholder="e.g., VM-Series"
                      />
                    </FormField>
                  </div>

                  <div className="col-span-1">
                    <FormField
                      label="Version"
                    >
                      <input
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                        placeholder="e.g., 10.0.3"
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
                        onChange={(e) => setStatus(e.target.value as VNF['status'])}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                      >
                        <option value="inactive">Inactive</option>
                        <option value="active">Active</option>
                        <option value="provisioning">Provisioning</option>
                        <option value="error">Error</option>
                      </select>
                    </FormField>
                  </div>

                  <div className="col-span-1">
                    <FormField
                      label="Throughput"
                    >
                      <input
                        type="text"
                        value={throughput}
                        onChange={(e) => setThroughput(e.target.value)}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                        placeholder="e.g., 10 Gbps"
                      />
                    </FormField>
                  </div>

                  <div className="col-span-1">
                    <FormField
                      label="License Expiry Date"
                    >
                      <input
                        type="date"
                        value={licenseExpiry}
                        onChange={(e) => setLicenseExpiry(e.target.value)}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                      />
                    </FormField>
                  </div>

                  {/* VNF Size */}
                  <div className="col-span-2">
                    <FormField
                      label="VNF Size"
                      required
                      helpText="Determines compute resources and monthly cost"
                    >
                      <VNFSizePicker value={selectedSize} onChange={setSelectedSize} />
                    </FormField>
                  </div>

                  <div className="col-span-2">
                    <FormField
                      label="Connections"
                      error={errors.connections}
                      required
                      helpText="Select one or more connections whose links/VLANs can be associated with this VNF"
                    >
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-fw-secondary rounded-md p-3 bg-fw-base">
                        {connections.length === 0 ? (
                          <div className="text-figma-base text-fw-bodyLight">
                            <p>No connections available</p>
                          </div>
                        ) : (
                          connections.map(conn => (
                            <label key={conn.id} className="flex items-center space-x-3 cursor-pointer hover:bg-fw-wash p-2 rounded">
                              <input
                                type="checkbox"
                                checked={selectedConnectionsForLinks.includes(conn.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedConnectionsForLinks([...selectedConnectionsForLinks, conn.id]);
                                  } else {
                                    setSelectedConnectionsForLinks(selectedConnectionsForLinks.filter(id => id !== conn.id));
                                    // Clear any selected links from this connection
                                    setLinkIds(linkIds.filter(linkId => {
                                      const link = availableLinks.find(l => l.id === linkId);
                                      return link?.connectionId !== conn.id;
                                    }));
                                  }
                                }}
                                className="h-4 w-4 text-fw-link focus:ring-fw-active border-fw-secondary rounded"
                              />
                              <div className="flex-1 flex items-center justify-between">
                                <div>
                                  <span className="text-figma-base font-medium text-fw-heading">{conn.name}</span>
                                  <span className="text-figma-sm text-fw-bodyLight ml-2">({conn.type})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-figma-sm px-2 py-0.5 rounded-full ${
                                    conn.status === 'Active' ? 'bg-fw-successLight text-fw-success' : 'bg-fw-neutral text-fw-bodyLight'
                                  }`}>
                                    {conn.status}
                                  </span>
                                  {conn.id === connectionId && (
                                    <span className="text-figma-sm px-2 py-0.5 bg-fw-accent text-fw-linkHover rounded-full">
                                      Current
                                    </span>
                                  )}
                                </div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </FormField>

                    {hasCrossConnection && (
                      <div className="mt-2 bg-fw-accent border border-fw-active rounded-lg p-3 flex items-start">
                        <ExternalLink className="h-4 w-4 text-fw-link mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-figma-base text-fw-linkHover font-medium">
                            Cross-Connection Association
                          </p>
                          <p className="text-figma-sm text-fw-linkHover mt-1">
                            This VNF will be associated with links from multiple connections. Ensure network policies allow cross-connection routing.
                          </p>
                        </div>
                      </div>
                    )}

                    {hasMultipleConnections && (
                      <div className="mt-2 bg-fw-successLight border border-fw-success rounded-lg p-3 flex items-start">
                        <Network className="h-4 w-4 text-fw-success mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-figma-base text-fw-success font-medium">
                            Multi-Connection VNF
                          </p>
                          <p className="text-figma-sm text-fw-success mt-1">
                            This VNF can access links from {selectedConnectionsForLinks.length} connections for flexible network design.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <FormField
                      label="Links / VLANs"
                      error={errors.linkIds}
                      required
                      helpText="Select one or more links this VNF will be associated with"
                    >
                      <div className="space-y-2 max-h-64 overflow-y-auto border border-fw-secondary rounded-md p-3 bg-fw-base">
                        {selectedConnectionsForLinks.length === 0 ? (
                          <div className="text-figma-base text-fw-bodyLight">
                            <p>Please select at least one connection first</p>
                          </div>
                        ) : availableLinks.length === 0 ? (
                          <div className="text-figma-base text-fw-bodyLight">
                            <p>No links available for the selected connection(s)</p>
                            {hasCrossConnection && (
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
                                <div className="flex flex-col">
                                  <span className="text-figma-base font-medium text-fw-heading">{link.name}</span>
                                  <span className="text-figma-sm text-fw-bodyLight">VLAN {link.vlanId} • {link.connectionName}</span>
                                </div>
                                {link.connectionId !== connectionId && (
                                  <span className="text-figma-sm px-2 py-0.5 bg-fw-accent text-fw-linkHover rounded-full flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" />
                                    Cross-Connection
                                  </span>
                                )}
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </FormField>
                  </div>

                  <div className="col-span-2">
                    <FormField
                      label="Description"
                    >
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                        rows={3}
                        placeholder="Enter a description for this VNF"
                      />
                    </FormField>
                  </div>
                </div>

                {/* Advanced Configuration Toggle */}
                <div className="pt-4 border-t border-fw-secondary">
                  <button
                    type="button"
                    className="text-figma-base font-medium text-fw-link hover:text-fw-linkHover flex items-center"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? 'Hide Advanced Configuration' : 'Show Advanced Configuration'}
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

                {/* Advanced Configuration Section */}
                {showAdvanced && (
                  <div className="pt-4 pb-2 space-y-6 bg-fw-wash p-4 rounded-lg border border-fw-secondary">
                    {/* Network Interfaces Section */}
                    <div>
                      <h3 className="text-base font-medium text-fw-heading mb-4">Network Interfaces</h3>

                      {/* Existing interfaces table */}
                      {interfaces.length > 0 && (
                        <div className="overflow-x-auto mb-4 rounded-2xl overflow-hidden">
                          <table className="min-w-full divide-y divide-fw-secondary">
                            <thead className="bg-fw-wash">
                              <tr>
                                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">Name</th>
                                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">Type</th>
                                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">IP Address</th>
                                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">Status</th>
                                <th scope="col" className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="bg-fw-base divide-y divide-fw-secondary">
                              {interfaces.map((iface) => (
                                <tr key={iface.id} className="hover:bg-fw-wash transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-[14px] font-medium text-fw-heading">{iface.name}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-[14px] text-fw-bodyLight">{iface.type.toUpperCase()}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-[14px] text-fw-bodyLight">
                                    {iface.ipAddress ? (
                                      <>
                                        {iface.ipAddress}
                                        {iface.subnetMask && <span className="text-fw-bodyLight"> / {iface.subnetMask}</span>}
                                      </>
                                    ) : (
                                      <span className="text-fw-bodyLight">Not configured</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 inline-flex text-figma-sm leading-5 font-semibold rounded-full ${
                                      iface.status === 'up' ? 'bg-fw-successLight text-fw-success' : 'bg-fw-neutral text-fw-heading'
                                    }`}>
                                      {iface.status.toUpperCase()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-[14px] font-medium">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveInterface(iface.id)}
                                      className="text-fw-error hover:text-fw-error"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Add new interface form */}
                      <div className="bg-fw-base p-4 rounded-lg border border-fw-secondary mb-4">
                        <h4 className="text-figma-base font-medium text-fw-heading mb-3">Add Network Interface</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <FormField
                            label="Interface Name"
                            error={errors.newInterface}
                          >
                            <input
                              type="text"
                              value={newInterface.name || ''}
                              onChange={(e) => setNewInterface({...newInterface, name: e.target.value})}
                              className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                              placeholder="e.g., WAN1, LAN1"
                            />
                          </FormField>

                          <FormField
                            label="Interface Type"
                          >
                            <select
                              value={newInterface.type}
                              onChange={(e) => setNewInterface({...newInterface, type: e.target.value as any})}
                              className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                            >
                              <option value="wan">WAN</option>
                              <option value="lan">LAN</option>
                              <option value="management">Management</option>
                              <option value="ha">High Availability</option>
                            </select>
                          </FormField>

                          <FormField
                            label="Interface Status"
                          >
                            <select
                              value={newInterface.status}
                              onChange={(e) => setNewInterface({...newInterface, status: e.target.value as any})}
                              className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                            >
                              <option value="down">Down</option>
                              <option value="up">Up</option>
                            </select>
                          </FormField>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <FormField
                            label="IP Address (optional)"
                          >
                            <input
                              type="text"
                              value={newInterface.ipAddress || ''}
                              onChange={(e) => setNewInterface({...newInterface, ipAddress: e.target.value})}
                              className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                              placeholder="e.g., 192.168.1.1"
                            />
                          </FormField>

                          <FormField
                            label="Subnet Mask (optional)"
                          >
                            <input
                              type="text"
                              value={newInterface.subnetMask || ''}
                              onChange={(e) => setNewInterface({...newInterface, subnetMask: e.target.value})}
                              className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                              placeholder="e.g., 255.255.255.0"
                            />
                          </FormField>

                          <FormField
                            label="VLAN ID (optional)"
                          >
                            <input
                              type="number"
                              value={newInterface.vlanId || ''}
                              onChange={(e) => setNewInterface({...newInterface, vlanId: e.target.value ? parseInt(e.target.value) : undefined})}
                              className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                              placeholder="e.g., 100"
                              min="1"
                              max="4094"
                            />
                          </FormField>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleAddInterface}
                            icon={Plus}
                          >
                            Add Interface
                          </Button>
                        </div>
                      </div>

                      {/* Additional Configuration Options */}
                      <div className="space-y-4">
                        {/* High Availability */}
                        <div>
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={highAvailability}
                              onChange={(e) => setHighAvailability(e.target.checked)}
                              className="h-4 w-4 rounded border-fw-secondary text-fw-link focus:ring-fw-active"
                            />
                            <span className="text-figma-base text-fw-body">Enable High Availability (HA)</span>
                          </label>
                        </div>

                        {/* Management IP */}
                        <FormField
                          label="Management IP Address"
                          error={errors.managementIP}
                        >
                          <input
                            type="text"
                            value={managementIP}
                            onChange={(e) => setManagementIP(e.target.value)}
                            className="w-full px-3 py-2 border border-fw-secondary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                            placeholder="e.g., 192.168.1.10"
                          />
                        </FormField>

                        {/* Routing Protocols */}
                        <div>
                          <label className="block text-figma-base font-medium text-fw-body mb-2">
                            Routing Protocols
                          </label>
                          <div className="space-y-2">
                            {['OSPF', 'BGP', 'EIGRP', 'RIP', 'Static'].map(protocol => (
                              <label key={protocol} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={routingProtocols.includes(protocol)}
                                  onChange={() => handleToggleRoutingProtocol(protocol)}
                                  className="h-4 w-4 rounded border-fw-secondary text-fw-link focus:ring-fw-active"
                                />
                                <span className="text-figma-base text-fw-body">{protocol}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>

    </SideDrawer>

    </>
  );
}
