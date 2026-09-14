import { AlertCircle } from 'lucide-react';
import { Connection } from '../../types';
import { isConnectionEditable, getConnectionEditRestrictionReason } from '../../utils/connections';

interface ConnectionEditWarningProps {
  connection: Connection;
  className?: string;
}

export function ConnectionEditWarning({ connection, className = '' }: ConnectionEditWarningProps) {
  const isEditable = isConnectionEditable(connection);
  const restrictionReason = getConnectionEditRestrictionReason(connection);

  if (isEditable || !restrictionReason) {
    return null;
  }

  return (
    <div className={`flex items-start space-x-3 p-4 bg-fw-warnLight border border-fw-warn rounded-lg ${className}`}>
      <AlertCircle className="h-5 w-5 text-fw-warn flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="text-figma-base font-semibold text-fw-heading mb-1">Configuration Locked</h4>
        <p className="text-figma-base text-fw-body">
          {restrictionReason}. You can deactivate the connection from the connection menu to make changes.
        </p>
      </div>
    </div>
  );
}
