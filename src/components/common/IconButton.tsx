import { ReactNode } from 'react';

interface IconButtonProps {
  icon: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
  disabled?: boolean;
}

export function IconButton({
  icon,
  onClick,
  variant = 'ghost',
  size = 'md',
  className = '',
  title,
  disabled = false
}: IconButtonProps) {
  const variantClasses = {
    primary: 'bg-fw-ctaPrimary text-fw-linkPrimary hover:bg-fw-ctaPrimaryHover',
    secondary: 'bg-fw-base text-fw-body hover:bg-fw-wash border border-fw-secondary',
    success: 'bg-fw-successLight text-fw-success hover:bg-fw-successLight',
    danger: 'bg-fw-errorLight text-fw-error hover:bg-fw-errorLight',
    ghost: 'text-fw-bodyLight hover:text-fw-body hover:bg-fw-wash'
  };

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        rounded-full transition-colors
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      <div className={iconSizes[size]}>{icon}</div>
    </button>
  );
}