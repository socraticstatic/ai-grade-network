import { AlertTriangle, AlertCircle, AlertOctagon, Info, Zap, Settings, ShieldAlert } from 'lucide-react';
import { ConnectionAlert, AlertSeverity, AlertCategory } from '../../../types/connection';

interface ConnectionAlertBadgeProps {
  alerts: ConnectionAlert[];
  compact?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

export function ConnectionAlertBadge({ alerts, compact = false, onClick }: ConnectionAlertBadgeProps) {
  if (!alerts || alerts.length === 0) return null;

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  const throughputIssues = alerts.filter(a => a.category === 'throughput');
  const configIssues = alerts.filter(a => a.category === 'configuration');
  const performanceIssues = alerts.filter(a => a.category === 'performance');

  const highestSeverity: AlertSeverity = criticalAlerts.length > 0 ? 'critical'
    : warningAlerts.length > 0 ? 'warning'
    : 'info';

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return AlertOctagon; // Stop sign shape for critical
      case 'warning':
        return AlertTriangle; // Triangle for warnings
      case 'info':
        return Info; // Circle with i for info
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'text-red-600',
          dot: 'bg-red-500'
        };
      case 'warning':
        return {
          bg: 'bg-fw-wash',
          border: 'border-fw-secondary',
          text: 'text-fw-bodyLight',
          icon: 'text-fw-bodyLight',
          dot: 'bg-fw-bodyLight'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: 'text-blue-600',
          dot: 'bg-blue-500'
        };
    }
  };

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case 'throughput':
        return <Zap className="h-3 w-3" />;
      case 'configuration':
        return <Settings className="h-3 w-3" />;
      case 'security':
        return <ShieldAlert className="h-3 w-3" />;
      case 'performance':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const colors = getSeverityColor(highestSeverity);
  const SeverityIcon = getSeverityIcon(highestSeverity);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ${colors.bg} ${colors.border} border cursor-pointer hover:shadow-sm transition-shadow`}
        onClick={onClick}
        title={`${alerts.length} alert${alerts.length > 1 ? 's' : ''}`}
      >
        <SeverityIcon className={`h-3.5 w-3.5 ${colors.icon}`} />
        <span className={`text-xs font-semibold ${colors.text}`}>{alerts.length}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col gap-2 p-3 rounded-lg ${colors.bg} ${colors.border} border cursor-pointer hover:shadow-md transition-all`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SeverityIcon className={`h-4 w-4 ${colors.icon}`} />
          <span className={`text-sm font-semibold ${colors.text}`}>
            {alerts.length} Active Alert{alerts.length > 1 ? 's' : ''}
          </span>
        </div>
        {highestSeverity === 'critical' && (
          <span className={`relative flex h-2 w-2`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.dot} opacity-75`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${colors.dot}`}></span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {throughputIssues.length > 0 && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${colors.bg} border ${colors.border}`}>
            <Zap className={`h-3 w-3 ${colors.icon}`} />
            <span className={`text-xs ${colors.text}`}>
              {throughputIssues.length} Throughput
            </span>
          </div>
        )}
        {configIssues.length > 0 && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${colors.bg} border ${colors.border}`}>
            <Settings className={`h-3 w-3 ${colors.icon}`} />
            <span className={`text-xs ${colors.text}`}>
              {configIssues.length} Config
            </span>
          </div>
        )}
        {performanceIssues.length > 0 && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${colors.bg} border ${colors.border}`}>
            <AlertCircle className={`h-3 w-3 ${colors.icon}`} />
            <span className={`text-xs ${colors.text}`}>
              {performanceIssues.length} Performance
            </span>
          </div>
        )}
      </div>

      {alerts.slice(0, 2).map((alert, idx) => (
        <div key={alert.id} className={`text-xs ${colors.text} ${idx > 0 ? 'pt-1 border-t border-current/20' : ''}`}>
          {alert.title}
        </div>
      ))}

      {alerts.length > 2 && (
        <div className={`text-xs ${colors.text} font-medium`}>
          + {alerts.length - 2} more
        </div>
      )}
    </div>
  );
}

interface AlertListProps {
  alerts: ConnectionAlert[];
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
}

export function AlertList({ alerts, onAcknowledge, onDismiss }: AlertListProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Info className="h-12 w-12 mx-auto mb-2 text-gray-400" />
        <p>No active alerts</p>
      </div>
    );
  }

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return AlertOctagon; // Stop sign shape for critical
      case 'warning':
        return AlertTriangle; // Triangle for warnings
      case 'info':
        return Info; // Circle with i for info
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'text-red-600'
        };
      case 'warning':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          icon: 'text-amber-600'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: 'text-blue-600'
        };
    }
  };

  const getCategoryIcon = (category: AlertCategory) => {
    switch (category) {
      case 'throughput':
        return <Zap className="h-5 w-5" />;
      case 'configuration':
        return <Settings className="h-5 w-5" />;
      case 'security':
        return <ShieldAlert className="h-5 w-5" />;
      case 'performance':
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getCategoryLabel = (category: AlertCategory) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const colors = getSeverityColor(alert.severity);
        const SeverityIcon = getSeverityIcon(alert.severity);

        return (
          <div
            key={alert.id}
            className={`p-4 rounded-lg ${colors.bg} ${colors.border} border ${alert.acknowledged ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className={colors.icon}>
                <SeverityIcon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold ${colors.text}`}>{alert.title}</h4>
                    <div className={`${colors.icon} flex-shrink-0`}>
                      {getCategoryIcon(alert.category)}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${colors.bg} border ${colors.border} font-medium ${colors.text} whitespace-nowrap`}>
                    {alert.severity.toUpperCase()}
                  </span>
                </div>
                <p className={`text-xs ${colors.text} opacity-75 mt-0.5`}>
                  {getCategoryLabel(alert.category)} • {new Date(alert.timestamp).toLocaleString()}
                </p>

                <p className={`text-sm ${colors.text} mt-2`}>
                  {alert.message}
                </p>

                {alert.affectedComponents && alert.affectedComponents.length > 0 && (
                  <div className="mt-2">
                    <p className={`text-xs ${colors.text} opacity-75 mb-1`}>Affected components:</p>
                    <div className="flex flex-wrap gap-1">
                      {alert.affectedComponents.map((comp, idx) => (
                        <span key={idx} className={`text-xs px-2 py-0.5 rounded ${colors.bg} border ${colors.border} ${colors.text}`}>
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {alert.recommendedAction && (
                  <div className={`mt-3 p-2 rounded ${colors.bg} border ${colors.border}`}>
                    <p className={`text-xs font-medium ${colors.text} mb-1`}>Recommended Action:</p>
                    <p className={`text-xs ${colors.text}`}>{alert.recommendedAction}</p>
                  </div>
                )}

                {!alert.acknowledged && (onAcknowledge || onDismiss) && (
                  <div className="flex gap-2 mt-3">
                    {onAcknowledge && (
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className={`text-xs px-3 py-1.5 rounded ${colors.text} bg-white border ${colors.border} hover:shadow-sm transition-shadow`}
                      >
                        Acknowledge
                      </button>
                    )}
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className={`text-xs px-3 py-1.5 rounded ${colors.text} bg-white border ${colors.border} hover:shadow-sm transition-shadow`}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
