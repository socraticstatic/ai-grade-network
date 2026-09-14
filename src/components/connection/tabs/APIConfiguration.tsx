import { useState } from 'react';
import { Code, Plus, Settings, Key, Shield, Activity, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '../../common/Button';

interface APIIntegration {
  id: string;
  name: string;
  category: 'monitoring' | 'automation' | 'analytics' | 'security' | 'management';
  description: string;
  status: 'active' | 'inactive' | 'configured';
  endpoint?: string;
  lastSync?: string;
  version: string;
}

const mockAPIs: APIIntegration[] = [
  {
    id: 'api-1',
    name: 'Datadog Network Monitoring',
    category: 'monitoring',
    description: 'Real-time network performance metrics and alerting',
    status: 'active',
    endpoint: 'https://api.datadoghq.com/v1/network',
    lastSync: '2 minutes ago',
    version: 'v2.1'
  },
  {
    id: 'api-2',
    name: 'Splunk Log Integration',
    category: 'analytics',
    description: 'Stream connection logs and events to Splunk',
    status: 'active',
    endpoint: 'https://splunk.example.com/services/collector',
    lastSync: '5 minutes ago',
    version: 'v8.2'
  },
  {
    id: 'api-3',
    name: 'Terraform Provider',
    category: 'automation',
    description: 'Infrastructure as Code automation for network resources',
    status: 'configured',
    endpoint: 'https://registry.terraform.io/providers/att/netbond',
    version: 'v1.5'
  },
  {
    id: 'api-4',
    name: 'ServiceNow CMDB',
    category: 'management',
    description: 'Synchronize connection inventory with ServiceNow',
    status: 'inactive',
    endpoint: 'https://servicenow.example.com/api/now/table/cmdb_ci_network',
    version: 'v3.0'
  },
  {
    id: 'api-5',
    name: 'Palo Alto Networks',
    category: 'security',
    description: 'Firewall policy and threat intelligence integration',
    status: 'configured',
    endpoint: 'https://api.prismaaccess.com/v1',
    version: 'v2.0'
  },
  {
    id: 'api-6',
    name: 'Grafana Visualization',
    category: 'monitoring',
    description: 'Custom dashboards and time-series data visualization',
    status: 'active',
    endpoint: 'https://grafana.example.com/api/datasources',
    lastSync: '1 minute ago',
    version: 'v9.3'
  }
];

export function APIConfiguration() {
  const [selectedAPI, setSelectedAPI] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleCopyAPIKey = () => {
    navigator.clipboard.writeText('nb_live_sk_1234567890abcdefghijklmnopqrstuvwxyz');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'monitoring': return 'bg-fw-accent text-fw-linkHover';
      case 'automation': return 'bg-fw-successLight text-fw-success';
      case 'analytics': return 'bg-fw-purpleLight text-fw-purple';
      case 'security': return 'bg-fw-errorLight text-fw-error';
      case 'management': return 'bg-fw-warn/10 text-fw-warn';
      default: return 'bg-fw-neutral text-fw-heading';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-fw-successLight text-fw-success';
      case 'configured': return 'bg-fw-warn/10 text-fw-warn';
      case 'inactive': return 'bg-fw-neutral text-fw-heading';
      default: return 'bg-fw-neutral text-fw-heading';
    }
  };

  const filteredAPIs = filterCategory === 'all'
    ? mockAPIs
    : mockAPIs.filter(api => api.category === filterCategory);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.04em]">API Integrations</h2>
          <p className="mt-1 text-figma-sm text-fw-bodyLight">
            Connect third-party tools and services to your network connection
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />}>
          Add Integration
        </Button>
      </div>

      {/* API Key Section */}
      <div className="bg-fw-accent border border-fw-active rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-fw-accent rounded-lg">
              <Key className="h-5 w-5 text-fw-link" />
            </div>
            <div>
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em]">API Access Key</h3>
              <p className="mt-1 text-figma-sm text-fw-bodyLight">
                Use this key to authenticate API requests for this connection
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <code className="px-3 py-2 bg-fw-base border border-fw-active rounded-lg text-figma-base font-mono text-fw-heading">
                  nb_live_sk_1234...wxyz
                </code>
                <button
                  onClick={handleCopyAPIKey}
                  className="p-2 hover:bg-fw-accent rounded-lg transition-colors"
                  title="Copy API Key"
                >
                  {copiedKey ? (
                    <Check className="h-4 w-4 text-fw-success" />
                  ) : (
                    <Copy className="h-4 w-4 text-fw-bodyLight" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={<Settings className="h-4 w-4" />}>
            Manage Keys
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-fw-base border border-fw-secondary rounded-2xl p-6">
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] mb-4">API Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-figma-sm font-medium text-fw-body mb-2">
              Rate Limiting
            </label>
            <select className="w-full px-3 h-9 border border-fw-bodyLight rounded-lg text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active">
              <option>Standard (1000 requests/hour)</option>
              <option>Enhanced (5000 requests/hour)</option>
              <option>Premium (25000 requests/hour)</option>
              <option>Unlimited</option>
            </select>
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-body mb-2">
              Webhook Notifications
            </label>
            <input
              type="url"
              placeholder="https://example.com/webhooks"
              className="w-full px-3 h-9 border border-fw-bodyLight rounded-lg text-figma-base focus:outline-none focus:ring-2 focus:ring-fw-active"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-figma-sm font-medium text-fw-body">Enable API Logging</span>
              <p className="text-figma-sm text-fw-bodyLight">Log all API requests for auditing</p>
            </div>
            <button
              className="toggle-switch relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer border-2 border-transparent bg-brand-blue transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              <span className="pointer-events-none inline-block h-4 w-4 transform bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-4" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-figma-sm font-medium text-fw-body">IP Whitelisting</span>
              <p className="text-figma-sm text-fw-bodyLight">Restrict API access by IP address</p>
            </div>
            <button
              className="toggle-switch relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer border-2 border-transparent bg-fw-neutral transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
            >
              <span className="pointer-events-none inline-block h-4 w-4 transform bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-fw-secondary">
        <nav className="-mb-px flex space-x-6">
          {['all', 'monitoring', 'automation', 'analytics', 'security', 'management'].map((category) => (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 font-medium text-figma-base no-rounded
                ${filterCategory === category
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-fw-bodyLight hover:text-fw-body hover:border-fw-secondary'
                }
              `}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* API Integrations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredAPIs.map((api) => (
          <div
            key={api.id}
            className="bg-fw-base border border-fw-secondary rounded-2xl p-6 hover:border-brand-blue hover:shadow-md transition-all cursor-pointer"
            onClick={() => setSelectedAPI(api.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-fw-neutral rounded-lg">
                  <Code className="h-5 w-5 text-fw-bodyLight" />
                </div>
                <div>
                  <h3 className="font-semibold text-fw-heading">{api.name}</h3>
                  <p className="text-figma-sm text-fw-bodyLight mt-1">{api.description}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-3">
              <span className={`px-2 py-1 text-figma-sm font-medium rounded-lg ${getCategoryColor(api.category)}`}>
                {api.category}
              </span>
              <span className={`px-2 py-1 text-figma-sm font-medium rounded-lg ${getStatusColor(api.status)}`}>
                {api.status}
              </span>
              <span className="px-2 py-1 text-figma-sm font-medium bg-fw-neutral text-fw-bodyLight rounded-lg">
                {api.version}
              </span>
            </div>

            {api.endpoint && (
              <div className="mb-3">
                <p className="text-figma-sm text-fw-bodyLight mb-1">Endpoint</p>
                <code className="text-figma-sm font-mono text-fw-body bg-fw-wash px-2 py-1 rounded break-all">
                  {api.endpoint}
                </code>
              </div>
            )}

            {api.lastSync && (
              <div className="flex items-center text-figma-sm text-fw-bodyLight">
                <Activity className="h-3 w-3 mr-1" />
                Last synced {api.lastSync}
              </div>
            )}

            <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-fw-secondary">
              <Button variant="secondary" size="sm" icon={<Settings className="h-4 w-4" />}>
                Configure
              </Button>
              <Button variant="secondary" size="sm" icon={<ExternalLink className="h-4 w-4" />}>
                Docs
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Stats */}
      <div className="bg-fw-base border border-fw-secondary rounded-2xl p-6">
        <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em] mb-4">API Usage Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-fw-accent border border-fw-active rounded-lg p-4">
            <p className="text-figma-sm text-fw-link font-medium">Total Requests</p>
            <p className="text-figma-xl font-bold text-fw-linkHover mt-1">847,293</p>
            <p className="text-figma-sm text-fw-link mt-1">↑ 12% from last week</p>
          </div>
          <div className="bg-fw-successLight border border-fw-success rounded-lg p-4">
            <p className="text-figma-sm text-fw-success font-medium">Success Rate</p>
            <p className="text-figma-xl font-bold text-fw-success mt-1">99.8%</p>
            <p className="text-figma-sm text-fw-success mt-1">↑ 0.3% from last week</p>
          </div>
          <div className="bg-fw-warn/10 border border-fw-warn/30 rounded-lg p-4">
            <p className="text-figma-sm text-fw-warn font-medium">Avg Response Time</p>
            <p className="text-figma-xl font-bold text-fw-heading mt-1">142ms</p>
            <p className="text-figma-sm text-fw-warn mt-1">↓ 8ms from last week</p>
          </div>
          <div className="bg-fw-purpleLight border border-fw-purpleLight rounded-lg p-4">
            <p className="text-figma-sm text-fw-purple font-medium">Active Integrations</p>
            <p className="text-figma-xl font-bold text-fw-purple mt-1">3</p>
            <p className="text-figma-sm text-fw-purple mt-1">of 6 configured</p>
          </div>
        </div>
      </div>

      {/* Documentation Link */}
      <div className="bg-fw-wash border border-fw-secondary rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-fw-base rounded-lg border border-fw-secondary">
              <AlertCircle className="h-5 w-5 text-fw-bodyLight" />
            </div>
            <div>
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.04em]">API Documentation</h3>
              <p className="text-figma-sm text-fw-bodyLight">
                Learn how to integrate with the AI-grade network's APIs and webhooks
              </p>
            </div>
          </div>
          <Button variant="secondary" icon={<ExternalLink className="h-4 w-4" />}>
            View Docs
          </Button>
        </div>
      </div>
    </div>
  );
}
