import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  animate?: boolean;
}

const variantStyles = {
  default: {
    bg: 'bg-fw-wash',
    border: 'border-fw-secondary',
    iconBg: 'bg-fw-neutral',
    iconColor: 'text-fw-bodyLight',
    hoverBorder: 'hover:border-fw-secondary',
    hoverBg: 'hover:bg-fw-wash/30'
  },
  success: {
    bg: 'bg-fw-successLight',
    border: 'border-fw-successLight',
    iconBg: 'bg-fw-successLight',
    iconColor: 'text-fw-success',
    hoverBorder: 'hover:border-fw-success',
    hoverBg: 'hover:bg-fw-successLight/30'
  },
  warning: {
    bg: 'bg-fw-warnLight',
    border: 'border-fw-warnLight',
    iconBg: 'bg-fw-warnLight',
    iconColor: 'text-fw-warn',
    hoverBorder: 'hover:border-fw-warn',
    hoverBg: 'hover:bg-fw-warnLight/30'
  },
  error: {
    bg: 'bg-fw-errorLight',
    border: 'border-fw-errorLight',
    iconBg: 'bg-fw-errorLight',
    iconColor: 'text-fw-error',
    hoverBorder: 'hover:border-fw-error',
    hoverBg: 'hover:bg-fw-errorLight/30'
  },
  info: {
    bg: 'bg-fw-accent',
    border: 'border-fw-secondary',
    iconBg: 'bg-fw-accent',
    iconColor: 'text-fw-link',
    hoverBorder: 'hover:border-fw-active',
    hoverBg: 'hover:bg-fw-accent/30'
  }
};

export function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  variant = 'default',
  animate = true
}: MetricCardProps) {
  const styles = variantStyles[variant];

  const content = (
    <div className="relative group">
      <div className={`flex flex-col items-center p-3 ${styles.bg} rounded-lg border ${styles.border} transition-all duration-200 ${styles.hoverBorder} ${styles.hoverBg}`}>
        <div className={`p-2 ${styles.iconBg} rounded-lg mb-2 ${animate ? 'group-hover:scale-110' : ''} transition-transform duration-200`}>
          <Icon className={`h-4 w-4 ${styles.iconColor}`} />
        </div>
        <div className="text-base font-bold text-fw-heading">{value}</div>
        <div className="text-figma-sm text-fw-bodyLight">{label}</div>
        {subtitle && (
          <div className="text-figma-sm text-fw-bodyLight mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );

  if (!animate) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {content}
    </motion.div>
  );
}
