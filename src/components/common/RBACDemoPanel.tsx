import { useState } from 'react';
import { Shield, Eye, Users, Lock, FileText, Settings, DollarSign, X, ChevronRight, Info, Layers } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Button } from './Button';
import { RoleCapabilityMatrix } from './RoleCapabilityMatrix';
import { AuditLogPanel } from './AuditLogPanel';
import { ResourceFilterBadge } from './ResourceFilterBadge';
import { RoleName } from '../../types/rbac';
import { ROLE_CATALOG } from '../../data/roleCatalog';
import { permissionChecker } from '../../utils/permissionChecker';
import { scopeDepthLabel, scopePathToFilter } from '../../utils/scopeUtils';

interface RBACDemoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const KEY_PERSONAS: RoleName[] = [
  'NetworkEngineer', 'BillingAdmin', 'SecurityAdmin', 'TenantAdmin', 'Viewer', 'PlatformAdmin'
];

const tierToScopePath: Record<string, string> = {
  platform: '/platform',
  reseller: '/resellers/RSL-001',
  tenant: '/tenants/TNT-001',
  client: '/tenants/TNT-001/clients/CLT-001',
  pool: '/tenants/TNT-001/clients/CLT-001/pools/POOL-001',
  connection: '/tenants/TNT-001/clients/CLT-001/connections/conn-1',
  'hub': '/tenants/TNT-001/clients/CLT-001/hubs/cr-1',
};

export function RBACDemoPanel({ isOpen, onClose }: RBACDemoPanelProps) {
  const { currentRole, activePersona, setRole, setActivePersona } = useStore(s => ({
    currentRole: s.currentRole,
    activePersona: s.activePersona,
    setRole: s.setRole,
    setActivePersona: s.setActivePersona,
  }));
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);

  const persona = activePersona ? ROLE_CATALOG[activePersona] : null;
  const personaDisplayName = persona?.displayName ?? currentRole.replace(/-/g, ' ');

  const effectiveTier = persona?.maxScopeTier
    ?? (currentRole === 'super-admin' ? 'platform' : currentRole === 'admin' ? 'tenant' : 'client');
  const demoScopePath = tierToScopePath[effectiveTier] ?? '/tenants/TNT-001';
  const breadcrumb = scopeDepthLabel(demoScopePath);
  const scopeFilter = scopePathToFilter(demoScopePath);

  if (!isOpen) return null;

  const demoScenarios = KEY_PERSONAS.map(personaId => {
    const def = ROLE_CATALOG[personaId];
    const tier = def.maxScopeTier;
    return {
      id: personaId,
      title: def.displayName,
      persona: personaId,
      description: def.description,
      tier,
      steps: [
        `Switch to ${def.displayName}`,
        `Scope: ${tierToScopePath[tier] ?? '/tenants/TNT-001'}`,
        `${def.permissions.length} permissions active`,
        'View Permission Matrix to compare',
      ],
      icon: personaId === 'PlatformAdmin' ? Shield
        : personaId === 'BillingAdmin' ? DollarSign
        : personaId === 'SecurityAdmin' ? Lock
        : personaId === 'TenantAdmin' ? Users
        : personaId === 'Viewer' ? Eye
        : Settings,
      color: personaId === 'PlatformAdmin' ? 'purple'
        : personaId === 'SecurityAdmin' ? 'red'
        : personaId === 'BillingAdmin' ? 'blue'
        : 'green',
    };
  });

  const quickActions = [
    {
      id: 'matrix',
      label: 'View Permission Matrix',
      icon: Eye,
      action: () => setShowPermissionMatrix(true),
      description: 'Compare permissions across all personas'
    },
    {
      id: 'audit',
      label: 'View Audit Log',
      icon: FileText,
      action: () => setShowAuditLog(true),
      description: 'See activity tracking in action'
    },
    {
      id: 'billing',
      label: 'Test Billing Access',
      icon: DollarSign,
      action: () => {
        window.location.hash = '#/configure/billing';
        onClose();
      },
      description: 'Navigate to billing configuration'
    },
    {
      id: 'system',
      label: 'Test System Settings',
      icon: Settings,
      action: () => {
        window.location.hash = '#/configure/system';
        onClose();
      },
      description: 'Navigate to system settings'
    }
  ];

  const handleRunDemo = (scenario: typeof demoScenarios[0]) => {
    setActivePersona(scenario.persona);
    setSelectedDemo(scenario.id);
    window.addToast({
      type: 'info',
      title: `Demo: ${scenario.title}`,
      message: scenario.description,
      duration: 5000
    });
    if (scenario.id.includes('Billing')) {
      setTimeout(() => { window.location.hash = '#/configure/billing'; onClose(); }, 1000);
    } else if (scenario.id.includes('Security')) {
      setTimeout(() => { window.location.hash = '#/configure/system'; onClose(); }, 1000);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-fw-base rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2 tracking-[-0.03em]">RBAC Demo Control Panel</h2>
                <p className="text-white text-figma-base">
                  Interactive demonstrations of role-based access control best practices
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Current Persona Status */}
            <div className="bg-fw-accent border-2 border-fw-active rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-fw-cobalt-600 rounded-full flex items-center justify-center">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-figma-base text-fw-link font-medium">Current Persona</p>
                    <p className="text-lg font-bold text-fw-heading tracking-[-0.03em]">{personaDisplayName}</p>
                    {persona && (
                      <p className="text-figma-xs text-fw-bodyLight">{persona.permissions.length} permissions · {persona.maxScopeTier} tier</p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPermissionMatrix(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View My Permissions
                </Button>
              </div>

              {/* Scope Hierarchy */}
              <div className="mt-4 p-4 bg-fw-wash border border-fw-secondary rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-fw-link" />
                  <span className="text-figma-sm font-semibold text-fw-heading">Scope Hierarchy</span>
                </div>
                <p className="text-figma-xs text-fw-bodyLight mb-3">
                  Scope defines WHERE permissions apply. The same role at a narrower scope cannot see resources outside it.
                </p>
                <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                  {breadcrumb.map((label, i) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-figma-xs font-medium border ${
                        i === breadcrumb.length - 1
                          ? 'bg-fw-blue-light text-fw-link border-fw-active'
                          : 'bg-fw-wash text-fw-bodyLight border-fw-secondary'
                      }`}>
                        {label}
                      </span>
                      {i < breadcrumb.length - 1 && <ChevronRight className="h-3 w-3 text-fw-disabled" />}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-figma-xs text-fw-bodyLight">Effective access:</span>
                  <ResourceFilterBadge filter={scopeFilter} variant="detailed" />
                </div>
              </div>

              {/* Scope & Filter */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-fw-active">
                <div>
                  <p className="text-figma-sm text-fw-link font-medium mb-1">Default Resource Filter</p>
                  <ResourceFilterBadge filter={permissionChecker.getDefaultScope(currentRole)} showIcon={true} />
                </div>
                <div>
                  <p className="text-figma-sm text-fw-link font-medium mb-1">Maximum Filter Scope</p>
                  <ResourceFilterBadge filter={permissionChecker.getMaxScope(currentRole)} showIcon={true} />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-fw-active">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-fw-link mt-0.5 flex-shrink-0" />
                  <p className="text-figma-sm text-fw-link">
                    <span className="font-semibold">Resource Filters</span> control <em>which</em> resources you can access within your scope.
                    <span className="font-semibold"> Scope paths</span> define <em>where</em> in the hierarchy your permissions apply.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <h3 className="text-figma-base font-semibold text-fw-heading mb-3 flex items-center gap-2 tracking-[-0.03em]">
                <Info className="h-4 w-4" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={action.action}
                      className="flex items-center gap-3 p-4 bg-fw-base border-2 border-fw-secondary hover:border-fw-active hover:bg-fw-accent rounded-lg transition-all text-left group"
                    >
                      <div className="w-10 h-10 bg-fw-neutral group-hover:bg-fw-accent rounded-lg flex items-center justify-center transition-colors">
                        <Icon className="h-5 w-5 text-fw-bodyLight group-hover:text-fw-link" />
                      </div>
                      <div className="flex-1">
                        <p className="text-figma-base font-semibold text-fw-heading">{action.label}</p>
                        <p className="text-figma-sm text-fw-bodyLight">{action.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-fw-bodyLight group-hover:text-fw-link" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Demo Scenarios */}
            <div>
              <h3 className="text-figma-base font-semibold text-fw-heading mb-3 flex items-center gap-2 tracking-[-0.03em]">
                <Users className="h-4 w-4" />
                Guided Demo Scenarios
              </h3>
              <div className="space-y-3">
                {demoScenarios.map((scenario) => {
                  const Icon = scenario.icon;
                  const isActive = selectedDemo === scenario.id;
                  const colorClasses = {
                    blue: 'bg-fw-accent border-fw-active text-fw-link',
                    green: 'bg-fw-successLight border-fw-success text-fw-success',
                    red: 'bg-fw-errorLight border-fw-error text-fw-error',
                    purple: 'bg-fw-purpleLight border-fw-purple text-fw-purple'
                  }[scenario.color];

                  return (
                    <div
                      key={scenario.id}
                      className={`border-2 rounded-lg p-4 transition-all ${
                        isActive ? 'border-fw-active bg-fw-accent shadow-md' : 'border-fw-secondary bg-fw-base hover:border-fw-secondary'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-figma-base font-semibold text-fw-heading">{scenario.title}</h4>
                              <p className="text-figma-xs text-fw-bodyLight mt-0.5 capitalize">{scenario.tier} tier</p>
                              <p className="text-figma-sm text-fw-bodyLight mt-1 line-clamp-1">{scenario.description}</p>
                            </div>
                            <Button
                              variant={isActive ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleRunDemo(scenario)}
                            >
                              {isActive ? 'Running' : 'Run Demo'}
                            </Button>
                          </div>
                          <div className="mt-2">
                            <ol className="text-figma-xs text-fw-bodyLight space-y-0.5 list-decimal list-inside">
                              {scenario.steps.map((step, idx) => (
                                <li key={idx}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Persona Switcher */}
            <div className="mt-6 p-4 bg-fw-wash rounded-lg border border-fw-secondary">
              <h4 className="text-figma-base font-semibold text-fw-heading mb-3 tracking-[-0.03em]">Switch Persona</h4>
              <div className="grid grid-cols-3 gap-2">
                {KEY_PERSONAS.map((personaId) => {
                  const def = ROLE_CATALOG[personaId];
                  const isActive = activePersona === personaId;
                  return (
                    <button
                      key={personaId}
                      data-testid={`rbac-persona-${personaId}`}
                      onClick={() => setActivePersona(personaId)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isActive
                          ? 'border-fw-active bg-fw-accent shadow-sm'
                          : 'border-fw-secondary bg-fw-base hover:border-fw-active'
                      }`}
                    >
                      <p className={`text-figma-xs font-semibold ${isActive ? 'text-fw-heading' : 'text-fw-body'}`}>
                        {def.displayName}
                      </p>
                      <p className="text-[10px] text-fw-bodyLight mt-0.5 capitalize">{def.maxScopeTier}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-fw-secondary p-4 bg-fw-wash">
            <div className="flex items-center justify-between">
              <p className="text-figma-sm text-fw-bodyLight">
                Tip: Run a demo scenario to see RBAC in action
              </p>
              <Button variant="outline" onClick={onClose}>Close Panel</Button>
            </div>
          </div>
        </div>
      </div>

      <RoleCapabilityMatrix
        isOpen={showPermissionMatrix}
        onClose={() => setShowPermissionMatrix(false)}
        currentRole={currentRole}
      />

      <AuditLogPanel
        isOpen={showAuditLog}
        onClose={() => setShowAuditLog(false)}
      />
    </>
  );
}
