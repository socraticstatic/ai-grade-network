interface StatusBadgeProps {
  status: 'active' | 'Active' | 'inactive' | 'Inactive' | 'suspended' | 'Suspended' | 'Pending' | 'pending' | 'Provisioning' | 'provisioning';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();

  // Figma: pill-shaped badges with stroke borders, 12px text, tag letter-spacing
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-tag-xs',
    md: 'px-3 py-1 text-tag-sm',
    lg: 'px-4 py-1.5 text-figma-sm'
  };

  // Figma-matched: stroke colors from connection cards
  // Active: green stroke #2d7e24, Inactive: gray stroke #878c94
  const statusStyles = {
    active: 'text-fw-success border-fw-success',
    inactive: 'text-fw-disabled border-fw-bodyLight',
    suspended: 'text-fw-error border-fw-error',
    pending: 'text-fw-warn border-fw-warn',
    provisioning: 'text-fw-link border-fw-link'
  };

  const statusLabels = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    pending: 'Pending',
    provisioning: 'Provisioning'
  };

  const style = statusStyles[normalizedStatus as keyof typeof statusStyles] || statusStyles.inactive;
  const label = statusLabels[normalizedStatus as keyof typeof statusLabels] || status;

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} rounded-full font-medium border ${style} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        normalizedStatus === 'active' ? 'bg-fw-success' :
        normalizedStatus === 'inactive' ? 'bg-fw-bodyLight' :
        normalizedStatus === 'suspended' ? 'bg-fw-error' :
        normalizedStatus === 'provisioning' ? 'bg-fw-link animate-pulse' :
        'bg-fw-warn'
      }`} />
      {label}
    </span>
  );
}
