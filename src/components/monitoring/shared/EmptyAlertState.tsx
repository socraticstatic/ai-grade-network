import { Bell } from 'lucide-react';

interface EmptyAlertStateProps {
  message?: string;
  isMobile?: boolean;
}

export function EmptyAlertState({
  message = 'No active alerts for the selected connection',
  isMobile = false
}: EmptyAlertStateProps) {
  if (isMobile) {
    return (
      <div className="py-8 text-center">
        <Bell className="h-8 w-8 mx-auto mb-2 text-fw-bodyLight" />
        <p className="text-figma-base text-fw-bodyLight">{message}</p>
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <Bell className="h-12 w-12 text-fw-bodyLight mx-auto mb-4" />
      <h3 className="text-figma-lg font-bold text-fw-heading mb-2">No active alerts</h3>
      <p className="text-figma-base text-fw-bodyLight max-w-md mx-auto tracking-[-0.03em]">{message}</p>
    </div>
  );
}