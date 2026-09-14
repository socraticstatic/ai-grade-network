import { Cloud, ArrowRight, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AWSConnection {
  id: string;
  requestId: string;
  connectionName: string;
  region: string;
  bandwidth: string;
  status: 'pending-config' | 'in-progress' | 'completed';
  timestamp: string;
}

export default function AWSIntegrationWidget() {
  const navigate = useNavigate();

  const connections: AWSConnection[] = [
    {
      id: 'aws-001',
      requestId: 'AWS-REQ-789012',
      connectionName: 'att-netbond-prod-001',
      region: 'us-east-1',
      bandwidth: '10 Gbps',
      status: 'pending-config',
      timestamp: new Date().toISOString()
    }
  ];

  const stats = {
    pending: connections.filter(c => c.status === 'pending-config').length,
    inProgress: connections.filter(c => c.status === 'in-progress').length,
    completed: connections.filter(c => c.status === 'completed').length,
  };

  const statusIcon = {
    'pending-config': <Clock className="w-3.5 h-3.5 text-fw-bodyLight" />,
    'in-progress': <AlertCircle className="w-3.5 h-3.5 text-fw-link" />,
    'completed': <CheckCircle2 className="w-3.5 h-3.5 text-fw-success" />,
  };

  const statusLabel = {
    'pending-config': 'Awaiting Config',
    'in-progress': 'Provisioning',
    'completed': 'Active',
  };

  return (
    <div className="space-y-4">
      {/* Stats — inline, no boxes */}
      <div className="flex items-center gap-4">
        <div>
          <span className="text-figma-base font-bold text-fw-heading tabular-nums">{stats.pending}</span>
          <span className="text-figma-xs text-fw-bodyLight ml-1">pending</span>
        </div>
        <div>
          <span className="text-figma-base font-bold text-fw-link tabular-nums">{stats.inProgress}</span>
          <span className="text-figma-xs text-fw-bodyLight ml-1">in progress</span>
        </div>
        <div>
          <span className="text-figma-base font-bold text-fw-success tabular-nums">{stats.completed}</span>
          <span className="text-figma-xs text-fw-bodyLight ml-1">completed</span>
        </div>
      </div>

      {/* Connections list */}
      {connections.length > 0 ? (
        <div className="divide-y divide-fw-secondary">
          {connections.slice(0, 3).map((connection) => (
            <div key={connection.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-figma-sm font-medium text-fw-heading truncate">
                  {connection.connectionName}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {statusIcon[connection.status]}
                  <span className="text-figma-xs text-fw-bodyLight">{statusLabel[connection.status]}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-figma-xs text-fw-bodyLight">
                <span className="font-mono">{connection.region}</span>
                <span>·</span>
                <span>{connection.bandwidth}</span>
              </div>
              {connection.status === 'pending-config' && (
                <button
                  onClick={() => navigate('/connections')}
                  className="mt-2 flex items-center gap-1 text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors"
                >
                  Configure now
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-4 text-center">
          <Cloud className="w-8 h-8 text-fw-bodyLight mx-auto mb-2" />
          <p className="text-figma-sm text-fw-bodyLight mb-3">No AWS connections</p>
          <a
            href="https://console.aws.amazon.com/directconnect"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors"
          >
            Open AWS Console
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {connections.length > 0 && (
        <div className="border-t border-fw-secondary pt-2">
          <button
            onClick={() => navigate('/connections')}
            className="flex items-center gap-1 text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors"
          >
            View all AWS connections
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
