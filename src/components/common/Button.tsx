import { ReactNode, memo, forwardRef, isValidElement, ComponentType } from 'react';

interface ButtonProps {
  children: ReactNode;
  icon?: ReactNode | ComponentType<any>;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'outline-danger';
  fullWidth?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md' | 'lg';
  'data-testid'?: string;
}

const ButtonComponent = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  icon,
  variant = 'primary',
  fullWidth = false,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
  size = 'md',
  'data-testid': dataTestId,
}, ref) => {
  // Figma: pill-shaped buttons, ATT Aleck Sans 500 14px, -3% letter-spacing
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-colors tracking-[-0.03em] active:scale-[0.98]';

  // Figma button heights: sm=28px, md=36px (standard), lg=44px
  // Figma padding: 8px vertical, 16px horizontal for md
  const sizeStyles = {
    sm: 'text-figma-sm h-7 px-3 gap-1.5',
    md: 'text-figma-base h-9 px-4 gap-2',
    lg: 'text-figma-base h-11 px-6 gap-2'
  };

  // Figma-matched variant colors
  const variantStyles = {
    primary: 'bg-fw-ctaPrimary text-white hover:bg-fw-ctaPrimaryHover focus:ring-2 focus:ring-fw-active focus:ring-offset-2 border border-transparent transition-all',
    secondary: 'bg-transparent text-fw-link hover:bg-fw-neutral border border-fw-active transition-all',
    outline: 'bg-fw-base border border-fw-active text-fw-link hover:bg-fw-active/5 transition-all',
    ghost: 'bg-transparent text-fw-heading hover:bg-fw-wash border border-transparent transition-all',
    danger: 'bg-fw-error text-white hover:bg-fw-error focus:ring-2 focus:ring-fw-error border border-transparent transition-all',
    'outline-danger': 'bg-transparent text-fw-error hover:bg-fw-errorLight border border-fw-error transition-all',
  };

  // Figma icon size: 20px for md, 16px for sm
  const iconSizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  const renderIcon = () => {
    if (!icon) return null;

    if (isValidElement(icon)) {
      return <span className="shrink-0">{icon}</span>;
    }

    if (typeof icon === 'function') {
      const IconComponent = icon as ComponentType<any>;
      return <IconComponent className={`${iconSizeClass} shrink-0`} />;
    }

    return null;
  };

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={dataTestId}
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {renderIcon()}
      {children}
    </button>
  );
});

ButtonComponent.displayName = 'Button';

export const Button = memo(ButtonComponent);