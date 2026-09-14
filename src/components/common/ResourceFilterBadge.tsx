import { Building2, Users, Database, Globe, Eye, Layers } from 'lucide-react';
import { ResourceFilter } from '../../types/scope';
import { RESOURCE_FILTER_LABELS, RESOURCE_FILTER_DESCRIPTIONS } from '../../types/scope';

interface ResourceFilterBadgeProps {
  filter: ResourceFilter;
  label?: string;
  showIcon?: boolean;
  variant?: 'default' | 'detailed';
}

export function ResourceFilterBadge({ filter, label, showIcon = true, variant = 'default' }: ResourceFilterBadgeProps) {
  const filterConfig: Record<ResourceFilter, { icon: any; color: string }> = {
    'owned-by-me': {
      icon: Eye,
      color: 'blue'
    },
    'my-department': {
      icon: Users,
      color: 'green'
    },
    'my-pools': {
      icon: Layers,
      color: 'purple'
    },
    'my-tenant': {
      icon: Building2,
      color: 'orange'
    },
    'all-tenants': {
      icon: Globe,
      color: 'red'
    }
  };

  const config = filterConfig[filter];
  const Icon = config.icon;
  const displayLabel = label || RESOURCE_FILTER_LABELS[filter];
  const description = RESOURCE_FILTER_DESCRIPTIONS[filter];

  const colorClasses = {
    blue: 'bg-fw-blue-light text-fw-link border-fw-active',
    green: 'bg-fw-successLight text-fw-success border-fw-success',
    purple: 'bg-fw-accent text-fw-cobalt-700 border-fw-active',
    orange: 'bg-fw-warnLight text-fw-warn border-fw-warn',
    red: 'bg-fw-errorLight text-fw-error border-fw-error',
  }[config.color];

  return (
    <div className="relative inline-flex group">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-figma-sm font-medium border ${colorClasses}`}>
        {showIcon && <Icon className="h-3.5 w-3.5" />}
        <span>{displayLabel}</span>
      </span>

      {variant === 'detailed' && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-fw-gray-900 text-fw-linkPrimary text-figma-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
          {description}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-fw-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
}
