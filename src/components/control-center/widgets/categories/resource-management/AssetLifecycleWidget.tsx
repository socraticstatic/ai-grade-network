import { RefreshCw, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export function AssetLifecycleWidget() {
  const assets = [
    {
      name: 'Core Router A',
      type: 'Network',
      age: '2.5 years',
      nextMaintenance: '15 days',
      status: 'healthy',
      warranty: '1.5 years remaining'
    },
    {
      name: 'Storage Array B',
      type: 'Storage',
      age: '3.8 years',
      nextMaintenance: '5 days',
      status: 'warning',
      warranty: '6 months remaining'
    },
    {
      name: 'Load Balancer C',
      type: 'Network',
      age: '1.2 years',
      nextMaintenance: '45 days',
      status: 'healthy',
      warranty: '2.8 years remaining'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Asset List */}
      <div className="space-y-2">
        {assets.map((asset) => (
          <div
            key={asset.name}
            className={`p-3 rounded-lg border ${
              asset.status === 'warning' ? 'bg-fw-wash border-fw-secondary/30' : 'bg-fw-base border-fw-secondary'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                {asset.status === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-fw-bodyLight mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-fw-success mr-2" />
                )}
                <span className="text-figma-base font-medium text-fw-heading">{asset.name}</span>
              </div>
              <span className="text-figma-sm text-fw-bodyLight">{asset.type}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-figma-sm">
              <div className="flex items-center text-fw-bodyLight">
                <Clock className="h-3 w-3 mr-1" />
                <span>Age: {asset.age}</span>
              </div>
              <div className="flex items-center text-fw-bodyLight">
                <RefreshCw className="h-3 w-3 mr-1" />
                <span>Maintenance: {asset.nextMaintenance}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-fw-successLight rounded-lg">
          <div className="text-figma-sm text-fw-success mb-1">Healthy Assets</div>
          <div className="text-figma-lg font-semibold text-fw-success">85%</div>
        </div>
        <div className="p-3 bg-fw-wash rounded-lg">
          <div className="text-figma-sm text-fw-bodyLight mb-1">Needs Attention</div>
          <div className="text-figma-lg font-semibold text-fw-bodyLight">15%</div>
        </div>
      </div>
    </div>
  );
}
