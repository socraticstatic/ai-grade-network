import { Shield, Check, Clock, AlertTriangle } from 'lucide-react';
import { Connection } from '../../../../../types';

interface ComplianceStatusWidgetProps {
  connections: Connection[];
}

export function ComplianceStatusWidget({ connections }: ComplianceStatusWidgetProps) {
  const complianceFrameworks = [
    {
      name: 'SOC 2',
      status: 'compliant',
      lastAudit: '2024-02-15',
      nextAudit: '2024-08-15',
      score: 100
    },
    {
      name: 'HIPAA',
      status: 'compliant',
      lastAudit: '2024-01-20',
      nextAudit: '2024-07-20',
      score: 98
    },
    {
      name: 'PCI DSS',
      status: 'review',
      lastAudit: '2024-03-01',
      nextAudit: '2024-09-01',
      score: 92
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-fw-success mr-2" />
          <span className="text-figma-base font-medium text-fw-heading">Compliance Status</span>
        </div>
      </div>

      <div className="space-y-3">
        {complianceFrameworks.map((framework) => (
          <div key={framework.name} className="p-3 bg-fw-wash rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-figma-base font-medium text-fw-heading">{framework.name}</span>
              <span className={`px-2 py-1 text-figma-sm font-medium rounded-full ${
                framework.status === 'compliant'
                  ? 'bg-fw-successLight text-fw-success'
                  : 'bg-fw-wash text-fw-bodyLight'
              }`}>
                {framework.status === 'compliant' ? (
                  <Check className="h-3 w-3 inline mr-1" />
                ) : (
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                )}
                {framework.status.charAt(0).toUpperCase() + framework.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center justify-between text-figma-sm text-fw-bodyLight">
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Next audit: {framework.nextAudit}
              </div>
              <span className="font-medium text-fw-body">{framework.score}%</span>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full px-4 py-2 text-figma-base text-fw-link hover:bg-fw-accent rounded-lg transition-colors">
        View Compliance Reports
      </button>
    </div>
  );
}
