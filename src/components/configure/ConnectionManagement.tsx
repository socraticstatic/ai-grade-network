import { useState } from 'react';
import { Shield, Settings, FileText, Clock } from 'lucide-react';
import { VerticalTabGroup } from '../navigation/VerticalTabGroup';
import { TabItem } from '../../types/navigation';
import { Button } from '../common/Button';

interface ConnectionManagementProps {
  searchQuery?: string;
}

export function ConnectionManagement({ searchQuery }: ConnectionManagementProps) {
  const [activeView, setActiveView] = useState<'policies' | 'defaults' | 'naming' | 'lifecycle'>('policies');
  const [policies, setPolicies] = useState({
    requireApproval: true,
    autoProvision: false,
    allowSelfService: false,
    maxConnectionsPerUser: 5,
    maxBandwidthPerConnection: 10000,
    requireTagging: true,
    enforceNamingConvention: true
  });

  const [defaults, setDefaults] = useState({
    defaultBandwidth: '1000',
    defaultVlan: 'auto',
    defaultRoutingProtocol: 'BGP',
    defaultSLA: 'standard',
    enableMonitoring: true,
    enableAlerting: true,
    defaultRedundancy: 'single',
    autoEnableHA: false
  });

  const [namingConvention, setNamingConvention] = useState({
    usePattern: true,
    pattern: '{env}-{region}-{type}-{sequence}',
    requireDescription: true,
    allowCustomNames: false,
    minNameLength: 5,
    maxNameLength: 50
  });

  const [lifecycle, setLifecycle] = useState({
    autoDecommissionInactive: false,
    inactivityThreshold: 90,
    archiveAfterDecommission: true,
    notifyBeforeDecommission: true,
    notificationDays: 30
  });

  const handleSaveSettings = () => {
    window.addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Connection policies updated successfully',
      duration: 3000
    });
  };

  const tabs: TabItem[] = [
    { id: 'policies', label: 'Connection Policies', icon: <Shield className="h-5 w-5 mr-2" /> },
    { id: 'defaults', label: 'Default Settings', icon: <Settings className="h-5 w-5 mr-2" /> },
    { id: 'naming', label: 'Naming Conventions', icon: <FileText className="h-5 w-5 mr-2" /> },
    { id: 'lifecycle', label: 'Lifecycle Rules', icon: <Clock className="h-5 w-5 mr-2" /> }
  ];

  return (
    <div className="p-6">
      {/* Help Banner */}
      <div className="mb-6 bg-gradient-to-r from-fw-wash to-fw-base border border-fw-secondary rounded-xl p-4">
        <div className="flex items-start">
          <Shield className="h-6 w-6 text-fw-link mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">Connection Governance</h3>
            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">
              Configure account-wide policies and standards for connection provisioning, naming, and lifecycle management. These settings apply to all connections in your account.
            </p>
          </div>
        </div>
      </div>

      <div className="flex">
        <VerticalTabGroup
          tabs={tabs}
          activeTab={activeView}
          onChange={(tab) => setActiveView(tab as typeof activeView)}
        />

        <div className="flex-1 pl-6">
          {/* Connection Policies */}
          {activeView === 'policies' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Connection Provisioning Policies</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Control how connections can be created and managed across your organization.
                </p>

                <div className="space-y-4">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.requireApproval}
                      onChange={(e) => setPolicies({...policies, requireApproval: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Require Approval for New Connections</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">All connection requests must be approved by an administrator before provisioning</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.autoProvision}
                      onChange={(e) => setPolicies({...policies, autoProvision: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Auto-Provision on Approval</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Automatically provision connections when approved (requires approval workflow enabled)</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.allowSelfService}
                      onChange={(e) => setPolicies({...policies, allowSelfService: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Allow Self-Service Provisioning</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Enable users to provision connections without administrative approval (within limits)</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.requireTagging}
                      onChange={(e) => setPolicies({...policies, requireTagging: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Require Resource Tagging</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Connections must be tagged with cost center, environment, and owner information</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.enforceNamingConvention}
                      onChange={(e) => setPolicies({...policies, enforceNamingConvention: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enforce Naming Convention</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Connection names must follow the defined naming pattern</p>
                    </div>
                  </label>

                  <div className="pt-4 border-t border-fw-secondary">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Max Connections Per User</label>
                        <input
                          type="number"
                          value={policies.maxConnectionsPerUser}
                          onChange={(e) => setPolicies({...policies, maxConnectionsPerUser: parseInt(e.target.value)})}
                          className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                        />
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Maximum connections a single user can create</p>
                      </div>

                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Max Bandwidth Per Connection (Mbps)</label>
                        <input
                          type="number"
                          value={policies.maxBandwidthPerConnection}
                          onChange={(e) => setPolicies({...policies, maxBandwidthPerConnection: parseInt(e.target.value)})}
                          className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                        />
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Maximum bandwidth limit for new connections</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Policies
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Default Settings */}
          {activeView === 'defaults' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Default Connection Settings</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Set default values that will be applied to all new connections unless explicitly overridden.
                </p>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Default Bandwidth</label>
                      <select
                        value={defaults.defaultBandwidth}
                        onChange={(e) => setDefaults({...defaults, defaultBandwidth: e.target.value})}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="100">100 Mbps</option>
                        <option value="500">500 Mbps</option>
                        <option value="1000">1 Gbps</option>
                        <option value="10000">10 Gbps</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Default VLAN Assignment</label>
                      <select
                        value={defaults.defaultVlan}
                        onChange={(e) => setDefaults({...defaults, defaultVlan: e.target.value})}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="auto">Auto-Assign</option>
                        <option value="manual">Manual Assignment</option>
                        <option value="pool">From VLAN Pool</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Default Routing Protocol</label>
                      <select
                        value={defaults.defaultRoutingProtocol}
                        onChange={(e) => setDefaults({...defaults, defaultRoutingProtocol: e.target.value})}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="BGP">BGP</option>
                        <option value="Static">Static Routing</option>
                        <option value="OSPF">OSPF</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Default SLA Tier</label>
                      <select
                        value={defaults.defaultSLA}
                        onChange={(e) => setDefaults({...defaults, defaultSLA: e.target.value})}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Default Redundancy</label>
                      <select
                        value={defaults.defaultRedundancy}
                        onChange={(e) => setDefaults({...defaults, defaultRedundancy: e.target.value})}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      >
                        <option value="single">Single Path</option>
                        <option value="dual">Dual Path</option>
                        <option value="multi">Multi-Path</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-fw-secondary space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={defaults.enableMonitoring}
                        onChange={(e) => setDefaults({...defaults, enableMonitoring: e.target.checked})}
                        className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable monitoring for all new connections</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={defaults.enableAlerting}
                        onChange={(e) => setDefaults({...defaults, enableAlerting: e.target.checked})}
                        className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable alerting for all new connections</span>
                    </label>

                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={defaults.autoEnableHA}
                        onChange={(e) => setDefaults({...defaults, autoEnableHA: e.target.checked})}
                        className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Automatically enable high availability for critical connections</span>
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Defaults
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Naming Conventions */}
          {activeView === 'naming' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Naming Conventions</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Define standards for connection naming to ensure consistency and easy identification.
                </p>

                <div className="space-y-6">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={namingConvention.usePattern}
                      onChange={(e) => setNamingConvention({...namingConvention, usePattern: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Use Naming Pattern</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Enforce a structured naming pattern for all connections</p>
                    </div>
                  </label>

                  {namingConvention.usePattern && (
                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Naming Pattern</label>
                      <input
                        type="text"
                        value={namingConvention.pattern}
                        onChange={(e) => setNamingConvention({...namingConvention, pattern: e.target.value})}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link font-mono"
                        placeholder="{env}-{region}-{type}-{sequence}"
                      />
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-2">
                        Available variables: {'{env}'}, {'{region}'}, {'{type}'}, {'{sequence}'}, {'{dept}'}, {'{project}'}
                      </p>
                      <div className="mt-3 p-3 bg-fw-wash rounded">
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-1">Example output:</p>
                        <p className="text-figma-base font-mono text-fw-body tracking-[-0.03em]">prod-us-east-netbond-001</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Minimum Name Length</label>
                      <input
                        type="number"
                        value={namingConvention.minNameLength}
                        onChange={(e) => setNamingConvention({...namingConvention, minNameLength: parseInt(e.target.value)})}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                    </div>

                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Maximum Name Length</label>
                      <input
                        type="number"
                        value={namingConvention.maxNameLength}
                        onChange={(e) => setNamingConvention({...namingConvention, maxNameLength: parseInt(e.target.value)})}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                    </div>
                  </div>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={namingConvention.requireDescription}
                      onChange={(e) => setNamingConvention({...namingConvention, requireDescription: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Require Description</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Connection descriptions are mandatory for all new connections</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={namingConvention.allowCustomNames}
                      onChange={(e) => setNamingConvention({...namingConvention, allowCustomNames: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Allow Custom Names</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Permit custom names that don't follow the pattern (with approval)</p>
                    </div>
                  </label>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Naming Convention
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Lifecycle Rules */}
          {activeView === 'lifecycle' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Connection Lifecycle Rules</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Automate connection lifecycle management to optimize costs and maintain a clean inventory.
                </p>

                <div className="space-y-6">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={lifecycle.autoDecommissionInactive}
                      onChange={(e) => setLifecycle({...lifecycle, autoDecommissionInactive: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Auto-Decommission Inactive Connections</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Automatically decommission connections that have been inactive</p>
                    </div>
                  </label>

                  {lifecycle.autoDecommissionInactive && (
                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Inactivity Threshold (days)</label>
                      <input
                        type="number"
                        value={lifecycle.inactivityThreshold}
                        onChange={(e) => setLifecycle({...lifecycle, inactivityThreshold: parseInt(e.target.value)})}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Days of inactivity before connection is flagged for decommission</p>
                    </div>
                  )}

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={lifecycle.notifyBeforeDecommission}
                      onChange={(e) => setLifecycle({...lifecycle, notifyBeforeDecommission: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Notify Before Decommission</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Send notification to connection owner before auto-decommissioning</p>
                    </div>
                  </label>

                  {lifecycle.notifyBeforeDecommission && (
                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Notification Period (days)</label>
                      <input
                        type="number"
                        value={lifecycle.notificationDays}
                        onChange={(e) => setLifecycle({...lifecycle, notificationDays: parseInt(e.target.value)})}
                        className="w-full h-9 px-3 border border-fw-secondary rounded-lg bg-fw-base text-figma-sm text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Days before decommission to send notification</p>
                    </div>
                  )}

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={lifecycle.archiveAfterDecommission}
                      onChange={(e) => setLifecycle({...lifecycle, archiveAfterDecommission: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Archive After Decommission</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Archive connection configuration and history after decommissioning</p>
                    </div>
                  </label>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Lifecycle Rules
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
