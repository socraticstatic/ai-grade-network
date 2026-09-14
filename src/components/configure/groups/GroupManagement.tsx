import { useState } from 'react';
import { Shield, Settings, Tag, Users } from 'lucide-react';
import { VerticalTabGroup } from '../../navigation/VerticalTabGroup';
import { TabItem } from '../../../types/navigation';
import { Button } from '../../common/Button';

interface GroupManagementProps {
  searchQuery?: string;
}

export function GroupManagement({ searchQuery }: GroupManagementProps) {
  const [activeView, setActiveView] = useState<'policies' | 'templates' | 'categorization' | 'permissions'>('policies');

  const [policies, setPolicies] = useState({
    requireApprovalForPoolCreation: true,
    allowUserManagedPools: false,
    enforcePoolTypes: true,
    maxMembersPerPool: 50,
    maxConnectionsPerPool: 100,
    requireCostCenter: true,
    inheritBillingFromParent: true
  });

  const [templates, setTemplates] = useState({
    enableTemplates: true,
    availableTemplates: [
      { id: 'dept', name: 'Department Pool', enabled: true },
      { id: 'project', name: 'Project Pool', enabled: true },
      { id: 'business', name: 'Business Unit Pool', enabled: true },
      { id: 'team', name: 'Team Pool', enabled: false }
    ]
  });

  const [categorization, setCategorization] = useState({
    requiredTags: ['environment', 'cost-center', 'owner'],
    allowCustomTags: true,
    enforceTagFormat: false,
    autoTagging: true
  });

  const [permissions, setPermissions] = useState({
    poolOwnersCanManageMembers: true,
    poolOwnersCanManageConnections: true,
    poolOwnersCanManageBilling: false,
    allowCrossPoolResourceSharing: false,
    enforceRBAC: true
  });

  const handleSaveSettings = () => {
    window.addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Pool policies updated successfully',
      duration: 3000
    });
  };

  const tabs: TabItem[] = [
    { id: 'policies', label: 'Pool Policies', icon: <Shield className="h-5 w-5 mr-2" /> },
    { id: 'templates', label: 'Pool Templates', icon: <Settings className="h-5 w-5 mr-2" /> },
    { id: 'categorization', label: 'Categorization', icon: <Tag className="h-5 w-5 mr-2" /> },
    { id: 'permissions', label: 'Permissions', icon: <Users className="h-5 w-5 mr-2" /> }
  ];

  return (
    <div className="p-6">
      {/* Help Banner */}
      <div className="mb-6 bg-gradient-to-r from-fw-wash to-fw-base border border-fw-secondary rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="h-6 w-6 text-fw-link mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-figma-base font-medium text-fw-heading">Pool Governance</h3>
            <p className="text-figma-base text-fw-bodyLight mt-1">
              Configure account-wide policies for pool creation, organization, and management. These settings define how resources can be grouped and shared across your organization.
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
          {/* Pool Policies */}
          {activeView === 'policies' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-lg border border-fw-secondary p-6">
                <h3 className="text-lg font-semibold text-fw-heading mb-4">Pool Creation & Management Policies</h3>
                <p className="text-figma-base text-fw-bodyLight mb-6">
                  Control how pools can be created and managed across your organization.
                </p>

                <div className="space-y-4">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.requireApprovalForPoolCreation}
                      onChange={(e) => setPolicies({...policies, requireApprovalForPoolCreation: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body">Require Approval for Pool Creation</span>
                      <p className="text-figma-sm text-fw-bodyLight mt-1">All pool creation requests must be approved by an administrator</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.allowUserManagedPools}
                      onChange={(e) => setPolicies({...policies, allowUserManagedPools: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body">Allow User-Managed Pools</span>
                      <p className="text-figma-sm text-fw-bodyLight mt-1">Enable non-admin users to create and manage their own pools (within limits)</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.enforcePoolTypes}
                      onChange={(e) => setPolicies({...policies, enforcePoolTypes: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body">Enforce Pool Types</span>
                      <p className="text-figma-sm text-fw-bodyLight mt-1">Pools must be categorized using predefined types (Department, Project, Business Unit, etc.)</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.requireCostCenter}
                      onChange={(e) => setPolicies({...policies, requireCostCenter: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body">Require Cost Center Assignment</span>
                      <p className="text-figma-sm text-fw-bodyLight mt-1">Every pool must be associated with a cost center for billing allocation</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.inheritBillingFromParent}
                      onChange={(e) => setPolicies({...policies, inheritBillingFromParent: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body">Inherit Billing from Parent Pool</span>
                      <p className="text-figma-sm text-fw-bodyLight mt-1">Child pools automatically inherit billing settings from parent pools</p>
                    </div>
                  </label>

                  <div className="pt-4 border-t border-fw-secondary">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-figma-base font-medium text-fw-body mb-2">Maximum Members Per Pool</label>
                        <input
                          type="number"
                          value={policies.maxMembersPerPool}
                          onChange={(e) => setPolicies({...policies, maxMembersPerPool: parseInt(e.target.value)})}
                          className="w-full px-4 py-2 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                        />
                        <p className="text-figma-sm text-fw-bodyLight mt-1">Maximum number of users that can be added to a single pool</p>
                      </div>

                      <div>
                        <label className="block text-figma-base font-medium text-fw-body mb-2">Maximum Connections Per Pool</label>
                        <input
                          type="number"
                          value={policies.maxConnectionsPerPool}
                          onChange={(e) => setPolicies({...policies, maxConnectionsPerPool: parseInt(e.target.value)})}
                          className="w-full px-4 py-2 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                        />
                        <p className="text-figma-sm text-fw-bodyLight mt-1">Maximum number of connections that can be assigned to a pool</p>
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

          {/* Pool Templates */}
          {activeView === 'templates' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-lg border border-fw-secondary p-6">
                <h3 className="text-lg font-semibold text-fw-heading mb-4">Pool Templates</h3>
                <p className="text-figma-base text-fw-bodyLight mb-6">
                  Define standard pool templates that provide consistent structures and settings for common organizational patterns.
                </p>

                <div className="space-y-6">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={templates.enableTemplates}
                      onChange={(e) => setTemplates({...templates, enableTemplates: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body">Enable Pool Templates</span>
                      <p className="text-figma-sm text-fw-bodyLight mt-1">Allow users to create pools from predefined templates</p>
                    </div>
                  </label>

                  {templates.enableTemplates && (
                    <div className="pt-4 border-t border-fw-secondary">
                      <h4 className="text-figma-base font-semibold text-fw-heading mb-4">Available Templates</h4>
                      <div className="space-y-3">
                        {templates.availableTemplates.map((template) => (
                          <div key={template.id} className="flex items-center justify-between p-4 bg-fw-wash rounded-lg">
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={template.enabled}
                                onChange={(e) => {
                                  const updated = templates.availableTemplates.map(t =>
                                    t.id === template.id ? {...t, enabled: e.target.checked} : t
                                  );
                                  setTemplates({...templates, availableTemplates: updated});
                                }}
                                className="h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                              />
                              <div>
                                <p className="text-figma-base font-medium text-fw-body">{template.name}</p>
                                <p className="text-figma-sm text-fw-bodyLight">
                                  {template.id === 'dept' && 'Organize resources by department with automatic cost allocation'}
                                  {template.id === 'project' && 'Group connections and users by project with time-based lifecycle'}
                                  {template.id === 'business' && 'Manage resources at business unit level with hierarchical billing'}
                                  {template.id === 'team' && 'Small team-based pools with flexible permissions'}
                                </p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => window.addToast?.({ type: 'info', title: 'Configure', message: 'Group configuration is available in the full product.', duration: 3000 })}>
                              Configure
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <Button variant="outline" icon={Settings}>
                          Create Custom Template
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Templates
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Categorization */}
          {activeView === 'categorization' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-lg border border-fw-secondary p-6">
                <h3 className="text-lg font-semibold text-fw-heading mb-4">Pool Categorization & Tagging</h3>
                <p className="text-figma-base text-fw-bodyLight mb-6">
                  Define tagging standards and categorization rules to ensure consistent pool organization.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-figma-base font-medium text-fw-body mb-2">Required Tags</label>
                    <p className="text-figma-sm text-fw-bodyLight mb-3">
                      These tags must be present on all pools
                    </p>
                    <div className="space-y-2">
                      {categorization.requiredTags.map((tag, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-fw-wash rounded-lg">
                          <span className="text-figma-base text-fw-body font-mono">{tag}</span>
                          <button
                            onClick={() => {
                              const updated = categorization.requiredTags.filter((_, i) => i !== index);
                              setCategorization({...categorization, requiredTags: updated});
                            }}
                            className="text-figma-sm text-fw-error hover:text-fw-errorHover"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <Button variant="outline" size="sm">
                        Add Required Tag
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-fw-secondary space-y-4">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={categorization.allowCustomTags}
                        onChange={(e) => setCategorization({...categorization, allowCustomTags: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body">Allow Custom Tags</span>
                        <p className="text-figma-sm text-fw-bodyLight mt-1">Users can add additional tags beyond required ones</p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={categorization.enforceTagFormat}
                        onChange={(e) => setCategorization({...categorization, enforceTagFormat: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body">Enforce Tag Format</span>
                        <p className="text-figma-sm text-fw-bodyLight mt-1">Tags must follow a defined format (e.g., key:value)</p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={categorization.autoTagging}
                        onChange={(e) => setCategorization({...categorization, autoTagging: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body">Auto-Tagging</span>
                        <p className="text-figma-sm text-fw-bodyLight mt-1">Automatically apply tags based on pool type and organizational hierarchy</p>
                      </div>
                    </label>
                  </div>

                  <div className="pt-4 border-t border-fw-secondary">
                    <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Tag Governance Rules</h4>
                    <div className="bg-fw-wash p-4 rounded-lg space-y-2 text-figma-sm text-fw-bodyLight">
                      <p>• All tags are automatically propagated to connections within the pool</p>
                      <p>• Cost center tags are used for billing allocation and reporting</p>
                      <p>• Environment tags (dev, staging, prod) determine default security policies</p>
                      <p>• Owner tags are used for notification routing and approval workflows</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Categorization Rules
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Permissions */}
          {activeView === 'permissions' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-lg border border-fw-secondary p-6">
                <h3 className="text-lg font-semibold text-fw-heading mb-4">Pool Permissions & Access Control</h3>
                <p className="text-figma-base text-fw-bodyLight mb-6">
                  Define default permissions and access control policies for pool owners and members.
                </p>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Pool Owner Permissions</h4>
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={permissions.poolOwnersCanManageMembers}
                          onChange={(e) => setPermissions({...permissions, poolOwnersCanManageMembers: e.target.checked})}
                          className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <div>
                          <span className="text-figma-base font-medium text-fw-body">Manage Pool Members</span>
                          <p className="text-figma-sm text-fw-bodyLight mt-1">Pool owners can add/remove users from their pools</p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={permissions.poolOwnersCanManageConnections}
                          onChange={(e) => setPermissions({...permissions, poolOwnersCanManageConnections: e.target.checked})}
                          className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <div>
                          <span className="text-figma-base font-medium text-fw-body">Manage Pool Connections</span>
                          <p className="text-figma-sm text-fw-bodyLight mt-1">Pool owners can assign/unassign connections to their pools</p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={permissions.poolOwnersCanManageBilling}
                          onChange={(e) => setPermissions({...permissions, poolOwnersCanManageBilling: e.target.checked})}
                          className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <div>
                          <span className="text-figma-base font-medium text-fw-body">Manage Billing Settings</span>
                          <p className="text-figma-sm text-fw-bodyLight mt-1">Pool owners can modify cost center and billing allocation</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-fw-secondary">
                    <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Access Control</h4>
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={permissions.allowCrossPoolResourceSharing}
                          onChange={(e) => setPermissions({...permissions, allowCrossPoolResourceSharing: e.target.checked})}
                          className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <div>
                          <span className="text-figma-base font-medium text-fw-body">Allow Cross-Pool Resource Sharing</span>
                          <p className="text-figma-sm text-fw-bodyLight mt-1">Enable connections and resources to be shared across multiple pools</p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={permissions.enforceRBAC}
                          onChange={(e) => setPermissions({...permissions, enforceRBAC: e.target.checked})}
                          className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <div>
                          <span className="text-figma-base font-medium text-fw-body">Enforce Role-Based Access Control</span>
                          <p className="text-figma-sm text-fw-bodyLight mt-1">Apply strict RBAC rules based on user roles within pools</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-fw-secondary">
                    <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Default Role Mappings</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-lg">
                        <div>
                          <p className="text-figma-base font-medium text-fw-body">Pool Owner</p>
                          <p className="text-figma-sm text-fw-bodyLight">Full control over pool resources and settings</p>
                        </div>
                        <span className="text-figma-sm text-fw-success font-medium">Active</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-lg">
                        <div>
                          <p className="text-figma-base font-medium text-fw-body">Pool Admin</p>
                          <p className="text-figma-sm text-fw-bodyLight">Can manage members and view billing</p>
                        </div>
                        <span className="text-figma-sm text-fw-success font-medium">Active</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-lg">
                        <div>
                          <p className="text-figma-base font-medium text-fw-body">Pool Member</p>
                          <p className="text-figma-sm text-fw-bodyLight">Read access to pool connections and metrics</p>
                        </div>
                        <span className="text-figma-sm text-fw-success font-medium">Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Permissions
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
