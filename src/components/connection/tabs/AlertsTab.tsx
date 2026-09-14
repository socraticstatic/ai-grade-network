import { useState } from 'react';
import { Connection, AlertSeverity, AlertCategory } from '../../../types/connection';
import { AlertList } from '../card/ConnectionAlertBadge';
import { Filter, CheckCircle, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

interface AlertsTabProps {
  connection: Connection;
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
}

export function AlertsTab({ connection, onAcknowledge, onDismiss }: AlertsTabProps) {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | 'all'>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const alerts = connection.alerts || [];

  // Filter alerts based on selected filters
  const filteredAlerts = alerts.filter(alert => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    if (categoryFilter !== 'all' && alert.category !== categoryFilter) return false;
    if (!showAcknowledged && alert.acknowledged) return false;
    return true;
  });

  // Count alerts by severity
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
  const warningCount = alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length;
  const infoCount = alerts.filter(a => a.severity === 'info' && !a.acknowledged).length;
  const acknowledgedCount = alerts.filter(a => a.acknowledged).length;

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <CheckCircle className="h-16 w-16 text-complementary-green mb-4" />
        <h3 className="text-xl font-semibold text-fw-body mb-2">No Active Alerts</h3>
        <p className="text-fw-bodyLight text-center">
          This connection is running smoothly with no alerts or warnings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-red-600 font-medium mb-1">Critical</p>
              <p className="text-2xl font-bold text-red-700">{criticalCount}</p>
            </div>
            <AlertOctagon className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 font-medium mb-1">Warning</p>
              <p className="text-2xl font-bold text-amber-700">{warningCount}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-600 font-medium mb-1">Info</p>
              <p className="text-2xl font-bold text-blue-700">{infoCount}</p>
            </div>
            <Info className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 font-medium mb-1">Acknowledged</p>
              <p className="text-2xl font-bold text-gray-700">{acknowledgedCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-fw-base border border-fw-secondary rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-fw-bodyLight" />
          <span className="text-sm font-medium text-fw-body">Filters</span>
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Severity Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-fw-bodyLight font-medium">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'all')}
              className="h-9 px-3 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-fw-bodyLight font-medium">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as AlertCategory | 'all')}
              className="h-9 px-3 text-figma-sm border border-fw-secondary rounded-lg bg-fw-base text-fw-body focus:outline-none focus:ring-2 focus:ring-fw-link"
            >
              <option value="all">All Categories</option>
              <option value="throughput">Throughput</option>
              <option value="configuration">Configuration</option>
              <option value="security">Security</option>
              <option value="performance">Performance</option>
              <option value="billing">Billing</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          {/* Show Acknowledged Toggle */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-fw-bodyLight font-medium">Display</label>
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={showAcknowledged}
                onChange={(e) => setShowAcknowledged(e.target.checked)}
                className="rounded border-fw-secondary text-fw-link focus:ring-fw-link"
              />
              <span className="text-fw-body">Show acknowledged</span>
            </label>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(severityFilter !== 'all' || categoryFilter !== 'all') && (
          <div className="mt-3 pt-3 border-t border-fw-secondary">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-fw-bodyLight">Active filters:</span>
              {severityFilter !== 'all' && (
                <span className="text-xs px-2 py-0.5 bg-fw-hover rounded-md text-fw-body">
                  Severity: {severityFilter}
                </span>
              )}
              {categoryFilter !== 'all' && (
                <span className="text-xs px-2 py-0.5 bg-fw-hover rounded-md text-fw-body">
                  Category: {categoryFilter}
                </span>
              )}
              <button
                onClick={() => {
                  setSeverityFilter('all');
                  setCategoryFilter('all');
                }}
                className="text-xs text-fw-link hover:underline"
              >
                Clear all
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alerts List */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-medium text-fw-body">
            {filteredAlerts.length} Alert{filteredAlerts.length !== 1 ? 's' : ''}
            {filteredAlerts.length !== alerts.length && ` (${alerts.length} total)`}
          </h3>
        </div>

        {filteredAlerts.length > 0 ? (
          <AlertList
            alerts={filteredAlerts}
            onAcknowledge={onAcknowledge}
            onDismiss={onDismiss}
          />
        ) : (
          <div className="text-center py-8 text-fw-bodyLight bg-fw-hover rounded-lg border border-fw-secondary">
            <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No alerts match the selected filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
