import { AlertList } from '../shared/AlertList';
import { BaseAlertsView } from '../shared/BaseAlertsView';
import { Connection } from '../../../types';

interface MobileAlertsTabProps {
  selectedConnection: string;
  connections: Connection[];
}

export function MobileAlertsTab({ selectedConnection, connections }: MobileAlertsTabProps) {
  return (
    <BaseAlertsView
      connections={connections}
      selectedConnection={selectedConnection}
      isMobile={true}
    >
      {({ filteredAlerts, dismissAlert, activeFilters }) => (
        <AlertList
          alerts={filteredAlerts(selectedConnection)}
          onDismiss={dismissAlert}
          isMobile={true}
        />
      )}
    </BaseAlertsView>
  );
}

