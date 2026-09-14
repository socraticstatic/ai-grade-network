import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'brand' | 'gray' | 'white';
  className?: string;
  text?: string;
}

export function LoadingSpinner({
  size = 'md',
  color = 'brand',
  className = '',
  text
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };
  
  const colorMap = {
    brand: 'text-fw-link',
    gray: 'text-fw-bodyLight',
    white: 'text-white'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <RefreshCw className={`animate-spin ${sizeMap[size]} ${colorMap[color]}`} />
      {text && <span className="ml-3 text-figma-base font-medium">{text}</span>}
    </div>
  );
}