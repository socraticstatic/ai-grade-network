// src/components/common/ScopeInput.tsx
// Scope path text input with tier inference and validation feedback.
// Replaces bare <input type="text" placeholder="/tenants/..." /> for any scope field.
import { useMemo } from 'react';
import { buildScopePath, ScopeTier } from '../../types/rbac';

interface ScopeInputProps {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  className?: string;
  placeholder?: string;
  label?: string;
  required?: boolean;
  helpText?: string;
}

const TIER_LABELS: Record<ScopeTier, string> = {
  platform: 'Platform',
  reseller: 'Reseller',
  tenant: 'Tenant',
  client: 'Client',
  pool: 'Pool',
  connection: 'Connection',
  'hub': 'Hub',
};

const TIER_COLORS: Record<ScopeTier, string> = {
  platform: 'bg-fw-errorLight text-fw-error border-fw-error',
  reseller: 'bg-fw-warnLight text-fw-warn border-fw-warn',
  tenant: 'bg-fw-accent text-fw-cobalt-700 border-fw-active',
  client: 'bg-fw-successLight text-fw-success border-fw-success',
  pool: 'bg-fw-neutral text-fw-body border-fw-secondary',
  connection: 'bg-fw-neutral text-fw-disabled border-fw-secondary',
  'hub': 'bg-fw-neutral text-fw-disabled border-fw-secondary',
};

const EXAMPLE_PATHS: Record<ScopeTier, string> = {
  platform: '/',
  reseller: '/resellers/RSL-001',
  tenant: '/tenants/TNT-001',
  client: '/tenants/TNT-001/clients/CLT-A',
  pool: '/tenants/TNT-001/clients/CLT-A/pools/POOL-NE',
  connection: '/tenants/TNT-001/clients/CLT-A/pools/POOL-NE/connections/conn-1',
  'hub': '/tenants/TNT-001/clients/CLT-A/pools/POOL-NE/hubs/router-1',
};

export function ScopeInput({
  value,
  onChange,
  error,
  className = '',
  placeholder = '/tenants/TNT-001',
  label,
  required,
  helpText,
}: ScopeInputProps) {
  const parsed = useMemo(() => {
    if (!value.trim()) return null;
    try {
      return buildScopePath(value.trim());
    } catch {
      return null;
    }
  }, [value]);

  const tier = parsed?.tier ?? null;

  return (
    <div className={className}>
      {label && (
        <label className="block text-figma-sm font-medium text-fw-heading mb-1.5">
          {label} {required && <span className="text-fw-error">*</span>}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 text-figma-sm border rounded-lg bg-fw-base text-fw-heading font-mono focus:outline-none focus:ring-2 focus:ring-fw-active ${
          error ? 'border-fw-error' : 'border-fw-secondary'
        }`}
      />
      <div className="mt-1 flex items-center gap-2 flex-wrap">
        {tier && (
          <span className={`px-2 py-0.5 text-figma-xs font-medium rounded-md border ${TIER_COLORS[tier]}`}>
            {TIER_LABELS[tier]}
          </span>
        )}
        {tier && (
          <span className="text-figma-xs text-fw-bodyLight">
            Example: <span className="font-mono">{EXAMPLE_PATHS[tier]}</span>
          </span>
        )}
        {error && <p className="text-figma-xs text-fw-error">{error}</p>}
        {!error && helpText && <p className="text-figma-xs text-fw-bodyLight">{helpText}</p>}
      </div>
    </div>
  );
}
