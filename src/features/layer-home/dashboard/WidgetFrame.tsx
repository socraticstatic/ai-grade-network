import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export function WidgetFrame({ title, icon: Icon, action, children }: {
  title: string;
  icon: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-testid="widget-frame"
      data-widget-title={title}
      className="flex flex-col rounded-2xl border border-fw-secondary bg-fw-base overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-3">
        <Icon className="h-4 w-4 text-fw-bodyLight shrink-0" aria-hidden="true" />
        <h3 className="flex-1 text-figma-sm font-semibold text-fw-heading tracking-[-0.03em] truncate">
          {title}
        </h3>
        {action}
      </div>
      <div className="h-px bg-fw-secondary mx-4" />
      <div className="p-4 flex-1">{children}</div>
    </div>
  );
}
