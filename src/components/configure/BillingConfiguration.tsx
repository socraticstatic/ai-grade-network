import { useState } from 'react';
import { Building2, DollarSign, Users, Settings, Shield, Lock, Eye, FileText, Info } from 'lucide-react';
import { VerticalTabGroup } from '../navigation/VerticalTabGroup';
import { TabItem } from '../../types/navigation';
import { Button } from '../common/Button';
import { PermissionBadge } from '../common/PermissionBadge';
import { useStore } from '../../store/useStore';
import { PermissionRequestModal } from '../common/PermissionRequestModal';
import { AuditLogPanel } from '../common/AuditLogPanel';
import { permissionChecker } from '../../utils/permissionChecker';
import { AccountBillingOverview } from './billing/AccountBillingOverview';

interface BillingConfigurationProps {
  defaultTab?: 'overview' | 'hierarchy' | 'allocation' | 'integration' | 'policies';
}

export function BillingConfiguration({ defaultTab = 'overview' }: BillingConfigurationProps) {
  const [activeView, setActiveView] = useState<'overview' | 'hierarchy' | 'allocation' | 'integration' | 'policies'>(defaultTab);
  const { currentRole } = useStore();
  const [showPermissionRequest, setShowPermissionRequest] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [requestedFeature, setRequestedFeature] = useState('');

  // Check permissions for billing operations
  const canViewBilling = permissionChecker.hasPermission(currentRole, { permission: 'view', resource: 'billing' });
  const canManageBilling = permissionChecker.hasPermission(currentRole, { permission: 'manage_billing', resource: 'billing' });
  const canModifyPayment = permissionChecker.hasPermission(currentRole, {
    permission: 'manage_billing',
    resource: 'billing',
    requiresMFA: true
  });

  const [hierarchy, setHierarchy] = useState({
    enableTenantHierarchy: true,
    allowSubtenantCreation: true,
    inheritBillingFromParent: false,
    consolidatedBilling: true,
    maxSubtenantLevels: 3
  });

  const [allocation, setAllocation] = useState({
    defaultAllocationMethod: 'pool',
    enableChargebacks: true,
    allowCostCenterOverride: false,
    requireBudgetApproval: true,
    enableShowback: true
  });

  const [integration, setIntegration] = useState({
    enableBusinessCenterIntegration: false,
    businessCenterAccountId: '',
    syncBillingData: false,
    syncFrequency: 'daily',
    showBusinessCenterData: false
  });

  const [policies, setPolicies] = useState({
    requirePONumbers: false,
    enableBudgetAlerts: true,
    budgetAlertThreshold: 80,
    allowOverageCharges: true,
    requireApprovalForOverages: true
  });

  const handleSaveSettings = () => {
    window.addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Billing configuration updated successfully',
      duration: 3000
    });
  };

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Billing Overview', icon: <FileText className="h-5 w-5 mr-2" /> },
    { id: 'hierarchy', label: 'Tenant Hierarchy', icon: <Building2 className="h-5 w-5 mr-2" /> },
    { id: 'allocation', label: 'Cost Allocation', icon: <DollarSign className="h-5 w-5 mr-2" /> },
    { id: 'integration', label: 'External Integration', icon: <Users className="h-5 w-5 mr-2" /> },
    { id: 'policies', label: 'Billing Policies', icon: <Settings className="h-5 w-5 mr-2" /> }
  ];

  const handleRequestAccess = (feature: string) => {
    setRequestedFeature(feature);
    setShowPermissionRequest(true);
  };

  return (
    <div className="p-6">
      {/* Permission & Audit Controls */}
      <div className="mb-4 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          icon={Eye}
          onClick={() => window.addToast({ type: 'info', title: 'Your Permissions', message: `Current Role: ${currentRole}\nBilling Access: ${canManageBilling.allowed ? 'Full' : 'View Only'}`, duration: 5000 })}
        >
          My Permissions
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={FileText}
          onClick={() => setShowAuditLog(true)}
        >
          View Audit Log
        </Button>
      </div>

      {/* Permission Warning Banner */}
      {!canManageBilling.allowed && (
        <div className="mb-6 bg-fw-warnLight border-2 border-fw-warn rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Lock className="h-5 w-5 text-fw-warn mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-1">Limited Billing Access</h3>
              <p className="text-figma-sm font-medium text-fw-warn tracking-[-0.03em] mb-2">
                You can view billing settings but cannot make changes. {canManageBilling.reason}
              </p>
              <div className="flex items-center gap-2">
                <PermissionBadge requirement={{ permission: 'manage_billing', resource: 'billing' }} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRequestAccess('Billing Configuration')}
                >
                  Request Access
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Banner */}
      <div className="mb-6 bg-gradient-to-r from-fw-wash to-fw-base border border-fw-secondary rounded-xl p-4">
        <div className="flex items-start">
          <Building2 className="h-6 w-6 text-fw-link mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">Enterprise Billing Configuration</h3>
            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">
              Configure account-wide billing settings, tenant hierarchy, cost allocation methods, and integration with external billing systems. These settings apply across your entire organization.
            </p>
          </div>
        </div>
      </div>

      {/* AWS Max Billing Model */}
      <div className="mb-6 bg-fw-base border border-fw-active/30 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-fw-accent border-b border-fw-active/20 flex items-center gap-2">
          <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" alt="AWS" className="w-8 h-4 object-contain" />
          <Shield className="h-4 w-4 text-fw-link" />
          <span className="text-figma-sm font-semibold text-fw-heading">AWS Max Billing Model</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-[8px] text-[10px] font-medium" style={{ color: '#0057b8', backgroundColor: 'rgba(0,87,184,0.16)' }}>AWS Interconnect – last mile</span>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div>
              <p className="text-figma-xs text-fw-bodyLight">Billing Trigger</p>
              <p className="text-figma-sm font-semibold text-fw-heading">BGP Established</p>
            </div>
            <div>
              <p className="text-figma-xs text-fw-bodyLight flex items-center gap-1">
                Billing Model
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ color: '#cc7a00', backgroundColor: 'rgba(204,122,0,0.12)' }}>June</span>
              </p>
              <p className="text-figma-sm font-semibold text-fw-heading">Fixed Rate</p>
            </div>
            <div>
              <p className="text-figma-xs text-fw-bodyLight flex items-center gap-1">
                Billing Model
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ color: '#2d7e24', backgroundColor: 'rgba(45,126,36,0.12)' }}>Nov</span>
              </p>
              <p className="text-figma-sm font-semibold text-fw-heading">95th Percentile Burstable</p>
            </div>
            <div>
              <p className="text-figma-xs text-fw-bodyLight">Contract Mapping</p>
              <p className="text-figma-sm font-semibold text-fw-heading">1 Contract : 4 AWS IDs</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-2 rounded-lg bg-fw-wash border border-fw-secondary">
            <Info className="h-3.5 w-3.5 text-fw-bodyLight shrink-0 mt-0.5" />
            <p className="text-figma-xs text-fw-bodyLight">
              AWS Max contracts map a single billing contract to 4 AWS hosted connection IDs. Early termination fees apply to fixed-term contracts (12/24/36 mo). Trial and M2M contracts can disconnect without penalty.
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
          {/* Account Billing Overview */}
          {activeView === 'overview' && <AccountBillingOverview />}

          {/* Tenant Hierarchy */}
          {activeView === 'hierarchy' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Tenant & Client Account Hierarchy</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Configure how your organization's billing hierarchy is structured. This supports multi-tenant deployments and parent-child account relationships.
                </p>

                <div className="space-y-6">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={hierarchy.enableTenantHierarchy}
                      onChange={(e) => setHierarchy({...hierarchy, enableTenantHierarchy: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Tenant Hierarchy</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Support parent-child tenant relationships for white-label deployments</p>
                    </div>
                  </label>

                  {hierarchy.enableTenantHierarchy && (
                    <>
                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={hierarchy.allowSubtenantCreation}
                          onChange={(e) => setHierarchy({...hierarchy, allowSubtenantCreation: e.target.checked})}
                          className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <div>
                          <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Allow Sub-Tenant Creation</span>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Parent tenants can create and manage child tenant accounts</p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={hierarchy.inheritBillingFromParent}
                          onChange={(e) => setHierarchy({...hierarchy, inheritBillingFromParent: e.target.checked})}
                          className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <div>
                          <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Inherit Billing from Parent</span>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Child tenants automatically inherit billing configuration from parent tenant</p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={hierarchy.consolidatedBilling}
                          onChange={(e) => setHierarchy({...hierarchy, consolidatedBilling: e.target.checked})}
                          className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <div>
                          <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Consolidated Billing</span>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Roll up all child tenant charges to parent tenant's billing account</p>
                        </div>
                      </label>

                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Maximum Sub-Tenant Levels</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={hierarchy.maxSubtenantLevels}
                          onChange={(e) => setHierarchy({...hierarchy, maxSubtenantLevels: parseInt(e.target.value)})}
                          className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                        />
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Maximum depth of tenant hierarchy (1-10 levels)</p>
                      </div>
                    </>
                  )}

                  <div className="pt-4 border-t border-fw-secondary">
                    <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-3">Hierarchy Model</h4>
                    <div className="bg-fw-wash p-4 rounded-lg space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">🏢</div>
                        <div>
                          <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Parent Tenant (White-Label Provider)</p>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">Master account with full administrative control</p>
                        </div>
                      </div>
                      <div className="ml-6 flex items-start space-x-3">
                        <div className="text-2xl">🏪</div>
                        <div>
                          <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Child Tenant (Enterprise Customer)</p>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">Isolated account with dedicated resources and billing</p>
                        </div>
                      </div>
                      <div className="ml-12 flex items-start space-x-3">
                        <div className="text-2xl">👥</div>
                        <div>
                          <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Sub-Tenant (Department/Division)</p>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">Organizational unit within enterprise customer</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <div className="flex items-center gap-2">
                    <PermissionBadge
                      requirement={{ permission: 'manage_billing', resource: 'billing' }}
                      variant="compact"
                    />
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleSaveSettings}
                    disabled={!canManageBilling.allowed}
                  >
                    {canManageBilling.allowed ? 'Save Hierarchy Settings' : 'View Only Mode'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Cost Allocation */}
          {activeView === 'allocation' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Cost Allocation & Chargeback</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Define how costs are allocated across departments, pools, and cost centers. Configure chargeback and showback reporting.
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Default Allocation Method</label>
                    <select
                      value={allocation.defaultAllocationMethod}
                      onChange={(e) => setAllocation({...allocation, defaultAllocationMethod: e.target.value})}
                      className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                    >
                      <option value="pool">By Pool</option>
                      <option value="connection">By Connection</option>
                      <option value="costCenter">By Cost Center</option>
                      <option value="department">By Department</option>
                      <option value="project">By Project</option>
                      <option value="custom">Custom Allocation</option>
                    </select>
                    <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">How costs are distributed across organizational units</p>
                  </div>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={allocation.enableChargebacks}
                      onChange={(e) => setAllocation({...allocation, enableChargebacks: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Chargeback</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Allocate actual costs to departments/pools with billing responsibility</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={allocation.enableShowback}
                      onChange={(e) => setAllocation({...allocation, enableShowback: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Showback</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Show cost allocation for reporting purposes without actual billing</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={allocation.allowCostCenterOverride}
                      onChange={(e) => setAllocation({...allocation, allowCostCenterOverride: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Allow Cost Center Override</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Users can override default cost center assignment (requires approval)</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={allocation.requireBudgetApproval}
                      onChange={(e) => setAllocation({...allocation, requireBudgetApproval: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Require Budget Approval</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">New connections require approval if they exceed pool or department budgets</p>
                    </div>
                  </label>

                  <div className="pt-4 border-t border-fw-secondary">
                    <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-3">Allocation Rules</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-xl">
                        <div>
                          <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Unallocated Resources</p>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">Resources without pool assignment</p>
                        </div>
                        <select className="text-figma-base font-medium tracking-[-0.03em] border border-fw-secondary rounded-lg px-2 py-1">
                          <option>Corporate General</option>
                          <option>IT Operations</option>
                          <option>Unassigned</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-xl">
                        <div>
                          <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Shared Resources</p>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">Resources used by multiple pools</p>
                        </div>
                        <select className="text-figma-base font-medium tracking-[-0.03em] border border-fw-secondary rounded-lg px-2 py-1">
                          <option>Split Equally</option>
                          <option>By Usage</option>
                          <option>Primary Owner</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Allocation Settings
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* External Integration */}
          {activeView === 'integration' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">External Billing Integration</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Configure integration with external billing systems such as AT&T Business Center. Customers with existing SLAs can opt-in to display their billing data within this portal.
                </p>

                <div className="space-y-6">
                  <div className="p-4 bg-fw-accent border border-fw-active rounded-xl">
                    <div className="flex items-start space-x-3">
                      <Building2 className="h-5 w-5 text-fw-link mt-0.5" />
                      <div>
                        <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-1">AT&T Business Center Integration</h4>
                        <p className="text-figma-sm font-medium text-fw-body tracking-[-0.03em]">
                          Connect to AT&T Business Center to sync billing data and display SLA information for customers with existing agreements.
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={integration.enableBusinessCenterIntegration}
                      onChange={(e) => setIntegration({...integration, enableBusinessCenterIntegration: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Business Center Integration</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Connect this portal to AT&T Business Center for billing synchronization</p>
                    </div>
                  </label>

                  {integration.enableBusinessCenterIntegration && (
                    <>
                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Business Center Account ID</label>
                        <input
                          type="text"
                          value={integration.businessCenterAccountId}
                          onChange={(e) => setIntegration({...integration, businessCenterAccountId: e.target.value})}
                          placeholder="Enter your Business Center Account ID"
                          className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                        />
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Primary account identifier in AT&T Business Center</p>
                      </div>

                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={integration.syncBillingData}
                          onChange={(e) => setIntegration({...integration, syncBillingData: e.target.checked})}
                          className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <div>
                          <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Sync Billing Data</span>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Automatically synchronize invoices and billing data from Business Center</p>
                        </div>
                      </label>

                      {integration.syncBillingData && (
                        <div>
                          <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Sync Frequency</label>
                          <select
                            value={integration.syncFrequency}
                            onChange={(e) => setIntegration({...integration, syncFrequency: e.target.value})}
                            className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                          >
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="manual">Manual Only</option>
                          </select>
                        </div>
                      )}

                      <label className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={integration.showBusinessCenterData}
                          onChange={(e) => setIntegration({...integration, showBusinessCenterData: e.target.checked})}
                          className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                        />
                        <div>
                          <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Display Business Center Data</span>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Show Business Center SLA and billing information in this portal</p>
                        </div>
                      </label>

                      <div className="pt-4 border-t border-fw-secondary">
                        <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-3">Integration Status</h4>
                        <div className="flex items-center justify-between p-3 bg-fw-successLight border border-fw-success rounded-xl">
                          <div className="flex items-center space-x-2">
                            <div className="h-2 w-2 rounded-full bg-fw-success"></div>
                            <span className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">Connected to Business Center</span>
                          </div>
                          <span className="text-figma-sm font-medium text-fw-success">Last sync: 2 hours ago</span>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button variant="outline">
                          Test Business Center Connection
                        </Button>
                      </div>
                    </>
                  )}

                  <div className="pt-4 border-t border-fw-secondary">
                    <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-3">Other Integrations</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-xl">
                        <div>
                          <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Globus</p>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">Sync billing and invoicing with Globus</p>
                        </div>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-xl">
                        <div>
                          <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">SAP ERP Integration</p>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">Export billing data to SAP</p>
                        </div>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-xl">
                        <div>
                          <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Oracle Financials</p>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">Sync with Oracle Cloud</p>
                        </div>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-xl">
                        <div>
                          <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Custom API Endpoint</p>
                          <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">Send billing data to custom endpoint</p>
                        </div>
                        <Button variant="outline" size="sm">Configure</Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Integration Settings
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Billing Policies */}
          {activeView === 'policies' && (
            <div className="space-y-6">
              <div className="bg-fw-base rounded-2xl border border-fw-secondary p-6">
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Billing Policies & Controls</h3>
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-6">
                  Configure account-wide billing policies, approval requirements, and budget controls.
                </p>

                <div className="space-y-6">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.requirePONumbers}
                      onChange={(e) => setPolicies({...policies, requirePONumbers: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Require Purchase Order Numbers</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">All billable resources must have an associated PO number</p>
                    </div>
                  </label>

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.enableBudgetAlerts}
                      onChange={(e) => setPolicies({...policies, enableBudgetAlerts: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable Budget Alerts</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Send notifications when spending approaches budget limits</p>
                    </div>
                  </label>

                  {policies.enableBudgetAlerts && (
                    <div>
                      <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Budget Alert Threshold (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={policies.budgetAlertThreshold}
                        onChange={(e) => setPolicies({...policies, budgetAlertThreshold: parseInt(e.target.value)})}
                        className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link"
                      />
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Send alert when spending reaches this percentage of budget</p>
                    </div>
                  )}

                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={policies.allowOverageCharges}
                      onChange={(e) => setPolicies({...policies, allowOverageCharges: e.target.checked})}
                      className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                    />
                    <div>
                      <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Allow Overage Charges</span>
                      <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Permit spending beyond allocated budgets (with optional approval)</p>
                    </div>
                  </label>

                  {policies.allowOverageCharges && (
                    <label className="flex items-start space-x-3 ml-7">
                      <input
                        type="checkbox"
                        checked={policies.requireApprovalForOverages}
                        onChange={(e) => setPolicies({...policies, requireApprovalForOverages: e.target.checked})}
                        className="mt-1 h-4 w-4 text-fw-link focus:ring-fw-link border-fw-secondary rounded"
                      />
                      <div>
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Require Approval for Overages</span>
                        <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">Overage charges must be approved before proceeding</p>
                      </div>
                    </label>
                  )}

                  <div className="pt-4 border-t border-fw-secondary">
                    <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-3">Billing Cycles</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Billing Period</label>
                        <select className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link">
                          <option>Monthly</option>
                          <option>Quarterly</option>
                          <option>Annually</option>
                          <option>Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-figma-base font-medium text-fw-body tracking-[-0.03em] mb-2">Billing Day</label>
                        <select className="w-full px-3 h-9 border border-fw-secondary rounded-lg text-figma-base focus:ring-2 focus:ring-fw-link focus:border-fw-link">
                          <option>1st of month</option>
                          <option>15th of month</option>
                          <option>Last day of month</option>
                          <option>Custom</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-fw-secondary">
                    <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-3">Invoice Preferences</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-xl">
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Invoice Delivery Method</span>
                        <select className="text-figma-base font-medium tracking-[-0.03em] border border-fw-secondary rounded-lg px-2 py-1">
                          <option>Email</option>
                          <option>Portal Only</option>
                          <option>Both</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-xl">
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Invoice Format</span>
                        <select className="text-figma-base font-medium tracking-[-0.03em] border border-fw-secondary rounded-lg px-2 py-1">
                          <option>PDF</option>
                          <option>Excel</option>
                          <option>CSV</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-fw-wash rounded-xl">
                        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Payment Terms</span>
                        <select className="text-figma-base font-medium tracking-[-0.03em] border border-fw-secondary rounded-lg px-2 py-1">
                          <option>Net 30</option>
                          <option>Net 60</option>
                          <option>Net 90</option>
                          <option>Due on Receipt</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={handleSaveSettings}>
                    Save Billing Policies
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission Request Modal */}
      {showPermissionRequest && (
        <PermissionRequestModal
          isOpen={showPermissionRequest}
          onClose={() => setShowPermissionRequest(false)}
          requirement={{ permission: 'manage_billing', resource: 'billing' }}
          resourceName={requestedFeature}
        />
      )}

      {/* Audit Log Panel */}
      <AuditLogPanel
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
        filterByResource="Billing"
      />
    </div>
  );
}
