import { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  helpText?: string;
}

export function FormField({ 
  label, 
  error, 
  required = false, 
  children, 
  helpText 
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-figma-base font-medium text-fw-body">
        {label}
        {required && <span className="text-fw-error ml-1">*</span>}
      </label>
      {children}
      {helpText && (
        <p className="text-figma-base text-fw-bodyLight">{helpText}</p>
      )}
      {error && (
        <p className="text-figma-base text-fw-error">{error}</p>
      )}
    </div>
  );
}