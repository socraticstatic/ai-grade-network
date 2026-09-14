import { Filter } from 'lucide-react';
import { Button, ButtonProps } from './Button';

interface FilterButtonProps extends Omit<ButtonProps, 'icon'> {
  disabled?: boolean;
}

export function FilterButton({ 
  children = 'Filters', 
  onClick, 
  variant = 'outline',
  disabled = false,
  className = '',
  ...props 
}: FilterButtonProps) {
  return (
    <Button
      variant={variant}
      icon={Filter}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}