import { ReactNode } from 'react';
import { PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { useStore } from '../../store/useStore';

interface SubNavProps {
  title: string | ReactNode;
  /** Optional glyph rendered to the left of the title (e.g. a connection-type icon). */
  icon?: ReactNode;
  description?: string;
  action?: {
    label: string;
    icon?: ReactNode;
    onClick?: () => void;
    to?: string;
  };
  /** When true, render only the header row (no full-bleed band / max-width
   *  wrapper) so it can live inside a parent container that owns padding. */
  embedded?: boolean;
  children?: ReactNode;
}

export function SubNav({ title, icon, description, action, embedded, children }: SubNavProps) {
  const navigate = useNavigate();
  const maintenanceFreeze = useStore(s => s.maintenanceFreeze);

  const handleActionClick = () => {
    if (maintenanceFreeze) {
      window.addToast?.({ type: 'info', title: 'Read-Only', message: 'Configuration changes are disabled during maintenance.', duration: 3000 });
      return;
    }
    if (action?.to) {
      navigate(action.to);
    } else if (action?.onClick) {
      action.onClick();
    }
  };

  const headerRow = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 min-w-0">
        {icon && (
          <span className="shrink-0 flex items-center text-fw-link">{icon}</span>
        )}
        <div className="min-w-0">
          <h1 className="text-figma-xl font-bold text-fw-heading leading-8 tracking-[-0.04em]">{title}</h1>
          {description && (
            <p className="mt-1 text-figma-base font-medium text-fw-body">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <button
          onClick={handleActionClick}
          className={`inline-flex items-center justify-center h-10 px-6 rounded-full border text-figma-base font-medium transition-colors ${
            maintenanceFreeze
              ? 'border-fw-secondary text-fw-bodyLight cursor-not-allowed'
              : 'border-fw-active text-fw-link hover:bg-fw-ctaGhost'
          }`}
        >
          {action.icon && action.icon}
          {action.label}
        </button>
      )}
    </div>
  );

  // Embedded: caller places this inside a framed container and owns padding.
  if (embedded) {
    return title ? headerRow : null;
  }

  return (
    <>
      {title ? (
        <div className="bg-fw-base border-b border-fw-secondary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Section */}
            <div className="py-6">{headerRow}</div>
          </div>
        </div>
      ) : null}

      {/* Page content - constrained to same max-width as header */}
      {children && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-8">
          {children}
        </div>
      )}
    </>
  );
}