import { useState } from 'react';
import { Search, Filter, Download, Clock, Activity, Shield, Terminal, Settings, X } from 'lucide-react';
import { Connection } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileLogsTabProps {
  selectedConnection: string;
  connections: Connection[];
}

export function MobileLogsTab({ selectedConnection, connections }: MobileLogsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Sample log data
  const logs = [
    {
      id: '1',
      timestamp: '2024-03-11 15:30',
      type: 'system',
      severity: 'info',
      message: 'Connection status updated to Active',
      source: 'Connection Manager',
      user: 'system',
      connectionId: 'conn-1',
      metadata: {
        status: 'Active',
        previousStatus: 'Inactive'
      }
    },
    {
      id: '2',
      timestamp: '2024-03-11 15:25',
      type: 'security',
      severity: 'warning',
      message: 'Multiple failed authentication attempts detected',
      source: 'Security Monitor',
      user: 'system',
      connectionId: 'conn-2',
      metadata: {
        attempts: 3,
        ipAddress: '192.168.1.100'
      }
    },
    {
      id: '3',
      timestamp: '2024-03-11 15:15',
      type: 'user',
      severity: 'info',
      message: 'Modified connection bandwidth settings',
      source: 'User Action',
      user: 'sarah.chen@example.com',
      connectionId: 'conn-1',
      metadata: {
        oldValue: '1 Gbps',
        newValue: '10 Gbps'
      }
    },
    {
      id: '4',
      timestamp: '2024-03-11 15:00',
      type: 'performance',
      severity: 'error',
      message: 'High latency detected on connection',
      source: 'Performance Monitor',
      user: 'system',
      connectionId: 'conn-3',
      metadata: {
        latency: '150ms',
        threshold: '100ms'
      }
    }
  ];

  // Filter logs based on search and filters
  const filteredLogs = logs.filter(log => {
    // Filter by connection
    if (selectedConnection !== 'all' && log.connectionId !== selectedConnection) {
      return false;
    }

    // Filter by type
    if (selectedTypes.length > 0 && !selectedTypes.includes(log.type)) {
      return false;
    }

    // Filter by severity
    if (selectedSeverities.length > 0 && !selectedSeverities.includes(log.severity)) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(' ');
      const searchableText = [
        log.message,
        log.source,
        log.user,
        log.type,
        log.severity
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    }

    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'system':
        return <Settings className="h-4 w-4 text-fw-bodyLight" />;
      case 'security':
        return <Shield className="h-4 w-4 text-fw-error" />;
      case 'user':
        return <Activity className="h-4 w-4 text-brand-blue" />;
      case 'performance':
        return <Terminal className="h-4 w-4 text-fw-bodyLight" />;
      default:
        return <Activity className="h-4 w-4 text-fw-bodyLight" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-fw-error bg-fw-errorLight';
      case 'warning':
        return 'text-fw-bodyLight bg-fw-wash';
      case 'info':
        return 'text-brand-blue bg-brand-lightBlue';
      default:
        return 'text-fw-body bg-fw-wash';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center py-2 px-4 bg-fw-base border border-fw-secondary rounded-lg shadow-sm text-fw-body hover:bg-fw-wash"
        >
          <Search className="h-4 w-4 mr-2" />
          <span className="text-figma-base font-medium">Search</span>
        </button>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center py-2 px-4 bg-fw-base border border-fw-secondary rounded-lg shadow-sm text-fw-body hover:bg-fw-wash"
        >
          <Filter className="h-4 w-4 mr-2" />
          <span className="text-figma-base font-medium">Filter</span>
        </button>
      </div>

      {/* Search Panel */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-fw-base rounded-lg border border-fw-secondary overflow-hidden shadow-sm"
          >
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fw-bodyLight h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fw-bodyLight hover:text-fw-body"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-fw-base rounded-lg border border-fw-secondary overflow-hidden shadow-sm"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-figma-base font-medium text-fw-heading">Log Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-1 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-2">
                  Log Types
                </label>
                <div className="space-y-2">
                  {['system', 'security', 'user', 'performance'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedTypes(prev =>
                        prev.includes(type)
                          ? prev.filter(t => t !== type)
                          : [...prev, type]
                      )}
                      className={`
                        block w-full text-left px-3 py-2 rounded-md text-figma-base
                        ${selectedTypes.includes(type)
                          ? 'bg-brand-lightBlue text-brand-blue'
                          : 'text-fw-body hover:bg-fw-wash'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        {getTypeIcon(type)}
                        <span className="ml-2">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-2">
                  Severity Levels
                </label>
                <div className="space-y-2">
                  {['error', 'warning', 'info'].map((severity) => (
                    <button
                      key={severity}
                      onClick={() => setSelectedSeverities(prev =>
                        prev.includes(severity)
                          ? prev.filter(s => s !== severity)
                          : [...prev, severity]
                      )}
                      className={`
                        block w-full text-left px-3 py-2 rounded-md text-figma-base
                        ${selectedSeverities.includes(severity)
                          ? getSeverityColor(severity)
                          : 'text-fw-body hover:bg-fw-wash'
                        }
                      `}
                    >
                      {severity.charAt(0).toUpperCase() + severity.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-2">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
                >
                  <option value="1h">Last Hour</option>
                  <option value="6h">Last 6 Hours</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  onClick={() => {
                    setSelectedTypes([]);
                    setSelectedSeverities([]);
                    setTimeRange('24h');
                  }}
                  className="text-figma-base text-fw-bodyLight hover:text-fw-body"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 bg-brand-blue text-white rounded-lg text-figma-base font-medium hover:bg-brand-darkBlue"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filters */}
      {(selectedTypes.length > 0 || selectedSeverities.length > 0 || searchQuery) && (
        <div className="flex flex-wrap gap-2">
          {selectedTypes.map(type => (
            <span
              key={type}
              className="inline-flex items-center px-2 py-1 rounded-full text-figma-sm font-medium bg-brand-lightBlue text-brand-blue"
            >
              {type}
              <button
                onClick={() => setSelectedTypes(prev => prev.filter(t => t !== type))}
                className="ml-1 hover:text-brand-darkBlue"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedSeverities.map(severity => (
            <span
              key={severity}
              className={`inline-flex items-center px-2 py-1 rounded-full text-figma-sm font-medium ${
                getSeverityColor(severity)
              }`}
            >
              {severity}
              <button
                onClick={() => setSelectedSeverities(prev => prev.filter(s => s !== severity))}
                className="ml-1 hover:text-brand-darkBlue"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {searchQuery && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-figma-sm font-medium bg-fw-neutral text-fw-body">
              "{searchQuery}"
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 hover:text-fw-heading"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Logs List */}
      <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm divide-y divide-fw-secondary">
        {filteredLogs.length === 0 ? (
          <div className="p-6 text-center text-fw-bodyLight">
            <p className="text-figma-base">No logs match the current filters</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  {getTypeIcon(log.type)}
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-figma-sm font-medium ${
                      getSeverityColor(log.severity)
                    }`}>
                      {log.severity.toUpperCase()}
                    </span>
                    <span className="text-figma-sm text-fw-bodyLight">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="mt-1 text-figma-base text-fw-heading">{log.message}</p>
                  <div className="mt-1 text-figma-sm text-fw-bodyLight">
                    <span className="font-medium">Source:</span> {log.source}
                  </div>
                  {log.metadata && (
                    <div className="mt-2 pt-2 border-t border-fw-secondary">
                      <div className="text-figma-sm text-fw-bodyLight font-medium">Details:</div>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        {Object.entries(log.metadata).map(([key, value]) => (
                          <div key={key} className="text-figma-sm">
                            <span className="text-fw-bodyLight">{key}:</span>{' '}
                            <span className="text-fw-heading">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Export Button */}
      <div className="flex justify-center pt-2 pb-8">
        <button
          onClick={() => {
            window.addToast({
              type: 'success',
              title: 'Logs Exported',
              message: 'Log file has been downloaded successfully',
              duration: 3000
            });
          }}
          className="flex items-center justify-center px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-darkBlue transition-colors"
        >
          <Download className="h-4 w-4 mr-2" />
          <span className="font-medium">Export Logs</span>
        </button>
      </div>
    </div>
  );
}