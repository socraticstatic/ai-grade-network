import { Shield, Users, Lock, FileText, Settings, Info, ExternalLink } from 'lucide-react';
import { useStore } from '../../../../store/useStore';
import { ROLE_CATALOG } from '../../../../data/roleCatalog';
import { RoleName } from '../../../../types/rbac';

// The 5 representative roles shown to stakeholders
const SHOWCASE_ROLES: RoleName[] = [
  'Viewer',
  'NetworkEngineer',
  'ProvisioningManager',
  'TenantAdmin',
  'PlatformAdmin',
];

// Connection-related permissions to highlight per role
const CONNECTION_PERMS = [
  'connection:read',
  'connection:write',
  'connection:delete',
  'connection:operate',
  'connection:bandwidth',
  'connection:configure',
  'connection:export',
] as const;

const TIER_BADGE_COLORS: Record<string, string> = {
  tenant:   'bg-blue-100 text-blue-700 border-blue-200',
  reseller: 'bg-purple-100 text-purple-700 border-purple-200',
  platform: 'bg-red-100 text-red-700 border-red-200',
  client:   'bg-green-100 text-green-700 border-green-200',
};

function TierBadge({ tier }: { tier: string }) {
  const colorClass = TIER_BADGE_COLORS[tier] ?? 'bg-fw-neutral text-fw-body border-fw-secondary';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest border ${colorClass}`}>
      MAX: {tier.toUpperCase()}
    </span>
  );
}

function PermChip({ perm }: { perm: string }) {
  const [, action] = perm.split(':');
  const isWrite = ['write', 'delete', 'configure', 'bandwidth', 'operate'].includes(action);
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${
        isWrite
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-fw-accent text-fw-link border-fw-active'
      }`}
    >
      {perm}
    </span>
  );
}

export function AccessControlPolicy() {
  const { currentUserId, roleAssignments, roleDefinitions } = useStore(s => ({
    currentUserId: s.currentUserId,
    roleAssignments: s.roleAssignments,
    roleDefinitions: s.roleDefinitions,
  }));

  // Find first active assignment for the current user
  const activeAssignment = roleAssignments.find(
    a => a.principal.id === currentUserId && a.status === 'active'
  );

  // Look up display name — prefer the store's mutable roleDefinitions, fall back to ROLE_CATALOG
  let currentRoleDisplayName = 'No role assigned';
  if (activeAssignment) {
    const storeMatch = roleDefinitions.find(d => d.id === activeAssignment.role);
    const catalogMatch = ROLE_CATALOG[activeAssignment.role as RoleName];
    const displayName = storeMatch?.displayName ?? catalogMatch?.displayName;
    currentRoleDisplayName = displayName ?? activeAssignment.role;
  }

  const features = [
    {
      icon: Shield,
      title: 'Role-Based Access Control',
      description: 'Define who can access what resources based on their role in the organization',
      color: 'blue',
    },
    {
      icon: Users,
      title: 'User & Group Management',
      description: 'Organize users into groups with shared permissions and access levels',
      color: 'green',
    },
    {
      icon: Lock,
      title: 'Resource Permissions',
      description: 'Control access to connections, pools, billing, and system settings',
      color: 'red',
    },
    {
      icon: FileText,
      title: 'Audit & Compliance',
      description: 'Track all access attempts and changes for security and compliance',
      color: 'purple',
    },
  ];

  const bestPractices = [
    {
      title: 'Principle of Least Privilege',
      description: 'Users should only have the minimum permissions necessary to perform their job',
    },
    {
      title: 'Separation of Duties',
      description: 'Critical operations should require multiple approvers or roles',
    },
    {
      title: 'Regular Access Reviews',
      description: 'Periodically review and audit user permissions to ensure they remain appropriate',
    },
    {
      title: 'Just-In-Time Access',
      description: 'Grant temporary elevated permissions only when needed for specific tasks',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-fw-cobalt-600 text-white rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8" />
              <h2 className="text-figma-xl font-bold">Access Control & Security</h2>
            </div>
            <p className="text-white/80 text-figma-base max-w-3xl">
              Manage user permissions, roles, and security policies. Control who can access what resources across your organization.
            </p>
          </div>
        </div>
      </div>

      {/* Current Role Status */}
      <div className="bg-fw-base rounded-xl border-2 border-fw-active p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-fw-accent rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-fw-link" />
          </div>
          <div>
            <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Your Current Role</p>
            <p className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">{currentRoleDisplayName}</p>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div>
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Key Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colorClasses = {
              blue:   'bg-fw-accent text-fw-link border-fw-active',
              green:  'bg-fw-successLight text-fw-success border-fw-success',
              red:    'bg-fw-errorLight text-fw-error border-fw-error',
              purple: 'bg-fw-purpleLight text-fw-purple border-fw-purpleLight',
            }[feature.color];

            return (
              <div key={index} className="bg-fw-base border border-fw-secondary rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 border ${colorClasses}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h4 className="text-figma-base font-semibold text-fw-heading mb-2">{feature.title}</h4>
                <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Definitions */}
      <div>
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Role Definitions</h3>
        <div className="space-y-4">
          {SHOWCASE_ROLES.map(roleName => {
            const def = ROLE_CATALOG[roleName];
            if (!def) return null;

            const connPerms = CONNECTION_PERMS.filter(p => def.permissions.includes(p));
            const isCurrentRole = activeAssignment?.role === roleName;

            const RoleIcon = roleName === 'PlatformAdmin' ? Shield
              : roleName === 'TenantAdmin' ? Settings
              : roleName === 'Viewer' ? FileText
              : Users;

            return (
              <div
                key={roleName}
                className={`bg-fw-base rounded-xl border-2 p-5 ${
                  isCurrentRole ? 'border-fw-active bg-fw-accent' : 'border-fw-secondary'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isCurrentRole ? 'bg-fw-accent border border-fw-active' : 'bg-fw-neutral'
                    }`}>
                      <RoleIcon className={`h-6 w-6 ${isCurrentRole ? 'text-fw-link' : 'text-fw-body'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-figma-base font-bold text-fw-heading">{def.displayName}</h4>
                        <TierBadge tier={def.maxScopeTier} />
                      </div>
                      {isCurrentRole && (
                        <span className="text-figma-sm font-medium text-fw-link tracking-[-0.03em]">Your Current Role</span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-figma-sm font-medium text-fw-body tracking-[-0.03em] mb-3">{def.description}</p>

                {connPerms.length > 0 && (
                  <div>
                    <p className="text-figma-sm font-bold text-fw-bodyLight tracking-[-0.03em] mb-2">Connection permissions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {connPerms.map(p => <PermChip key={p} perm={p} />)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Security Best Practices */}
      <div>
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-4">Security Best Practices</h3>
        <div className="bg-fw-accent border border-fw-active rounded-xl p-5">
          <div className="space-y-4">
            {bestPractices.map((practice, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-fw-cobalt-600 text-white rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-figma-sm font-bold">{index + 1}</span>
                </div>
                <div>
                  <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-1">{practice.title}</h4>
                  <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">{practice.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Documentation Links */}
      <div className="bg-fw-wash border border-fw-secondary rounded-xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <Info className="h-5 w-5 text-fw-bodyLight mt-0.5" />
          <div>
            <h4 className="text-figma-base font-bold text-fw-heading tracking-[-0.03em] mb-1">Additional Resources</h4>
            <p className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Learn more about access control and security best practices</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.open('/RBAC_SHOWCASE_SUMMARY.md', '_blank');
            }}
            className="flex items-center gap-2 text-figma-base font-medium text-fw-link tracking-[-0.03em] hover:text-fw-linkHover"
          >
            <ExternalLink className="h-4 w-4" />
            Technical Documentation
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.open('/RBAC_DEMO_GUIDE.md', '_blank');
            }}
            className="flex items-center gap-2 text-figma-base font-medium text-fw-link tracking-[-0.03em] hover:text-fw-linkHover"
          >
            <ExternalLink className="h-4 w-4" />
            Demo Guide
          </a>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.open('/HOW_TO_SEE_RBAC_DEMO.md', '_blank');
            }}
            className="flex items-center gap-2 text-figma-base font-medium text-fw-link tracking-[-0.03em] hover:text-fw-linkHover"
          >
            <ExternalLink className="h-4 w-4" />
            Quick Start Guide
          </a>
        </div>
      </div>
    </div>
  );
}
