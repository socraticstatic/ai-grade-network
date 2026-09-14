import { ReactNode } from 'react';

interface CardProps {
  /** Card content */
  children: ReactNode;
  /** Optional header content */
  header?: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Reusable card component with optional header and footer sections
 */
export function Card({ children, header, footer, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}