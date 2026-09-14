import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Activity, FileText, Bell, TrendingUp, Network, History, 
  ChevronDown, ChevronUp, Filter, RefreshCw, X, Search,
  ArrowLeft, Menu, BarChart2
} from 'lucide-react';
import { Connection, ConnectionSummary } from '../../types';
import { calculateConnectionSummary } from '../../utils/connections';
import { MobileOverviewTab } from './mobile/MobileOverviewTab';
import { MobileMetricsTab } from './mobile/MobileMetricsTab';
import { MobileAlertsTab } from './mobile/MobileAlertsTab';
import { MobileLogsTab } from './mobile/MobileLogsTab';
import { MobileNetworkAnalyzerTab } from './mobile/MobileNetworkAnalyzerTab';
import { MobileReportingTab } from './mobile/MobileReportingTab';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileMonitoringDashboardProps {
  connections: Connection[];
}

export function MobileMonitoringDashboard({ connections }: MobileMonitoringDashboardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'alerts' | 'logs' | 'analyze' | 'reports'>('overview');
  const [selectedConnection, setSelectedConnection] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('1h');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Set initial active tab from location state
  useEffect(() => {
    const state = location.state as { defaultTab?: typeof activeTab };
    if (state?.defaultTab) {
      setActiveTab(state.defaultTab);
    }
  }, [location]);

  // Filter connections based on selection
  const filteredConnections = selectedConnection === 'all' 
    ? connections 
    : connections.filter(c => c.id === selectedConnection);

  // Calculate summary for the selected connection(s)
  const summary = calculateConnectionSummary(filteredConnections);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'metrics', label: 'Metrics', icon: TrendingUp },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'logs', label: 'Logs', icon: History },
    { id: 'analyze', label: 'Analyzer', icon: Network },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <MobileOverviewTab
            selectedConnection={selectedConnection}
            connections={filteredConnections}
            metrics={summary}
          />
        );
      
      case 'metrics':
        return <MobileMetricsTab metrics={summary} />;
      
      case 'alerts':
        return (
          <MobileAlertsTab
            selectedConnection={selectedConnection}
            connections={filteredConnections}
          />
        );
      
      case 'logs':
        return (
          <MobileLogsTab
            selectedConnection={selectedConnection}
            connections={filteredConnections}
          />
        );
      
      case 'analyze':
        return (
          <MobileNetworkAnalyzerTab
            selectedConnection={selectedConnection}
            connections={filteredConnections}
          />
        );
      
      case 'reports':
        return (
          <MobileReportingTab
            selectedConnection={selectedConnection}
            timeRange={timeRange}
          />
        );
      
      default:
        return <MobileOverviewTab
          selectedConnection={selectedConnection}
          connections={filteredConnections}
          metrics={summary}
        />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-fw-wash">
      {/* Mobile Header */}
      <div className="bg-fw-base border-b border-fw-secondary sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-3 p-2 -ml-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">Network Monitoring</h1>
              <p className="text-figma-sm font-medium text-fw-bodyLight">Real-time network insights</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="p-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
              aria-label="Filter"
            >
              <Filter className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="flex overflow-x-auto hide-scrollbar border-t border-fw-secondary">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`
                flex-1 flex flex-col items-center py-3 px-1 min-w-[4rem]
                transition-colors duration-200 no-rounded tracking-[-0.03em]
                ${activeTab === tab.id
                  ? 'text-fw-link border-b-2 border-fw-active'
                  : 'text-fw-heading border-b-2 border-transparent'
                }
              `}
            >
              <tab.icon className={`h-5 w-5 mb-1 ${
                activeTab === tab.id ? 'text-fw-link' : 'text-fw-heading'
              }`} />
              <span className="text-figma-sm font-medium whitespace-nowrap">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-fw-base border-b border-fw-secondary overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-figma-sm font-medium text-fw-heading">Filters</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label className="block text-figma-sm font-medium text-fw-bodyLight mb-1">
                  Connection
                </label>
                <select
                  value={selectedConnection}
                  onChange={(e) => setSelectedConnection(e.target.value)}
                  className="w-full px-3 rounded-lg h-9 text-figma-base border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
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
                <label className="block text-figma-sm font-medium text-fw-bodyLight mb-1">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-3 rounded-lg h-9 text-figma-base border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
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
                    setSelectedConnection('all');
                    setTimeRange('1h');
                  }}
                  className="text-figma-sm text-fw-bodyLight hover:text-fw-body"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 bg-fw-primary text-white rounded-full text-figma-sm font-medium hover:bg-brand-darkBlue"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-fw-base border-b border-fw-secondary overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-figma-sm font-medium text-fw-heading">Quick Menu</h3>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    window.addToast({
                      type: 'info',
                      title: 'Refreshing Data',
                      message: 'Refreshing monitoring data...',
                      duration: 2000
                    });
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center p-3 text-left text-fw-body hover:bg-fw-wash rounded-lg"
                >
                  <RefreshCw className="h-5 w-5 text-fw-bodyLight mr-3" />
                  <span>Refresh Data</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/monitor', { state: { defaultTab: 'reports' } });
                    setActiveTab('reports');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center p-3 text-left text-fw-body hover:bg-fw-wash rounded-lg"
                >
                  <FileText className="h-5 w-5 text-fw-bodyLight mr-3" />
                  <span>Generate Report</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/notifications');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center p-3 text-left text-fw-body hover:bg-fw-wash rounded-lg"
                >
                  <Bell className="h-5 w-5 text-fw-bodyLight mr-3" />
                  <span>View Notifications</span>
                </button>

                <button
                  onClick={() => {
                    navigate('/support');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center p-3 text-left text-fw-body hover:bg-fw-wash rounded-lg"
                >
                  <BarChart2 className="h-5 w-5 text-fw-bodyLight mr-3" />
                  <span>Help & Resources</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 p-4">
        {renderContent()}
      </div>
    </div>
  );
}