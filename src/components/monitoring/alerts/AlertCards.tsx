import { AlertList } from '../shared/AlertList';
import { BaseAlertsView } from '../shared/BaseAlertsView';
import { Connection } from '../../../types';

interface AlertCardsProps {
  selectedConnection: string;
  connections: Array<Connection>;
}

function AlertCards({ selectedConnection, connections }: AlertCardsProps) {
  return (
    <BaseAlertsView
      connections={connections}
      selectedConnection={selectedConnection}
    >
      {({ filteredAlerts, dismissAlert, activeFilters }) => (
        <AlertList
          alerts={filteredAlerts(selectedConnection)}
          onDismiss={dismissAlert}
        />
      )}
    </BaseAlertsView>
  );
}

export default AlertCards;