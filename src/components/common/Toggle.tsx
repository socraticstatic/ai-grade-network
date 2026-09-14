import { memo } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const ToggleComponent = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className = ''
}: ToggleProps) => {
  const dimensions = size === 'sm' ? { width: 'w-9', height: 'h-4', dot: 'w-4 h-4', translate: 'translate-x-5' } : { width: 'w-10', height: 'h-5', dot: 'w-5 h-5', translate: 'translate-x-5' };

  return (
    <label className={`inline-flex items-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only toggle-switch"
      />
      <div className={`relative inline-block ${dimensions.width} ${dimensions.height} transition-colors duration-200 ease-in-out rounded-full ${
        checked ? 'bg-fw-primary' : 'bg-fw-neutral'
      } ${disabled ? 'opacity-50' : ''}`}>
        <div className={`absolute inset-y-0 left-0 ${dimensions.dot} transition duration-200 ease-in-out transform bg-white rounded-full ${
          checked ? dimensions.translate : 'translate-x-0'
        } shadow-md`}></div>
      </div>
      {label && (
        <span className={`ml-2 text-figma-base font-medium ${disabled ? 'text-fw-disabled' : 'text-fw-body'}`}>
          {label}
        </span>
      )}
    </label>
  );
};

ToggleComponent.displayName = 'Toggle';

export const Toggle = memo(ToggleComponent);
