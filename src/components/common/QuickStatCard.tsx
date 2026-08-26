import { LucideIcon } from 'lucide-react';

interface QuickStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function QuickStatCard({ title, value, icon: Icon, variant = 'default' }: QuickStatCardProps) {
  const variantColors = {
    default: 'text-fw-bodyLight',
    success: 'text-fw-success',
    warning: 'text-fw-warn',
    error: 'text-fw-error',
    info: 'text-fw-link'
  };

  return (
    <div className="bg-fw-base p-6 rounded-lg border border-fw-secondary hover:border-fw-secondary transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-figma-base font-medium text-fw-bodyLight">{title}</h3>
        <Icon className={`h-5 w-5 ${variantColors[variant]}`} />
      </div>
      <p className="text-figma-lg font-medium text-fw-heading">{value}</p>
    </div>
  );
}
