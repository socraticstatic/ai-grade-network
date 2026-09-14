import { useState } from 'react';
import {
  Layers, TrendingUp, AlertTriangle, Zap, Activity, Filter,
  Search, Download, Settings, Plus, Clock, ArrowUpDown, ExternalLink,
  Eye, BarChart3, Wifi, Server, CheckCircle2, XCircle, AlertCircle,
  Video, Cloud, Package, Video as VideoCamera, Code as CodeIcon,
  Film, MessageSquare, PieChart, Shield, Gauge, X, LineChart,
  TrendingDown, Info
} from 'lucide-react';
import { Button } from '../../common/Button';
import { Modal } from '../../common/Modal';
import { VerticalTabGroup } from '../../navigation/VerticalTabGroup';
import { TabItem } from '../../../types/navigation';

interface QoSPolicy {
  priority: 'critical' | 'high' | 'medium' | 'low';
  bandwidthLimit?: number;
  bandwidthGuarantee?: number;
  latencyTarget?: number;
  jitterTarget?: number;
  packetLossTarget?: number;
}

interface NetworkApp {
  id: string;
  name: string;
  category: 'productivity' | 'communication' | 'cloud-storage' | 'streaming' | 'security' | 'development';
  status: 'active' | 'idle' | 'blocked';
  bandwidth: {
    current: number;
    average: number;
    peak: number;
    unit: 'Mbps' | 'Gbps';
  };
  users: number;
  latency: number;
  packets: {
    sent: number;
    received: number;
    lost: number;
  };
  anomalies: Array<{
    type: 'bandwidth-spike' | 'latency-increase' | 'packet-loss' | 'unusual-traffic';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: string;
  }>;
  qos?: QoSPolicy;
}

const mockApps: NetworkApp[] = [
  {
    id: 'app-1',
    name: 'Microsoft Teams',
    category: 'communication',
    status: 'active',
    bandwidth: { current: 127.3, average: 98.5, peak: 245.8, unit: 'Mbps' },
    users: 847,
    latency: 23,
    packets: { sent: 2847293, received: 2845012, lost: 2281 },
    anomalies: [],
    qos: {
      priority: 'critical',
      bandwidthGuarantee: 150,
      latencyTarget: 30,
      jitterTarget: 10,
      packetLossTarget: 0.1
    }
  },
  {
    id: 'app-2',
    name: 'Salesforce',
    category: 'productivity',
    status: 'active',
    bandwidth: { current: 89.4, average: 72.1, peak: 156.3, unit: 'Mbps' },
    users: 523,
    latency: 18,
    packets: { sent: 1923847, received: 1922109, lost: 1738 },
    anomalies: [
      {
        type: 'bandwidth-spike',
        severity: 'medium',
        message: 'Bandwidth usage 40% above average',
        timestamp: '12 minutes ago'
      }
    ],
    qos: {
      priority: 'high',
      bandwidthGuarantee: 100,
      latencyTarget: 50,
      packetLossTarget: 0.5
    }
  },
  {
    id: 'app-3',
    name: 'AWS S3',
    category: 'cloud-storage',
    status: 'active',
    bandwidth: { current: 342.7, average: 289.3, peak: 512.9, unit: 'Mbps' },
    users: 1243,
    latency: 12,
    packets: { sent: 4829384, received: 4827021, lost: 2363 },
    anomalies: [],
    qos: {
      priority: 'medium',
      bandwidthLimit: 500,
      latencyTarget: 100,
      packetLossTarget: 1.0
    }
  },
  {
    id: 'app-4',
    name: 'Zoom',
    category: 'communication',
    status: 'active',
    bandwidth: { current: 176.2, average: 134.7, peak: 298.4, unit: 'Mbps' },
    users: 412,
    latency: 28,
    packets: { sent: 3247829, received: 3245891, lost: 1938 },
    anomalies: [
      {
        type: 'latency-increase',
        severity: 'low',
        message: 'Latency increased by 12ms',
        timestamp: '8 minutes ago'
      }
    ],
    qos: {
      priority: 'critical',
      bandwidthGuarantee: 200,
      latencyTarget: 30,
      jitterTarget: 15,
      packetLossTarget: 0.1
    }
  },
  {
    id: 'app-5',
    name: 'GitHub',
    category: 'development',
    status: 'active',
    bandwidth: { current: 45.8, average: 38.2, peak: 87.3, unit: 'Mbps' },
    users: 298,
    latency: 15,
    packets: { sent: 892374, received: 891023, lost: 1351 },
    anomalies: [],
    qos: {
      priority: 'medium',
      bandwidthGuarantee: 50,
      latencyTarget: 100,
      packetLossTarget: 1.0
    }
  },
  {
    id: 'app-6',
    name: 'Netflix Corporate',
    category: 'streaming',
    status: 'blocked',
    bandwidth: { current: 0, average: 0, peak: 0, unit: 'Mbps' },
    users: 0,
    latency: 0,
    packets: { sent: 0, received: 0, lost: 0 },
    anomalies: [
      {
        type: 'unusual-traffic',
        severity: 'high',
        message: 'Blocked by corporate policy',
        timestamp: '2 hours ago'
      }
    ]
  },
  {
    id: 'app-7',
    name: 'Teams',
    category: 'communication',
    status: 'active',
    bandwidth: { current: 62.1, average: 54.3, peak: 98.7, unit: 'Mbps' },
    users: 892,
    latency: 19,
    packets: { sent: 1473829, received: 1472194, lost: 1635 },
    anomalies: [],
    qos: {
      priority: 'high',
      bandwidthGuarantee: 75,
      latencyTarget: 50,
      packetLossTarget: 0.5
    }
  },
  {
    id: 'app-8',
    name: 'Tableau',
    category: 'productivity',
    status: 'idle',
    bandwidth: { current: 2.3, average: 18.9, peak: 45.2, unit: 'Mbps' },
    users: 12,
    latency: 21,
    packets: { sent: 129384, received: 128471, lost: 913 },
    anomalies: []
  }
];

const availableApps = [
  { id: 'avail-1', name: 'Datadog', category: 'monitoring', description: 'Network performance monitoring' },
  { id: 'avail-2', name: 'Splunk', category: 'analytics', description: 'Log analysis and SIEM' },
  { id: 'avail-3', name: 'Palo Alto', category: 'security', description: 'Next-gen firewall' },
  { id: 'avail-4', name: 'Cisco SD-WAN', category: 'networking', description: 'Software-defined WAN' }
];

export function AppsConfiguration() {
  const [activeView, setActiveView] = useState<'overview' | 'qos' | 'performance' | 'anomalies'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'bandwidth' | 'users' | 'latency' | 'name'>('bandwidth');
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);
  const [selectedApp, setSelectedApp] = useState<NetworkApp | null>(null);
  const [qosModalApp, setQosModalApp] = useState<NetworkApp | null>(null);
  const [apps, setApps] = useState<NetworkApp[]>(mockApps);

  const filteredApps = apps
    .filter(app => {
      const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || app.category === filterCategory;
      const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
      const matchesAnomalies = !showAnomaliesOnly || app.anomalies.length > 0;
      return matchesSearch && matchesCategory && matchesStatus && matchesAnomalies;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'bandwidth': return b.bandwidth.current - a.bandwidth.current;
        case 'users': return b.users - a.users;
        case 'latency': return a.latency - b.latency;
        case 'name': return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

  const totalBandwidth = apps.reduce((sum, app) => sum + app.bandwidth.current, 0);
  const totalUsers = apps.reduce((sum, app) => sum + app.users, 0);
  const activeApps = apps.filter(app => app.status === 'active').length;
  const totalAnomalies = apps.reduce((sum, app) => sum + app.anomalies.length, 0);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      productivity: 'bg-fw-accent text-fw-linkHover',
      communication: 'bg-fw-successLight text-fw-success',
      'cloud-storage': 'bg-fw-wash text-fw-purple',
      streaming: 'bg-fw-errorLight text-fw-error',
      security: 'bg-fw-warn/10 text-fw-warn',
      development: 'bg-fw-successLight text-fw-success'
    };
    return colors[category] || 'bg-fw-neutral text-fw-heading';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-fw-success" />;
      case 'idle': return <Clock className="h-4 w-4 text-fw-bodyLight" />;
      case 'blocked': return <XCircle className="h-4 w-4 text-fw-error" />;
      default: return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-fw-errorLight text-fw-error border-fw-error';
      case 'medium': return 'bg-fw-warn/10 text-fw-warn border-fw-warn/30';
      case 'low': return 'bg-fw-warn/10 text-fw-warn border-fw-warn/30';
      default: return 'bg-fw-neutral text-fw-heading border-fw-secondary';
    }
  };

  const getAppIcon = (appName: string) => {
    const iconMap: Record<string, any> = {
      'Microsoft Teams': Video,
      'Salesforce': Cloud,
      'AWS S3': Package,
      'Zoom': VideoCamera,
      'GitHub': CodeIcon,
      'Netflix Corporate': Film,
      'Teams': MessageSquare,
      'Tableau': PieChart
    };
    const IconComponent = iconMap[appName] || Server;
    return <IconComponent className="h-5 w-5 text-fw-bodyLight" />;
  };

  const getAvailableAppIcon = (appName: string) => {
    const iconMap: Record<string, any> = {
      'Datadog': BarChart3,
      'Splunk': Search,
      'Palo Alto': Shield,
      'Cisco SD-WAN': Wifi
    };
    const IconComponent = iconMap[appName] || Server;
    return <IconComponent className="h-6 w-6 text-fw-bodyLight" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-fw-errorLight text-fw-error border-fw-error';
      case 'high': return 'bg-fw-warn/10 text-fw-warn border-fw-warn/30';
      case 'medium': return 'bg-fw-accent text-fw-linkHover border-fw-active';
      case 'low': return 'bg-fw-neutral text-fw-heading border-fw-secondary';
      default: return 'bg-fw-neutral text-fw-heading border-fw-secondary';
    }
  };

  const handleSaveQoS = (updatedPolicy: QoSPolicy) => {
    if (!qosModalApp) return;

    setApps(prevApps =>
      prevApps.map(app =>
        app.id === qosModalApp.id
          ? { ...app, qos: updatedPolicy }
          : app
      )
    );

    setQosModalApp(null);

    window.addToast({
      type: 'success',
      title: 'QoS Policy Updated',
      message: `Quality of Service settings for ${qosModalApp.name} have been updated.`,
      duration: 3000
    });
  };

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', icon: <Layers className="h-5 w-5" /> },
    { id: 'qos', label: 'QoS Management', icon: <Gauge className="h-5 w-5" /> },
    { id: 'performance', label: 'Performance', icon: <BarChart3 className="h-5 w-5" /> },
    { id: 'anomalies', label: 'Anomalies', icon: <AlertTriangle className="h-5 w-5" />, count: totalAnomalies }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">Network Applications</h2>
          <p className="mt-1 text-figma-sm text-fw-bodyLight">
            Monitor applications, manage QoS policies, and detect performance anomalies
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
          Add Application
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-fw-accent border border-fw-active rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-figma-sm font-medium text-fw-linkHover">Total Bandwidth</p>
            <Activity className="h-5 w-5 text-fw-link" />
          </div>
          <p className="text-figma-xl font-bold text-fw-linkHover">{totalBandwidth.toFixed(1)} Mbps</p>
          <div className="mt-2 flex items-center text-figma-sm">
            <TrendingUp className="h-3 w-3 text-fw-link mr-1" />
            <span className="text-fw-link">↑ 8.3% from last hour</span>
          </div>
        </div>

        <div className="bg-fw-successLight border border-fw-success rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-figma-sm font-medium text-fw-success">Active Apps</p>
            <Layers className="h-5 w-5 text-fw-success" />
          </div>
          <p className="text-figma-xl font-bold text-fw-success">{activeApps} / {mockApps.length}</p>
          <div className="mt-2 flex items-center text-figma-sm">
            <CheckCircle2 className="h-3 w-3 text-fw-success mr-1" />
            <span className="text-fw-success">All systems operational</span>
          </div>
        </div>

        <div className="bg-fw-wash border border-fw-secondary rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-figma-sm font-medium text-fw-purple">Active Users</p>
            <Server className="h-5 w-5 text-fw-purple" />
          </div>
          <p className="text-figma-xl font-bold text-fw-purple">{totalUsers.toLocaleString()}</p>
          <div className="mt-2 flex items-center text-figma-sm">
            <TrendingUp className="h-3 w-3 text-fw-purple mr-1" />
            <span className="text-fw-purple">↑ 142 since last check</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-fw-warn/10 to-fw-warn/15 border border-fw-warn/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-figma-sm font-medium text-fw-heading">Anomalies</p>
            <AlertTriangle className="h-5 w-5 text-fw-warn" />
          </div>
          <p className="text-figma-xl font-bold text-fw-heading">{totalAnomalies}</p>
          <div className="mt-2 flex items-center text-figma-sm">
            <AlertCircle className="h-3 w-3 text-fw-warn mr-1" />
            <span className="text-fw-warn">Requires attention</span>
          </div>
        </div>
      </div>

      {/* Main Content with Vertical Navigation */}
      <div className="flex gap-6">
        {/* Vertical Tab Navigation */}
        <VerticalTabGroup
          tabs={tabs}
          activeTab={activeView}
          onChange={(tab) => setActiveView(tab as any)}
        />

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {/* Overview Tab */}
          {activeView === 'overview' && (
            <>
              {/* Filters and Search */}
              <div className="bg-fw-base border border-fw-secondary rounded-2xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-fw-bodyLight" />
                      <input
                        type="text"
                        placeholder="Search applications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 h-10 border border-fw-bodyLight rounded-lg focus:outline-none focus:ring-2 focus:ring-fw-active"
                      />
                    </div>
                  </div>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2 h-10 border border-fw-bodyLight rounded-lg focus:outline-none focus:ring-2 focus:ring-fw-active"
                  >
                    <option value="all">All Categories</option>
                    <option value="productivity">Productivity</option>
                    <option value="communication">Communication</option>
                    <option value="cloud-storage">Cloud Storage</option>
                    <option value="streaming">Streaming</option>
                    <option value="security">Security</option>
                    <option value="development">Development</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 h-10 border border-fw-bodyLight rounded-lg focus:outline-none focus:ring-2 focus:ring-fw-active"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="idle">Idle</option>
                    <option value="blocked">Blocked</option>
                  </select>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowAnomaliesOnly(!showAnomaliesOnly)}
                      className={`flex-1 px-3 py-2 border rounded-lg transition-colors ${
                        showAnomaliesOnly
                          ? 'bg-fw-warn/10 border-fw-warn/30 text-fw-warn'
                          : 'bg-fw-base border-fw-secondary text-fw-body hover:bg-fw-wash'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4 inline mr-1" />
                      Anomalies
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-fw-secondary">
                  <span className="text-figma-sm text-fw-bodyLight">Sort by:</span>
                  <div className="flex space-x-2">
                    {['bandwidth', 'users', 'latency', 'name'].map((sort) => (
                      <button
                        key={sort}
                        onClick={() => setSortBy(sort as any)}
                        className={`px-3 py-1 text-figma-base rounded-lg transition-colors ${
                          sortBy === sort
                            ? 'bg-fw-accent text-fw-linkHover font-medium'
                            : 'text-fw-bodyLight hover:bg-fw-neutral'
                        }`}
                      >
                        {sort.charAt(0).toUpperCase() + sort.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Applications Table */}
              <div className="overflow-x-auto bg-fw-base rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-fw-wash border-b border-fw-secondary">
                    <tr>
                      <th className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                        Application
                      </th>
                      <th className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                        Status
                      </th>
                      <th className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                        Bandwidth
                      </th>
                      <th className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                        Latency
                      </th>
                      <th className="px-6 h-12 text-left text-[14px] font-medium text-fw-heading">
                        QoS Priority
                      </th>
                      <th className="px-6 h-12 text-right text-[14px] font-medium text-fw-heading">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-fw-secondary">
                    {filteredApps.map((app) => {
                      const packetLossPercent = app.packets.sent > 0 ? ((app.packets.lost / app.packets.sent) * 100).toFixed(3) : '0.000';
                      return (
                        <tr
                          key={app.id}
                          className="hover:bg-fw-wash transition-colors cursor-pointer"
                          onClick={() => setSelectedApp(app)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="p-2 bg-fw-neutral rounded-lg mr-3">
                                {getAppIcon(app.name)}
                              </div>
                              <div>
                                <div className="font-medium text-fw-heading">{app.name}</div>
                                <span className={`inline-block px-2 py-0.5 text-figma-sm font-medium rounded-lg ${getCategoryColor(app.category)}`}>
                                  {app.category.replace('-', ' ')}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(app.status)}
                              <span className="text-[14px] text-fw-heading capitalize">{app.status}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-[14px] font-semibold text-fw-heading">
                              {app.bandwidth.current.toFixed(1)} {app.bandwidth.unit}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Wifi className="h-4 w-4 text-fw-bodyLight mr-1" />
                              <span className="text-[14px] text-fw-heading">{app.latency}ms</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {app.qos ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQosModalApp(app);
                                }}
                                className={`inline-flex items-center px-2 py-1 text-figma-sm font-medium rounded-lg border ${getPriorityColor(app.qos.priority)} hover:shadow-sm transition-all`}
                              >
                                <Gauge className="h-3 w-3 mr-1" />
                                {app.qos.priority.toUpperCase()}
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQosModalApp(app);
                                }}
                                className="text-figma-sm text-fw-bodyLight hover:text-fw-body underline"
                              >
                                Set QoS
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedApp(app);
                                }}
                                className="p-1 hover:bg-fw-neutral rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="h-4 w-4 text-fw-bodyLight" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQosModalApp(app);
                                }}
                                className="p-1 hover:bg-fw-neutral rounded transition-colors"
                                title="Configure QoS"
                              >
                                <Gauge className="h-4 w-4 text-fw-bodyLight" />
                              </button>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-fw-neutral rounded transition-colors"
                                title="Settings"
                              >
                                <Settings className="h-4 w-4 text-fw-bodyLight" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Available Apps to Deploy */}
              <div className="bg-fw-base border border-fw-secondary rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em]">Available Applications</h3>
                    <p className="text-figma-sm text-fw-bodyLight">Deploy additional apps to your network</p>
                  </div>
                  <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />}>
                    Browse Marketplace
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {availableApps.map((app) => (
                    <div key={app.id} className="border border-fw-secondary rounded-2xl p-4 hover:border-fw-active hover:shadow-md transition-all">
                      <div className="p-3 bg-fw-neutral rounded-lg inline-flex mb-3">
                        {getAvailableAppIcon(app.name)}
                      </div>
                      <h4 className="font-semibold text-fw-heading">{app.name}</h4>
                      <p className="text-figma-sm text-fw-bodyLight mt-1">{app.description}</p>
                      <Button variant="secondary" size="sm" className="w-full mt-3" icon={<Plus className="h-4 w-4" />}>
                        Deploy
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
        </>
      )}

          {/* QoS Management Tab */}
          {activeView === 'qos' && (
            <QoSManagementView apps={apps} onEditQoS={setQosModalApp} getPriorityColor={getPriorityColor} getAppIcon={getAppIcon} />
          )}

          {/* Performance Tab */}
          {activeView === 'performance' && (
            <PerformanceView apps={apps} getAppIcon={getAppIcon} getCategoryColor={getCategoryColor} />
          )}

          {/* Anomalies Tab */}
          {activeView === 'anomalies' && (
            <AnomaliesView apps={apps} getSeverityColor={getSeverityColor} getAppIcon={getAppIcon} />
          )}

          {/* Export and Actions */}
          <div className="flex items-center justify-between">
            <div className="text-figma-sm text-fw-bodyLight">
              Showing {filteredApps.length} of {apps.length} applications
            </div>
            <div className="flex space-x-2">
              <Button variant="secondary" icon={<Download className="h-4 w-4" />}>
                Export Report
              </Button>
              <Button variant="secondary" icon={<BarChart3 className="h-4 w-4" />}>
                View Analytics
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* QoS Configuration Modal */}
      {qosModalApp && (
        <QoSModal
          app={qosModalApp}
          onClose={() => setQosModalApp(null)}
          onSave={handleSaveQoS}
        />
      )}

      {/* App Details Modal */}
      {selectedApp && (
        <AppDetailsModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          getAppIcon={getAppIcon}
          getCategoryColor={getCategoryColor}
        />
      )}
    </div>
  );
}

interface QoSManagementViewProps {
  apps: NetworkApp[];
  onEditQoS: (app: NetworkApp) => void;
  getPriorityColor: (priority: string) => string;
  getAppIcon: (appName: string) => JSX.Element;
}

function QoSManagementView({ apps, onEditQoS, getPriorityColor, getAppIcon }: QoSManagementViewProps) {
  const [viewMode, setViewMode] = useState<'category' | 'individual'>('category');
  const [showCategoryQoSModal, setShowCategoryQoSModal] = useState<string | null>(null);
  const appsWithQoS = apps.filter(app => app.qos);
  const appsWithoutQoS = apps.filter(app => !app.qos);

  // Category-based QoS defaults
  const categoryDefaults: Record<string, QoSPolicy> = {
    communication: { priority: 'critical', bandwidthGuarantee: 150, latencyTarget: 30, jitterTarget: 10, packetLossTarget: 0.1 },
    productivity: { priority: 'high', bandwidthGuarantee: 100, latencyTarget: 50, packetLossTarget: 0.5 },
    'cloud-storage': { priority: 'medium', bandwidthLimit: 500, latencyTarget: 100, packetLossTarget: 1.0 },
    development: { priority: 'medium', bandwidthGuarantee: 50, latencyTarget: 100, packetLossTarget: 1.0 },
    security: { priority: 'high', bandwidthGuarantee: 100, latencyTarget: 50, packetLossTarget: 0.5 },
    streaming: { priority: 'low', bandwidthLimit: 200, latencyTarget: 200, packetLossTarget: 2.0 }
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      communication: Video,
      productivity: Cloud,
      'cloud-storage': Package,
      development: CodeIcon,
      security: Shield,
      streaming: Film
    };
    const IconComponent = iconMap[category] || Server;
    return <IconComponent className="h-6 w-6" />;
  };

  const getCategoryLabel = (category: string) => {
    return category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Group apps by category
  const appsByCategory = apps.reduce((acc, app) => {
    if (!acc[app.category]) {
      acc[app.category] = [];
    }
    acc[app.category].push(app);
    return acc;
  }, {} as Record<string, NetworkApp[]>);

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 bg-fw-neutral rounded-lg p-1">
          <button
            onClick={() => setViewMode('category')}
            className={`px-4 py-2 text-figma-base font-medium rounded-lg transition-colors ${
              viewMode === 'category'
                ? 'bg-fw-base text-fw-heading shadow-sm'
                : 'text-fw-bodyLight hover:text-fw-heading'
            }`}
          >
            By Category
          </button>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-4 py-2 text-figma-base font-medium rounded-lg transition-colors ${
              viewMode === 'individual'
                ? 'bg-fw-base text-fw-heading shadow-sm'
                : 'text-fw-bodyLight hover:text-fw-heading'
            }`}
          >
            Individual Apps
          </button>
        </div>
      </div>

      {viewMode === 'category' ? (
        <>
          {/* Category-Based QoS Management */}
          <div className="bg-fw-base border border-fw-secondary rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em]">QoS by Application Type</h3>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Configure QoS policies for entire application categories</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(appsByCategory).map(([category, categoryApps]) => {
                const defaultPolicy = categoryDefaults[category];
                const activeApps = categoryApps.filter(app => app.status === 'active').length;
                const totalBandwidth = categoryApps.reduce((sum, app) => sum + app.bandwidth.current, 0);

                return (
                  <div key={category} className="border border-fw-secondary rounded-2xl p-4 hover:border-fw-active transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-fw-neutral rounded-lg">
                          {getCategoryIcon(category)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-fw-heading">{getCategoryLabel(category)}</h4>
                          <p className="text-figma-sm text-fw-bodyLight">{categoryApps.length} applications</p>
                        </div>
                      </div>
                      {defaultPolicy && (
                        <span className={`px-2 py-1 text-figma-sm font-medium rounded-lg border ${getPriorityColor(defaultPolicy.priority)}`}>
                          {defaultPolicy.priority.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-figma-base">
                        <span className="text-fw-bodyLight">Active Apps:</span>
                        <span className="font-medium text-fw-heading">{activeApps} / {categoryApps.length}</span>
                      </div>
                      <div className="flex justify-between text-figma-base">
                        <span className="text-fw-bodyLight">Total Bandwidth:</span>
                        <span className="font-medium text-fw-heading">{totalBandwidth.toFixed(1)} Mbps</span>
                      </div>
                      {defaultPolicy && (
                        <>
                          {defaultPolicy.bandwidthGuarantee && (
                            <div className="flex justify-between text-figma-base">
                              <span className="text-fw-bodyLight">Guarantee:</span>
                              <span className="font-medium text-fw-heading">{defaultPolicy.bandwidthGuarantee} Mbps</span>
                            </div>
                          )}
                          {defaultPolicy.latencyTarget && (
                            <div className="flex justify-between text-figma-base">
                              <span className="text-fw-bodyLight">Latency Target:</span>
                              <span className="font-medium text-fw-heading">{defaultPolicy.latencyTarget}ms</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      icon={<Settings className="h-4 w-4" />}
                      onClick={() => setShowCategoryQoSModal(category)}
                    >
                      Configure Category QoS
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-fw-accent border border-fw-active rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-fw-link mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-figma-base font-semibold text-fw-linkHover mb-1">Category-Based QoS</h4>
                <p className="text-figma-base text-fw-linkHover">
                  Set default QoS policies for application categories. When you add new applications, they'll automatically inherit
                  the QoS settings from their category. You can still override individual app settings if needed.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Individual App QoS Management */}
          <div className="bg-fw-base border border-fw-secondary rounded-2xl p-6">
            <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] mb-4">QoS Policies Overview</h3>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {(['critical', 'high', 'medium', 'low'] as const).map(priority => {
                const count = appsWithQoS.filter(app => app.qos?.priority === priority).length;
                return (
                  <div key={priority} className={`p-4 rounded-lg border ${getPriorityColor(priority)}`}>
                    <div className="text-figma-base font-medium mb-1">{priority.toUpperCase()}</div>
                    <div className="text-figma-xl font-bold">{count}</div>
                    <div className="text-figma-sm mt-1">Applications</div>
                  </div>
                );
              })}
            </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Applications with QoS Policies</h4>
            <div className="space-y-2">
              {appsWithQoS.map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 bg-fw-wash rounded-lg hover:bg-fw-neutral transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-fw-base rounded-lg">
                      {getAppIcon(app.name)}
                    </div>
                    <div>
                      <div className="font-medium text-fw-heading">{app.name}</div>
                      <div className="text-figma-sm text-fw-bodyLight">
                        {app.qos?.bandwidthGuarantee && `${app.qos.bandwidthGuarantee} Mbps guaranteed`}
                        {app.qos?.latencyTarget && ` • ${app.qos.latencyTarget}ms latency target`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 text-figma-sm font-medium rounded-lg border ${getPriorityColor(app.qos!.priority)}`}>
                      {app.qos!.priority.toUpperCase()}
                    </span>
                    <button
                      onClick={() => onEditQoS(app)}
                      className="p-2 hover:bg-fw-neutral rounded transition-colors"
                    >
                      <Settings className="h-4 w-4 text-fw-bodyLight" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {appsWithoutQoS.length > 0 && (
            <div>
              <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Applications without QoS Policies</h4>
              <div className="space-y-2">
                {appsWithoutQoS.map(app => (
                  <div key={app.id} className="flex items-center justify-between p-3 bg-fw-warn/10 rounded-lg border border-fw-warn/30">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-fw-base rounded-lg">
                        {getAppIcon(app.name)}
                      </div>
                      <div>
                        <div className="font-medium text-fw-heading">{app.name}</div>
                        <div className="text-figma-sm text-fw-bodyLight">No QoS policy configured</div>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onEditQoS(app)}
                    >
                      Configure QoS
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
            </div>
          </div>
        </>
      )}

      {/* Category QoS Modal (placeholder - would open similar QoS modal for category defaults) */}
      {showCategoryQoSModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCategoryQoSModal(null)}
          title={`Configure QoS for ${getCategoryLabel(showCategoryQoSModal)}`}
        >
          <div className="space-y-4">
            <div className="bg-fw-accent border border-fw-active rounded-2xl p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-fw-link flex-shrink-0" />
                <div className="text-figma-base text-fw-linkHover">
                  <p className="font-medium mb-1">Category Default QoS Policy</p>
                  <p>This policy will be applied to all applications in the {getCategoryLabel(showCategoryQoSModal)} category.
                  Individual apps can override these settings if needed.</p>
                </div>
              </div>
            </div>

            <div className="bg-fw-wash rounded-lg p-4">
              <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Current Settings</h4>
              {categoryDefaults[showCategoryQoSModal] && (
                <div className="space-y-2 text-figma-base">
                  <div className="flex justify-between">
                    <span className="text-fw-bodyLight">Priority:</span>
                    <span className={`px-2 py-0.5 text-figma-sm font-medium rounded-lg border ${getPriorityColor(categoryDefaults[showCategoryQoSModal].priority)}`}>
                      {categoryDefaults[showCategoryQoSModal].priority.toUpperCase()}
                    </span>
                  </div>
                  {categoryDefaults[showCategoryQoSModal].bandwidthGuarantee && (
                    <div className="flex justify-between">
                      <span className="text-fw-bodyLight">Bandwidth Guarantee:</span>
                      <span className="font-medium">{categoryDefaults[showCategoryQoSModal].bandwidthGuarantee} Mbps</span>
                    </div>
                  )}
                  {categoryDefaults[showCategoryQoSModal].latencyTarget && (
                    <div className="flex justify-between">
                      <span className="text-fw-bodyLight">Latency Target:</span>
                      <span className="font-medium">{categoryDefaults[showCategoryQoSModal].latencyTarget}ms</span>
                    </div>
                  )}
                  {categoryDefaults[showCategoryQoSModal].packetLossTarget && (
                    <div className="flex justify-between">
                      <span className="text-fw-bodyLight">Packet Loss Target:</span>
                      <span className="font-medium">{categoryDefaults[showCategoryQoSModal].packetLossTarget}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-fw-secondary">
              <Button variant="secondary" onClick={() => setShowCategoryQoSModal(null)}>
                Close
              </Button>
              <Button variant="primary" onClick={() => {
                window.addToast({
                  type: 'success',
                  title: 'Category QoS Updated',
                  message: `QoS settings for ${getCategoryLabel(showCategoryQoSModal)} have been updated.`,
                  duration: 3000
                });
                setShowCategoryQoSModal(null);
              }}>
                Save Category QoS
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

interface PerformanceViewProps {
  apps: NetworkApp[];
  getAppIcon: (appName: string) => JSX.Element;
  getCategoryColor: (category: string) => string;
}

function PerformanceView({ apps, getAppIcon, getCategoryColor }: PerformanceViewProps) {
  return (
    <div className="space-y-6">
      <div className="bg-fw-base border border-fw-secondary rounded-2xl p-6">
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] mb-4">Performance Assessment</h3>

        <div className="space-y-4">
          {apps.filter(app => app.status === 'active').map(app => {
            const packetLossPercent = app.packets.sent > 0 ? ((app.packets.lost / app.packets.sent) * 100) : 0;
            const bandwidthUtilization = app.qos?.bandwidthGuarantee
              ? (app.bandwidth.current / app.qos.bandwidthGuarantee) * 100
              : 0;

            const latencyStatus = app.qos?.latencyTarget
              ? app.latency <= app.qos.latencyTarget ? 'good' : 'warning'
              : 'unknown';

            const packetLossStatus = app.qos?.packetLossTarget
              ? packetLossPercent <= app.qos.packetLossTarget ? 'good' : 'warning'
              : 'unknown';

            return (
              <div key={app.id} className="border border-fw-secondary rounded-2xl p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-fw-neutral rounded-lg">
                      {getAppIcon(app.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-fw-heading">{app.name}</div>
                      <span className={`inline-block px-2 py-0.5 text-figma-sm font-medium rounded-lg ${getCategoryColor(app.category)}`}>
                        {app.category.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-figma-sm text-fw-bodyLight">Active Users</div>
                    <div className="text-lg font-bold text-fw-heading">{app.users}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-fw-wash rounded-lg p-3">
                    <div className="text-figma-sm text-fw-bodyLight mb-1">Bandwidth</div>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-bold text-fw-heading">{app.bandwidth.current.toFixed(1)}</span>
                      <span className="text-figma-sm text-fw-bodyLight">Mbps</span>
                    </div>
                    <div className="text-figma-sm text-fw-bodyLight mt-1">
                      Avg: {app.bandwidth.average.toFixed(1)} | Peak: {app.bandwidth.peak.toFixed(1)}
                    </div>
                    {app.qos?.bandwidthGuarantee && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-figma-sm mb-1">
                          <span className="text-fw-bodyLight">Utilization</span>
                          <span className="font-medium">{bandwidthUtilization.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-fw-neutral rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${bandwidthUtilization > 90 ? 'bg-fw-error' : bandwidthUtilization > 70 ? 'bg-fw-warn' : 'bg-fw-success'}`}
                            style={{ width: `${Math.min(bandwidthUtilization, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`rounded-lg p-3 ${latencyStatus === 'good' ? 'bg-fw-successLight border border-fw-success' : latencyStatus === 'warning' ? 'bg-fw-warn/10 border border-fw-warn/30' : 'bg-fw-wash'}`}>
                    <div className="text-figma-sm text-fw-bodyLight mb-1">Latency</div>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-bold text-fw-heading">{app.latency}</span>
                      <span className="text-figma-sm text-fw-bodyLight">ms</span>
                    </div>
                    {app.qos?.latencyTarget && (
                      <div className="text-figma-sm text-fw-bodyLight mt-1">
                        Target: {app.qos.latencyTarget}ms
                        <span className={`ml-1 ${latencyStatus === 'good' ? 'text-fw-success' : 'text-fw-warn'}`}>
                          {latencyStatus === 'good' ? '✓' : '⚠'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={`rounded-lg p-3 ${packetLossStatus === 'good' ? 'bg-fw-successLight border border-fw-success' : packetLossStatus === 'warning' ? 'bg-fw-warn/10 border border-fw-warn/30' : 'bg-fw-wash'}`}>
                    <div className="text-figma-sm text-fw-bodyLight mb-1">Packet Loss</div>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-lg font-bold text-fw-heading">{packetLossPercent.toFixed(3)}</span>
                      <span className="text-figma-sm text-fw-bodyLight">%</span>
                    </div>
                    {app.qos?.packetLossTarget && (
                      <div className="text-figma-sm text-fw-bodyLight mt-1">
                        Target: {app.qos.packetLossTarget}%
                        <span className={`ml-1 ${packetLossStatus === 'good' ? 'text-fw-success' : 'text-fw-warn'}`}>
                          {packetLossStatus === 'good' ? '✓' : '⚠'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="bg-fw-wash rounded-lg p-3">
                    <div className="text-figma-sm text-fw-bodyLight mb-1">Packets</div>
                    <div className="text-figma-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-fw-bodyLight">Sent:</span>
                        <span className="font-medium">{app.packets.sent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fw-bodyLight">Received:</span>
                        <span className="font-medium">{app.packets.received.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fw-error">Lost:</span>
                        <span className="font-medium text-fw-error">{app.packets.lost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface AnomaliesViewProps {
  apps: NetworkApp[];
  getSeverityColor: (severity: string) => string;
  getAppIcon: (appName: string) => JSX.Element;
}

function AnomaliesView({ apps, getSeverityColor, getAppIcon }: AnomaliesViewProps) {
  const allAnomalies = apps.flatMap(app =>
    app.anomalies.map(anomaly => ({ ...anomaly, app }))
  );

  return (
    <div className="space-y-6">
      <div className="bg-fw-base border border-fw-secondary rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em]">Detected Anomalies</h3>
          <div className="flex items-center space-x-2">
            <span className="text-figma-sm text-fw-bodyLight">{allAnomalies.length} total anomalies</span>
          </div>
        </div>

        {allAnomalies.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-12 w-12 text-fw-success mx-auto mb-3" />
            <h4 className="text-figma-lg font-bold text-fw-heading mb-2">No Anomalies Detected</h4>
            <p className="text-fw-bodyLight">All applications are performing within expected parameters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allAnomalies.map((anomaly, idx) => (
              <div
                key={idx}
                className={`flex items-start space-x-4 p-4 rounded-lg border ${getSeverityColor(anomaly.severity)}`}
              >
                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 bg-fw-base rounded">
                        {getAppIcon(anomaly.app.name)}
                      </div>
                      <span className="font-semibold text-fw-heading">{anomaly.app.name}</span>
                    </div>
                    <span className="text-figma-sm px-2 py-0.5 bg-fw-base rounded font-medium">
                      {anomaly.type.replace('-', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-figma-base text-fw-heading">{anomaly.message}</p>
                  <p className="text-figma-sm text-fw-bodyLight mt-1">{anomaly.timestamp}</p>
                </div>
                <button className="p-2 hover:bg-fw-base rounded transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-fw-accent border border-fw-active rounded-2xl p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-fw-link mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-figma-base font-semibold text-fw-linkHover mb-1">About Anomaly Detection</h4>
            <p className="text-figma-base text-fw-linkHover">
              Our system continuously monitors application performance and automatically detects unusual patterns in bandwidth usage, latency, packet loss, and traffic behavior. Anomalies are classified by severity to help you prioritize investigation and response.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface QoSModalProps {
  app: NetworkApp;
  onClose: () => void;
  onSave: (policy: QoSPolicy) => void;
}

function QoSModal({ app, onClose, onSave }: QoSModalProps) {
  const [priority, setPriority] = useState<QoSPolicy['priority']>(app.qos?.priority || 'medium');
  const [bandwidthLimit, setBandwidthLimit] = useState<string>(app.qos?.bandwidthLimit?.toString() || '');
  const [bandwidthGuarantee, setBandwidthGuarantee] = useState<string>(app.qos?.bandwidthGuarantee?.toString() || '');
  const [latencyTarget, setLatencyTarget] = useState<string>(app.qos?.latencyTarget?.toString() || '');
  const [jitterTarget, setJitterTarget] = useState<string>(app.qos?.jitterTarget?.toString() || '');
  const [packetLossTarget, setPacketLossTarget] = useState<string>(app.qos?.packetLossTarget?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const policy: QoSPolicy = {
      priority,
      ...(bandwidthLimit && { bandwidthLimit: parseFloat(bandwidthLimit) }),
      ...(bandwidthGuarantee && { bandwidthGuarantee: parseFloat(bandwidthGuarantee) }),
      ...(latencyTarget && { latencyTarget: parseFloat(latencyTarget) }),
      ...(jitterTarget && { jitterTarget: parseFloat(jitterTarget) }),
      ...(packetLossTarget && { packetLossTarget: parseFloat(packetLossTarget) })
    };

    onSave(policy);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Configure QoS for ${app.name}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Priority Selection */}
        <div>
          <label className="block text-figma-sm font-medium text-fw-body mb-2">
            Priority Level
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(['critical', 'high', 'medium', 'low'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setPriority(level)}
                className={`px-4 py-3 text-figma-base font-medium rounded-lg border-2 transition-all ${
                  priority === level
                    ? level === 'critical'
                      ? 'border-fw-error bg-fw-errorLight text-fw-error'
                      : level === 'high'
                      ? 'border-fw-warn bg-fw-warn/10 text-fw-warn'
                      : level === 'medium'
                      ? 'border-fw-active bg-fw-accent text-fw-linkHover'
                      : 'border-fw-secondary bg-fw-wash text-fw-heading'
                    : 'border-fw-secondary bg-fw-base text-fw-body hover:border-fw-secondary'
                }`}
              >
                <Gauge className="h-4 w-4 inline mr-2" />
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-figma-sm text-fw-bodyLight">
            {priority === 'critical' && 'Mission-critical applications with highest priority'}
            {priority === 'high' && 'Important business applications with elevated priority'}
            {priority === 'medium' && 'Standard business applications with normal priority'}
            {priority === 'low' && 'Best-effort traffic with lowest priority'}
          </p>
        </div>

        {/* Bandwidth Configuration */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-figma-sm font-medium text-fw-body mb-2">
              Bandwidth Limit (Mbps)
            </label>
            <input
              type="number"
              value={bandwidthLimit}
              onChange={(e) => setBandwidthLimit(e.target.value)}
              placeholder="No limit"
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-fw-bodyLight rounded-lg focus:outline-none focus:ring-2 focus:ring-fw-active"
            />
            <p className="mt-1 text-figma-sm text-fw-bodyLight">Maximum bandwidth allowed</p>
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-body mb-2">
              Bandwidth Guarantee (Mbps)
            </label>
            <input
              type="number"
              value={bandwidthGuarantee}
              onChange={(e) => setBandwidthGuarantee(e.target.value)}
              placeholder="No guarantee"
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-fw-bodyLight rounded-lg focus:outline-none focus:ring-2 focus:ring-fw-active"
            />
            <p className="mt-1 text-figma-sm text-fw-bodyLight">Minimum bandwidth reserved</p>
          </div>
        </div>

        {/* Performance Targets */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-figma-sm font-medium text-fw-body mb-2">
              Latency Target (ms)
            </label>
            <input
              type="number"
              value={latencyTarget}
              onChange={(e) => setLatencyTarget(e.target.value)}
              placeholder="No target"
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-fw-bodyLight rounded-lg focus:outline-none focus:ring-2 focus:ring-fw-active"
            />
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-body mb-2">
              Jitter Target (ms)
            </label>
            <input
              type="number"
              value={jitterTarget}
              onChange={(e) => setJitterTarget(e.target.value)}
              placeholder="No target"
              min="0"
              step="1"
              className="w-full px-3 py-2 border border-fw-bodyLight rounded-lg focus:outline-none focus:ring-2 focus:ring-fw-active"
            />
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-body mb-2">
              Packet Loss (%)
            </label>
            <input
              type="number"
              value={packetLossTarget}
              onChange={(e) => setPacketLossTarget(e.target.value)}
              placeholder="No target"
              min="0"
              max="100"
              step="0.01"
              className="w-full px-3 py-2 border border-fw-bodyLight rounded-lg focus:outline-none focus:ring-2 focus:ring-fw-active"
            />
          </div>
        </div>

        {/* Current Metrics */}
        <div className="bg-fw-wash rounded-lg p-4 border border-fw-secondary">
          <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Current Performance</h4>
          <div className="grid grid-cols-3 gap-4 text-figma-base">
            <div>
              <div className="text-fw-bodyLight">Bandwidth</div>
              <div className="font-semibold text-fw-heading">{app.bandwidth.current.toFixed(1)} Mbps</div>
            </div>
            <div>
              <div className="text-fw-bodyLight">Latency</div>
              <div className="font-semibold text-fw-heading">{app.latency}ms</div>
            </div>
            <div>
              <div className="text-fw-bodyLight">Packet Loss</div>
              <div className="font-semibold text-fw-heading">
                {app.packets.sent > 0 ? ((app.packets.lost / app.packets.sent) * 100).toFixed(3) : '0.000'}%
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-fw-secondary">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save QoS Policy
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface AppDetailsModalProps {
  app: NetworkApp;
  onClose: () => void;
  getAppIcon: (appName: string) => JSX.Element;
  getCategoryColor: (category: string) => string;
}

function AppDetailsModal({ app, onClose, getAppIcon, getCategoryColor }: AppDetailsModalProps) {
  const packetLossPercent = app.packets.sent > 0 ? ((app.packets.lost / app.packets.sent) * 100).toFixed(3) : '0.000';

  return (
    <Modal isOpen={true} onClose={onClose} title="Application Details">
      <div className="space-y-6">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-fw-neutral rounded-lg">
            {getAppIcon(app.name)}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-fw-heading tracking-[-0.03em]">{app.name}</h3>
            <span className={`inline-block px-2 py-0.5 text-figma-sm font-medium rounded-lg ${getCategoryColor(app.category)} mt-1`}>
              {app.category.replace('-', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-fw-wash rounded-lg p-4">
            <div className="text-figma-sm text-fw-bodyLight mb-1">Status</div>
            <div className="text-figma-lg font-bold text-fw-heading capitalize">{app.status}</div>
          </div>
          <div className="bg-fw-wash rounded-lg p-4">
            <div className="text-figma-sm text-fw-bodyLight mb-1">Active Users</div>
            <div className="text-figma-lg font-bold text-fw-heading">{app.users}</div>
          </div>
        </div>

        <div>
          <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Bandwidth Usage</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-figma-base">
              <span className="text-fw-bodyLight">Current:</span>
              <span className="font-medium">{app.bandwidth.current.toFixed(1)} {app.bandwidth.unit}</span>
            </div>
            <div className="flex justify-between text-figma-base">
              <span className="text-fw-bodyLight">Average:</span>
              <span className="font-medium">{app.bandwidth.average.toFixed(1)} {app.bandwidth.unit}</span>
            </div>
            <div className="flex justify-between text-figma-base">
              <span className="text-fw-bodyLight">Peak:</span>
              <span className="font-medium">{app.bandwidth.peak.toFixed(1)} {app.bandwidth.unit}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Network Performance</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-fw-wash rounded-lg p-3">
              <div className="text-figma-sm text-fw-bodyLight mb-1">Latency</div>
              <div className="text-figma-lg font-bold text-fw-heading">{app.latency}ms</div>
            </div>
            <div className="bg-fw-wash rounded-lg p-3">
              <div className="text-figma-sm text-fw-bodyLight mb-1">Packet Loss</div>
              <div className="text-figma-lg font-bold text-fw-heading">{packetLossPercent}%</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-figma-base font-semibold text-fw-heading mb-3">Packet Statistics</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-figma-base">
              <span className="text-fw-bodyLight">Sent:</span>
              <span className="font-medium">{app.packets.sent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-figma-base">
              <span className="text-fw-bodyLight">Received:</span>
              <span className="font-medium">{app.packets.received.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-figma-base">
              <span className="text-fw-error">Lost:</span>
              <span className="font-medium text-fw-error">{app.packets.lost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {app.qos && (
          <div>
            <h4 className="text-figma-base font-semibold text-fw-heading mb-3">QoS Configuration</h4>
            <div className="bg-fw-accent border border-fw-active rounded-2xl p-3">
              <div className="text-figma-base space-y-1">
                <div className="flex justify-between">
                  <span className="text-fw-bodyLight">Priority:</span>
                  <span className="font-medium text-fw-linkHover">{app.qos.priority.toUpperCase()}</span>
                </div>
                {app.qos.bandwidthGuarantee && (
                  <div className="flex justify-between">
                    <span className="text-fw-bodyLight">Bandwidth Guarantee:</span>
                    <span className="font-medium">{app.qos.bandwidthGuarantee} Mbps</span>
                  </div>
                )}
                {app.qos.latencyTarget && (
                  <div className="flex justify-between">
                    <span className="text-fw-bodyLight">Latency Target:</span>
                    <span className="font-medium">{app.qos.latencyTarget}ms</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-fw-secondary">
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
