import { FileText, User, Shield, Clock } from 'lucide-react';
import { Connection } from '../../../../../types';

interface SecurityAuditWidgetProps {
  connections: Connection[];
}

export function SecurityAuditWidget({ connections }: SecurityAuditWidgetProps) {
  const auditLogs = [
    {
      id: '1',
      action: 'Security policy updated',
      user: 'Sarah Patel',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      details: 'Updated firewall rules for AWS Interconnect – last mile'
    },
    {
      id: '2',
      action: 'Compliance check completed',
      user: 'System',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      details: 'All security controls verified'
    },
    {
      id: '3',
      action: 'Access permissions modified',
      user: 'John Smith',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      details: 'Updated role-based access controls'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FileText className="h-5 w-5 text-fw-bodyLight mr-2" />
          <span className="text-figma-base font-medium text-fw-heading">Security Audit Log</span>
        </div>
        <button className="text-figma-base text-fw-link hover:text-fw-linkHover">
          Export Log
        </button>
      </div>

      <div className="space-y-3">
        {auditLogs.map((log) => (
          <div key={log.id} className="p-3 bg-fw-wash rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-fw-bodyLight mr-2" />
                <span className="text-figma-base font-medium text-fw-heading">{log.action}</span>
              </div>
            </div>
            <p className="text-figma-base text-fw-body mb-2">{log.details}</p>
            <div className="flex items-center justify-between text-figma-sm text-fw-bodyLight">
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {log.user}
              </div>
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full px-4 py-2 text-figma-base text-fw-link hover:bg-fw-accent rounded-lg transition-colors">
        View Full Audit Log
      </button>
    </div>
  );
}
