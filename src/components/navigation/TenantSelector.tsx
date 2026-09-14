import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Settings, Check, User, Building2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { mockTenants } from '../../data/mockTenants';

interface TenantSelectorProps {
  className?: string;
  onProfileClick?: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  'bg-fw-link', 'bg-fw-success', 'bg-fw-purple',
  'bg-fw-warn', 'bg-fw-error', 'bg-fw-info',
];

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

const PLAN_BADGES: Record<string, { label: string; color: string }> = {
  enterprise: { label: 'Enterprise', color: 'bg-fw-purple text-white' },
  professional: { label: 'Professional', color: 'bg-fw-link text-white' },
  starter: { label: 'Starter', color: 'bg-fw-neutral text-fw-body' },
};

export function TenantSelector({ className = '', onProfileClick }: TenantSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeTenantId = useStore(state => state.activeTenantId);
  const activeTenant = useStore(state => state.activeTenant);
  const setActiveTenant = useStore(state => state.setActiveTenant);
  const tenantBranding = useStore(state => state.tenantBranding);

  const isATT = activeTenantId === 'TNT-001';

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const activeTenants = mockTenants.filter(t => t.status === 'active' || t.status === 'trial');
  const filteredTenants = activeTenants.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (tenantId: string) => {
    setActiveTenant(tenantId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-fw-wash transition-colors"
      >
        {!isATT ? (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ backgroundColor: tenantBranding.primaryColor }}
          >
            {getInitials(activeTenant?.name || '')}
          </div>
        ) : (
          <User className="h-5 w-5 text-fw-heading" />
        )}
        <ChevronDown className={`w-4 h-4 text-fw-bodyLight transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[320px] max-h-[624px] bg-fw-base rounded-3xl border border-fw-secondary shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 border-b border-fw-secondary">
            <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mb-3">
              Switch Account
            </p>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fw-bodyLight" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search accounts..."
                className="w-full h-10 pl-9 pr-4 rounded-lg border border-fw-secondary bg-fw-wash text-figma-base text-fw-body tracking-[-0.03em] placeholder:text-fw-bodyLight focus:outline-none focus:ring-2 focus:ring-fw-link focus:border-transparent"
              />
            </div>
          </div>

          {/* Tenant List */}
          <div className="flex-1 overflow-y-auto py-2">
            {filteredTenants.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">No accounts found</p>
              </div>
            ) : (
              filteredTenants.map((tenant, index) => {
                const isSelected = tenant.id === activeTenantId;
                const badge = PLAN_BADGES[tenant.plan];
                return (
                  <button
                    key={tenant.id}
                    onClick={() => handleSelect(tenant.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSelected ? 'bg-fw-primary/5' : 'hover:bg-fw-wash'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(index)} flex items-center justify-center shrink-0`}>
                      <span className="text-[12px] font-bold text-white">
                        {getInitials(tenant.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-figma-base font-medium tracking-[-0.03em] truncate ${
                          isSelected ? 'text-fw-link' : 'text-fw-heading'
                        }`}>
                          {tenant.name}
                        </p>
                        {badge && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${badge.color}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em]">
                        {tenant.connectionCount} connections
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-fw-link shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-fw-secondary px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => {
                setIsOpen(false);
                setSearchQuery('');
              }}
              className="flex items-center gap-2 text-figma-sm font-medium text-fw-link tracking-[-0.03em] hover:underline"
            >
              <Settings className="w-4 h-4" />
              Manage Accounts
            </button>
            {onProfileClick && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onProfileClick();
                }}
                className="flex items-center gap-2 text-figma-sm font-medium text-fw-link tracking-[-0.03em] hover:underline"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
            )}
          </div>
        </div>
      )}

      {/* Context Banner - shown when viewing non-AT&T tenant */}
      {!isATT && activeTenant && (
        <div
          className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center gap-2 py-1.5 text-figma-sm font-medium text-white"
          style={{ backgroundColor: tenantBranding.primaryColor }}
        >
          <Building2 className="h-3.5 w-3.5" />
          Viewing as {activeTenant.name}
          <button
            onClick={() => setActiveTenant('TNT-001')}
            className="ml-2 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[11px] font-bold transition-colors"
          >
            Back to AT&T
          </button>
        </div>
      )}
    </div>
  );
}
