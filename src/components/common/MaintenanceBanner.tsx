import { Wrench, X } from 'lucide-react';

interface MaintenanceBannerProps {
  onDismiss: () => void;
}

export function MaintenanceBanner({ onDismiss }: MaintenanceBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] border-b border-fw-secondary bg-fw-base px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5 text-fw-warn shrink-0" />
          <span className="text-figma-sm font-medium text-fw-heading tracking-[-0.03em]">
            Scheduled Maintenance
          </span>
          <span className="text-figma-xs text-fw-bodyLight tracking-[-0.03em]">
            March 25, 2026 02:00 &ndash; 06:00 AM EST
          </span>
          <span className="text-figma-xs text-fw-bodyLight tracking-[-0.03em]">&middot;</span>
          <span className="text-figma-xs text-fw-warn tracking-[-0.03em]">
            Portal is read-only
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="p-0.5 rounded hover:bg-fw-wash transition-colors shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5 text-fw-bodyLight" />
        </button>
      </div>
    </div>
  );
}
