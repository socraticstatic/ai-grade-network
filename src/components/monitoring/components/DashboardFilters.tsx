import { ReactNode, useState, useRef, useEffect } from 'react';
import { Button } from '../../common/Button';
import { Group } from '../../../types';
import { RefreshCw, Network, Radio, Link as LinkIcon, Box, ChevronDown, ChevronUp, Save, Bookmark, X } from 'lucide-react';
import { useMonitoring } from '../context/MonitoringContext';
import { ResourceType } from '../../../types/metric';

interface DashboardFiltersProps {
  connections: Array<{ id: string; name: string }>;
  groups?: Array<Group>;
  isMobile?: boolean;
  children?: ReactNode;
}

export function DashboardFilters({
  connections,
  groups = [],
  isMobile = false,
  children
}: DashboardFiltersProps) {
  const {
    selectedConnection,
    selectedGroup,
    selectedVNF,
    selectedLink,
    selectedRouter,
    resourceType,
    timeRange,
    isRefreshing,
    lastRefreshed,
    allVNFs,
    allLinks,
    allRouters,
    setSelectedConnection,
    setSelectedGroup,
    setSelectedVNF,
    setSelectedLink,
    setSelectedRouter,
    setResourceType,
    setTimeRange,
    handleRefresh
  } = useMonitoring();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const resourceTypeConfig: Record<ResourceType, { icon: typeof Network; label: string; description: string }> = {
    connection: { icon: Network, label: 'Connections', description: 'View connection-level metrics' },
    pool: { icon: Box, label: 'Pools', description: 'View pool-aggregated metrics' },
    router: { icon: Radio, label: 'Hubs', description: 'View hub performance' },
    link: { icon: LinkIcon, label: 'Links', description: 'View link utilization and traffic' },
    vnf: { icon: Box, label: 'VNFs', description: 'View VNF throughput and sessions' }
  };

  const formattedLastRefreshed = lastRefreshed
    ? lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExpanded]);

  const getResourceList = () => {
    switch (resourceType) {
      case 'vnf':
        return allVNFs || [];
      case 'link':
        return allLinks || [];
      case 'router':
        return allRouters || [];
      default:
        return [];
    }
  };

  const getResourceName = (resource: any) => {
    switch (resourceType) {
      case 'vnf':
        return `${resource.name} (${resource.type})`;
      case 'link':
        return `${resource.name} (VLAN ${resource.vlanId})`;
      case 'router':
        return `${resource.name} (${resource.vendor})`;
      default:
        return resource.name;
    }
  };

  const getSelectedResource = () => {
    switch (resourceType) {
      case 'vnf':
        return selectedVNF;
      case 'link':
        return selectedLink;
      case 'router':
        return selectedRouter;
      default:
        return null;
    }
  };

  const setSelectedResource = (value: string) => {
    switch (resourceType) {
      case 'vnf':
        setSelectedVNF?.(value);
        break;
      case 'link':
        setSelectedLink?.(value);
        break;
      case 'router':
        setSelectedRouter?.(value);
        break;
    }
  };

  const getActiveFiltersDescription = () => {
    const parts = [];

    const Icon = resourceTypeConfig[resourceType].icon;
    parts.push(
      <span key="resource" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-fw-accent text-fw-linkHover rounded-md text-figma-base font-medium">
        <Icon className="h-3.5 w-3.5" />
        {resourceTypeConfig[resourceType].label}
      </span>
    );

    if (selectedConnection !== 'all') {
      const conn = connections.find(c => c.id === selectedConnection);
      parts.push(
        <span key="connection" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-fw-neutral text-fw-body rounded-md text-figma-base">
          Connection: <span className="font-medium">{conn?.name}</span>
        </span>
      );
    }

    if (selectedGroup !== 'all') {
      const group = groups.find(g => g.id === selectedGroup);
      parts.push(
        <span key="group" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-fw-neutral text-fw-body rounded-md text-figma-base">
          Pool: <span className="font-medium">{group?.name}</span>
        </span>
      );
    }

    const selectedResource = getSelectedResource();
    if (selectedResource && selectedResource !== 'all') {
      const resources = getResourceList();
      const resource = resources.find((r: any) => r.id === selectedResource);
      if (resource) {
        parts.push(
          <span key="resource-specific" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-fw-neutral text-fw-body rounded-md text-figma-base">
            {resourceTypeConfig[resourceType].label.slice(0, -1)}: <span className="font-medium">{getResourceName(resource)}</span>
          </span>
        );
      }
    }

    return parts;
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const preset = {
      name: presetName,
      resourceType,
      selectedConnection,
      selectedGroup,
      selectedVNF,
      selectedLink,
      selectedRouter,
      timeRange
    };

    const savedPresets = JSON.parse(localStorage.getItem('monitoringPresets') || '[]');
    savedPresets.push(preset);
    localStorage.setItem('monitoringPresets', JSON.stringify(savedPresets));

    setPresetName('');
    setShowSavePreset(false);
  };

  if (isMobile) {
    return (
      <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm">
        <div className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-figma-base font-medium text-fw-body mb-2">
                Resource Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(resourceTypeConfig) as [ResourceType, typeof resourceTypeConfig[ResourceType]][]).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setResourceType?.(type)}
                      className={`
                        flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-figma-base font-medium transition-colors
                        ${resourceType === type
                          ? 'bg-fw-accent text-fw-linkHover border-2 border-fw-active'
                          : 'bg-fw-wash text-fw-body border border-fw-secondary hover:bg-fw-neutral'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="connection-select-mobile" className="block text-figma-base font-medium text-fw-body mb-2">
                Scope
              </label>
              <select
                id="connection-select-mobile"
                value={selectedConnection}
                onChange={(e) => setSelectedConnection?.(e.target.value)}
                className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
              >
                <option value="all">All Connections</option>
                {connections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="time-range-mobile" className="block text-figma-base font-medium text-fw-body mb-2">
                Time Range
              </label>
              <select
                id="time-range-mobile"
                value={timeRange}
                onChange={(e) => setTimeRange?.(e.target.value)}
                className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
              >
                <option value="5m">Last 5 Minutes</option>
                <option value="15m">Last 15 Minutes</option>
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
              </select>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="secondary"
              icon={RefreshCw}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {children && (
            <div className="mt-4 pt-4 border-t border-fw-secondary">
              {children}
            </div>
          )}
        </div>
      </div>
    );
  }

  const resources = getResourceList();
  const selectedResource = getSelectedResource();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Figma: three 330x36 dropdowns with labels, stroke=#686e74 r=8 */}
      <div className="flex items-end gap-6">
        {/* View Statistics For */}
        <div className="flex-1">
          <label className="block text-figma-base font-medium text-fw-heading mb-1.5 tracking-[-0.03em]">
            View Statistics For
          </label>
          <select
            value={selectedConnection}
            onChange={(e) => setSelectedConnection?.(e.target.value)}
            className="w-full h-9 rounded-lg border border-fw-primary text-figma-base text-fw-body bg-fw-base px-3 focus:border-fw-active focus:ring-fw-active"
          >
            <option value="all">All Connections (Cumulative)</option>
            {connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name}
              </option>
            ))}
          </select>
        </div>

        {/* Time Range */}
        <div className="flex-1">
          <label className="block text-figma-base font-medium text-fw-heading mb-1.5 tracking-[-0.03em]">
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange?.(e.target.value)}
            className="w-full h-9 rounded-lg border border-fw-primary text-figma-base text-fw-body bg-fw-base px-3 focus:border-fw-active focus:ring-fw-active"
          >
            <option value="5m">Last 5 Minutes</option>
            <option value="15m">Last 15 Minutes</option>
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* Auto-refresh */}
        <div className="flex-1">
          <label className="block text-figma-base font-medium text-fw-heading mb-1.5 tracking-[-0.03em]">
            Auto-refresh
          </label>
          <select
            className="w-full h-9 rounded-lg border border-fw-primary text-figma-base text-fw-body bg-fw-base px-3 focus:border-fw-active focus:ring-fw-active"
            defaultValue="off"
          >
            <option value="off">Off</option>
            <option value="10s">Every 10s</option>
            <option value="30s">Every 30s</option>
            <option value="60s">Every 60s</option>
          </select>
        </div>

        {/* Last refreshed + Refresh button */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {formattedLastRefreshed && (
            <span className="text-figma-base font-medium text-fw-heading whitespace-nowrap">Last: {formattedLastRefreshed}</span>
          )}
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="secondary"
            size="md"
            icon={RefreshCw}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Save Preset Dropdown */}
      {showSavePreset && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-fw-base border border-fw-secondary rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Enter preset name..."
              className="flex-1 rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
              onKeyPress={(e) => e.key === 'Enter' && handleSavePreset()}
              autoFocus
            />
            <Button
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              size="sm"
              variant="primary"
            >
              <Save className="h-4 w-4 mr-1.5" />
              Save
            </Button>
            <Button
              onClick={() => {
                setShowSavePreset(false);
                setPresetName('');
              }}
              size="sm"
              variant="outline"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Expanded Filters Dropdown */}
      {isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-fw-base border border-fw-secondary rounded-lg shadow-lg p-6 z-50 max-h-96 overflow-y-auto">
          <div className="space-y-4">
            {/* Resource Type Selection */}
            <div>
              <label className="block text-figma-sm font-medium text-fw-bodyLight mb-2 uppercase tracking-wide">
                Resource Type
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(resourceTypeConfig) as [ResourceType, typeof resourceTypeConfig[ResourceType]][]).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => setResourceType?.(type)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-figma-base font-medium transition-all
                        ${resourceType === type
                          ? 'bg-fw-cobalt-600 text-white shadow-md'
                          : 'bg-fw-base text-fw-body border border-fw-secondary hover:border-fw-active hover:bg-fw-accent'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scope Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="connection-select" className="block text-figma-sm font-medium text-fw-bodyLight mb-2 uppercase tracking-wide">
                  {resourceType === 'connection' ? 'View Connection' : 'Filter by Connection'}
                </label>
                <select
                  id="connection-select"
                  value={selectedConnection}
                  onChange={(e) => setSelectedConnection?.(e.target.value)}
                  className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                >
                  <option value="all">
                    {resourceType === 'connection' ? 'All Connections (Aggregated)' : 'All Connections'}
                  </option>
                  {connections.map((conn) => (
                    <option key={conn.id} value={conn.id}>
                      {conn.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="group-select" className="block text-figma-sm font-medium text-fw-bodyLight mb-2 uppercase tracking-wide">
                  {resourceType === 'pool' ? 'View Pool' : 'Filter by Pool'}
                </label>
                <select
                  id="group-select"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup?.(e.target.value)}
                  className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active text-figma-base"
                >
                  <option value="all">
                    {resourceType === 'pool' ? 'All Pools (Aggregated)' : 'All Pools'}
                  </option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Specific Resource Selection */}
            {['vnf', 'link', 'router'].includes(resourceType) && resources.length > 0 && (
              <div>
                <label htmlFor="resource-select" className="block text-figma-sm font-medium text-fw-bodyLight mb-2 uppercase tracking-wide">
                  Select Specific {resourceTypeConfig[resourceType].label.slice(0, -1)}
                </label>
                <select
                  id="resource-select"
                  value={selectedResource || 'all'}
                  onChange={(e) => setSelectedResource(e.target.value)}
                  className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
                >
                  <option value="all">All {resourceTypeConfig[resourceType].label} (Aggregated)</option>
                  {resources.map((resource: any) => (
                    <option key={resource.id} value={resource.id}>
                      {getResourceName(resource)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {children && (
              <div className="pt-4 border-t border-fw-secondary">
                {children}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
