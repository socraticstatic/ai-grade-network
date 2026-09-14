import { Shield, Lock, CheckCircle, AlertCircle, Key, UserCheck } from 'lucide-react';
import { Permission, PermissionRequirement, PERMISSION_LABELS } from '../../types/permissions';
import { permissionChecker } from '../../utils/permissionChecker';

interface PermissionBadgeProps {
  requirement: PermissionRequirement;
  variant?: 'default' | 'compact' | 'detailed';
  showTooltip?: boolean;
}

export function PermissionBadge({ requirement, variant = 'default', showTooltip = true }: PermissionBadgeProps) {
  const color = permissionChecker.getPermissionColor(requirement.permission);

  const colorClasses = {
    blue: 'bg-fw-blue-light text-fw-link border-fw-active',
    green: 'bg-fw-successLight text-fw-success border-fw-success',
    yellow: 'bg-fw-warnLight text-fw-warn border-fw-warn',
    red: 'bg-fw-errorLight text-fw-error border-fw-error',
    purple: 'bg-fw-accent text-fw-cobalt-700 border-fw-active',
    orange: 'bg-fw-warnLight text-fw-warn border-fw-warn',
    pink: 'bg-fw-errorLight text-fw-error border-fw-error',
    gray: 'bg-fw-neutral text-fw-disabled border-fw-secondary',
  }[color];

  const getIcon = () => {
    if (requirement.requiresMFA) return <Key className="h-3 w-3" />;
    if (requirement.requiresApproval) return <UserCheck className="h-3 w-3" />;
    if (requirement.role === 'super-admin') return <Shield className="h-3 w-3" />;
    return <Lock className="h-3 w-3" />;
  };

  const getLabel = () => {
    const permLabel = PERMISSION_LABELS[requirement.permission];

    if (variant === 'compact') {
      return permLabel;
    }

    let label = `Requires: ${permLabel}`;

    if (requirement.role) {
      label += ` (${permissionChecker.getRoleDisplayName(requirement.role)})`;
    }

    if (requirement.requiresMFA) {
      label += ' + MFA';
    }

    if (requirement.requiresApproval) {
      label += ' + Approval';
    }

    return label;
  };

  const getTooltipContent = () => {
    const parts = [];

    parts.push(`Permission: ${PERMISSION_LABELS[requirement.permission]}`);

    if (requirement.role) {
      parts.push(`Required Role: ${permissionChecker.getRoleDisplayName(requirement.role)}`);
    }

    if (requirement.resource) {
      parts.push(`Resource: ${requirement.resource}`);
    }

    if (requirement.scope) {
      parts.push(`Scope: ${requirement.scope}`);
    }

    if (requirement.requiresMFA) {
      parts.push('⚠️ Requires Multi-Factor Authentication');
    }

    if (requirement.requiresApproval) {
      parts.push('✓ Requires Manager Approval');
    }

    return parts.join('\n');
  };

  return (
    <div className="relative inline-flex group">
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-figma-sm font-medium border ${colorClasses}`}
      >
        {getIcon()}
        {variant !== 'compact' && <span>{getLabel()}</span>}
      </span>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-fw-gray-900 text-fw-linkPrimary text-figma-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-pre-line z-50 pointer-events-none min-w-max">
          {getTooltipContent()}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-fw-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PermissionIndicatorProps {
  allowed: boolean;
  reason?: string;
  className?: string;
}

export function PermissionIndicator({ allowed, reason, className = '' }: PermissionIndicatorProps) {
  if (allowed) {
    return (
      <div className={`inline-flex items-center gap-1 text-fw-success text-figma-sm ${className}`}>
        <CheckCircle className="h-3 w-3" />
        <span>Allowed</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex group">
      <div className={`inline-flex items-center gap-1 text-fw-error text-figma-sm ${className}`}>
        <AlertCircle className="h-3 w-3" />
        <span>Restricted</span>
      </div>

      {reason && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-fw-gray-900 text-fw-linkPrimary text-figma-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
          {reason}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-fw-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PermissionLockOverlayProps {
  requirement: PermissionRequirement;
  reason: string;
  onRequestAccess?: () => void;
  children?: React.ReactNode;
}

export function PermissionLockOverlay({ requirement, reason, onRequestAccess, children }: PermissionLockOverlayProps) {
  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center bg-fw-gray-900 bg-opacity-5 backdrop-blur-[1px]">
        <div className="bg-fw-base rounded-lg shadow-lg p-6 max-w-sm mx-4 border-2 border-fw-secondary">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 bg-fw-errorLight rounded-full flex items-center justify-center">
              <Lock className="h-5 w-5 text-fw-error" />
            </div>
            <div className="flex-1">
              <h3 className="text-figma-base font-semibold text-fw-heading mb-1 tracking-[-0.03em]">Permission Required</h3>
              <p className="text-figma-sm text-fw-bodyLight">{reason}</p>
            </div>
          </div>

          <div className="mb-4">
            <PermissionBadge requirement={requirement} variant="detailed" showTooltip={false} />
          </div>

          {onRequestAccess && (
            <button
              onClick={onRequestAccess}
              className="w-full px-4 py-2 bg-fw-cobalt-600 hover:bg-fw-ctaPrimaryHover text-white text-figma-base font-medium rounded-lg transition-colors"
            >
              Request Access
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
