import { ReactNode } from 'react';

interface PageSectionProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function PageSection({
  title,
  description,
  action,
  className = '',
  children
}: PageSectionProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {(title || description || action) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h2 className="text-lg font-medium text-fw-heading">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-figma-base text-fw-bodyLight">{description}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}