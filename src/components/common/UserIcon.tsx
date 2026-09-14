import { User } from 'lucide-react';

interface UserIconProps {
  /**
   * Size variant following Flywheel standards
   * xs: 3 (12px) - Micro indicators
   * sm: 4 (16px) - Inline text icons
   * md: 5 (20px) - Standard icons (DEFAULT)
   * lg: 8 (32px) - Feature icons
   * xl: 12 (48px) - Large display
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Color variant following Flywheel semantic colors
   * default: Gray-600 (secondary text)
   * primary: Functional Blue
   * success: Green
   * muted: Gray-400 (disabled)
   * inherit: Inherits from parent
   */
  variant?: 'default' | 'primary' | 'success' | 'muted' | 'inherit';

  /**
   * Optional custom className for edge cases
   */
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const variantClasses = {
  default: 'text-fw-body',
  primary: 'text-fw-link',
  success: 'text-fw-success',
  muted: 'text-fw-disabled',
  inherit: '',
};

/**
 * Standard User Icon Component
 *
 * Flywheel-compliant user icon with consistent sizing and colors.
 * Use this instead of direct <User /> imports for consistency.
 *
 * @example
 * // Default usage (md size, default color)
 * <UserIcon />
 *
 * @example
 * // Primary blue, large size
 * <UserIcon size="lg" variant="primary" />
 *
 * @example
 * // Small inline icon
 * <UserIcon size="sm" variant="muted" />
 */
export function UserIcon({
  size = 'md',
  variant = 'default',
  className
}: UserIconProps) {
  const baseClasses = `${sizeClasses[size]} ${variantClasses[variant]}`;
  const finalClasses = className ? `${baseClasses} ${className}` : baseClasses;

  return <User className={finalClasses} />;
}
