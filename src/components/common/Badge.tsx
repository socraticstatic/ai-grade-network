import { ReactNode } from 'react';

/**
 * Shared Badge component matching Figma design tokens.
 *
 * Figma spec: r=8, 0.16 opacity backgrounds, 10-12px text, font-weight 500.
 * Used for type badges, status badges, and selection count pills.
 */

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  color: string;
  bg: string;
  size?: BadgeSize;
  className?: string;
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px] rounded-[8px]',
  md: 'px-2 py-0.5 text-[12px] rounded-[8px]',
};

export function Badge({ children, color, bg, size = 'sm', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-medium leading-4 ${sizeStyles[size]} ${className}`}
      style={{ color, backgroundColor: bg }}
    >
      {children}
    </span>
  );
}

// Pre-defined color maps for common badge types

export const poolTypeColors: Record<string, { text: string; bg: string }> = {
  department: { text: '#0057b8', bg: 'rgba(0,87,184,0.16)' },
  team:       { text: '#686e74', bg: 'rgba(104,110,116,0.16)' },
  project:    { text: '#2d7e24', bg: 'rgba(45,126,36,0.16)' },
  business:   { text: '#0057b8', bg: 'rgba(0,87,184,0.16)' },
  custom:     { text: '#686e74', bg: 'rgba(104,110,116,0.16)' },
};

export const statusColors: Record<string, { text: string; bg: string }> = {
  active:    { text: '#2d7e24', bg: 'rgba(45,126,36,0.16)' },
  inactive:  { text: '#686e74', bg: 'rgba(104,110,116,0.16)' },
  suspended: { text: '#c70032', bg: 'rgba(199,0,50,0.16)' },
  pending:   { text: '#0057b8', bg: 'rgba(0,87,184,0.16)' },
  warning:   { text: '#c70032', bg: 'rgba(199,0,50,0.12)' },
};

export const healthColors: Record<string, { text: string; bg: string }> = {
  optimal:  { text: '#2d7e24', bg: 'rgba(45,126,36,0.16)' },
  good:     { text: '#0057b8', bg: 'rgba(0,87,184,0.16)' },
  warning:  { text: '#c70032', bg: 'rgba(199,0,50,0.12)' },
  critical: { text: '#c70032', bg: 'rgba(199,0,50,0.16)' },
  inactive: { text: '#686e74', bg: 'rgba(104,110,116,0.16)' },
};

// Convenience components

interface TypeBadgeProps {
  type: string;
  label?: string;
  size?: BadgeSize;
}

export function TypeBadge({ type, label, size = 'md' }: TypeBadgeProps) {
  const colors = poolTypeColors[type] || poolTypeColors.custom;
  return (
    <Badge color={colors.text} bg={colors.bg} size={size}>
      {label || type}
    </Badge>
  );
}

interface StatusBadgeProps {
  status: string;
  uppercase?: boolean;
  size?: BadgeSize;
}

export function StatusBadge({ status, uppercase = false, size = 'sm' }: StatusBadgeProps) {
  const colors = statusColors[status.toLowerCase()] || statusColors.inactive;
  return (
    <Badge color={colors.text} bg={colors.bg} size={size} className={uppercase ? 'uppercase' : 'capitalize'}>
      {status}
    </Badge>
  );
}
