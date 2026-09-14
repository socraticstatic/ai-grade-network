import { useState } from 'react';
import { Check, X, Shield, Crown, ChevronDown, ChevronUp, Info, Settings, Eye, DollarSign, Lock, ChevronRight } from 'lucide-react';
import { Modal } from './Modal';
import { useStore } from '../../store/useStore';
import { RoleName } from '../../types/rbac';
import { ROLE_CATALOG } from '../../data/roleCatalog';

interface RoleCapabilityMatrixProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole?: string;
  highlightRole?: string;
}

const KEY_PERSONAS: RoleName[] = [
  'Viewer', 'NetworkEngineer', 'BillingAdmin', 'SecurityAdmin', 'TenantAdmin', 'PlatformAdmin'
];

const permissionCategories = [
  {
    key: 'network',
    label: 'Network Resources',
    description: 'Connections, links, subnets, hubs',
    permissions: ['connection:read', 'connection:write', 'connection:delete', 'connection:operate'] as const,
  },
  {
    key: 'users',
    label: 'User Management',
    description: 'Invite, manage, and delete users',
    permissions: ['user:read', 'user:write', 'user:delete'] as const,
  },
  {
    key: 'billing',
    label: 'Billing',
    description: 'View and manage billing, export data',
    permissions: ['billing:read', 'billing:finance', 'billing:export'] as const,
  },
  {
    key: 'system',
    label: 'System & Platform',
    description: 'System configuration, instance management',
    permissions: ['system:configure', 'system:administer', 'instance:add', 'reseller:write'] as const,
  },
] as const;

function getPersonaIcon(personaId: RoleName) {
  switch (personaId) {
    case 'PlatformAdmin': return <Crown className="h-3.5 w-3.5" />;
    case 'TenantAdmin': return <Shield className="h-3.5 w-3.5" />;
    case 'SecurityAdmin': return <Lock className="h-3.5 w-3.5" />;
    case 'BillingAdmin': return <DollarSign className="h-3.5 w-3.5" />;
    case 'Viewer': return <Eye className="h-3.5 w-3.5" />;
    default: return <Settings className="h-3.5 w-3.5" />;
  }
}

export function RoleCapabilityMatrix({ isOpen, onClose }: RoleCapabilityMatrixProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('network');
  const activePersona = useStore(s => s.activePersona);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Role Capability Matrix" size="large">
      <div className="space-y-6">
        {/* Header Info */}
        <div className="bg-fw-accent border border-fw-active rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-fw-link mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-figma-base font-semibold text-fw-heading mb-1 tracking-[-0.03em]">Understanding Personas & Permissions</h4>
              <p className="text-figma-sm text-fw-link">
                This matrix shows what each named role can do. Your active persona is <span className="font-semibold">{activePersona ? ROLE_CATALOG[activePersona]?.displayName : 'none'}</span>.
                Broader tiers inherit all narrower-tier permissions via cascade.
              </p>
            </div>
          </div>
        </div>

        {/* Persona Headers — 7 columns: label + 6 personas */}
        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 gap-2 pb-4 border-b border-fw-secondary">
              <div className="text-[13px] font-medium text-fw-heading">Permission</div>
              {KEY_PERSONAS.map((personaId) => {
                const def = ROLE_CATALOG[personaId];
                const isActive = activePersona === personaId;
                return (
                  <div
                    key={personaId}
                    className={`text-center rounded-lg p-2 ${isActive ? 'bg-fw-wash border border-fw-secondary' : ''}`}
                  >
                    <div className={`inline-flex items-center gap-1 text-[11px] font-medium tracking-[-0.03em] ${isActive ? 'text-fw-link' : 'text-fw-heading'}`}>
                      {getPersonaIcon(personaId)}
                      <span>{def.displayName}</span>
                    </div>
                    <div className="text-[10px] text-fw-bodyLight mt-0.5 capitalize">{def.maxScopeTier}</div>
                    {isActive && <div className="text-[10px] text-fw-link font-medium mt-0.5">Active</div>}
                  </div>
                );
              })}
            </div>

            {/* Permission Categories */}
            {permissionCategories.map((category) => (
              <div key={category.key} className="rounded-lg border border-fw-secondary overflow-hidden mt-3">
                <button
                  onClick={() => toggleSection(category.key)}
                  className="tab-button w-full flex items-center justify-between px-4 py-3 hover:bg-fw-wash transition-colors"
                >
                  <div className="text-left">
                    <h3 className="text-[13px] font-medium text-fw-heading">{category.label}</h3>
                    <p className="text-[11px] text-fw-bodyLight mt-0.5">{category.description}</p>
                  </div>
                  {expandedSection === category.key
                    ? <ChevronUp className="h-4 w-4 text-fw-bodyLight" />
                    : <ChevronDown className="h-4 w-4 text-fw-bodyLight" />}
                </button>

                {expandedSection === category.key && (
                  <div className="divide-y divide-fw-secondary">
                    {category.permissions.map((permission) => (
                      <div key={permission} className="grid grid-cols-7 gap-2 items-center px-4 py-2.5">
                        <div className="text-[12px] text-fw-body font-mono">{permission}</div>
                        {KEY_PERSONAS.map((personaId) => {
                          const hasPerm = ROLE_CATALOG[personaId].permissions.includes(permission as any);
                          return (
                            <div key={personaId} className="flex items-center justify-center">
                              {hasPerm ? (
                                <div className="flex items-center gap-1 text-fw-success">
                                  <Check className="h-3.5 w-3.5" />
                                  <span className="text-[11px] font-medium">Yes</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-fw-bodyLight">
                                  <X className="h-3.5 w-3.5" />
                                  <span className="text-[11px]">No</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tier Cascade */}
        <div className="bg-fw-wash border border-fw-secondary rounded-lg p-4">
          <h4 className="text-figma-base font-semibold text-fw-heading mb-3 tracking-[-0.03em]">Permission Tier Cascade</h4>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {(['client', 'tenant', 'reseller', 'platform'] as const).map((tier, i, arr) => (
              <div key={tier} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className="text-figma-xs font-semibold text-fw-heading capitalize">{tier}</div>
                  <div className="text-[10px] text-fw-bodyLight">includes {tier} perms</div>
                </div>
                {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-fw-disabled" />}
              </div>
            ))}
          </div>
          <p className="text-figma-xs text-fw-bodyLight text-center mt-3">Broader tiers include all narrower-tier permissions via cascade.</p>
        </div>

        {/* Scope Path Examples */}
        <div className="bg-fw-accent border border-fw-active rounded-lg p-4">
          <h4 className="text-figma-base font-semibold text-fw-heading mb-2 tracking-[-0.03em]">Understanding Scope Paths</h4>
          <p className="text-figma-sm text-fw-link mb-3">Scope paths define <em>where</em> in the resource hierarchy your permissions apply. Permissions inherit down the tree.</p>
          <div className="bg-fw-base border border-fw-active rounded-lg p-3">
            <div className="space-y-1 text-figma-sm font-mono text-fw-body">
              <div className="flex items-center gap-2">
                <span className="text-fw-bodyLight">├─</span>
                <code className="bg-fw-neutral px-2 py-0.5 rounded">/platform</code>
                <span className="text-fw-bodyLight">(entire platform)</span>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <span className="text-fw-bodyLight">├─</span>
                <code className="bg-fw-neutral px-2 py-0.5 rounded">/tenants/acme-corp</code>
                <span className="text-fw-bodyLight">(tenant scope)</span>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <span className="text-fw-bodyLight">└─</span>
                <code className="bg-fw-neutral px-2 py-0.5 rounded">/tenants/acme-corp/clients/eng</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
