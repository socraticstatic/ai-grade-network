import { Database, Server, Network, Cloud, HardDrive } from 'lucide-react';

export function ResourceInventoryWidget() {
  const resources = [
    {
      category: 'Network Devices',
      icon: Network,
      total: 248,
      active: 235,
      maintenance: 8,
      inactive: 5
    },
    {
      category: 'Servers',
      icon: Server,
      total: 156,
      active: 142,
      maintenance: 10,
      inactive: 4
    },
    {
      category: 'Storage',
      icon: HardDrive,
      total: 42,
      active: 38,
      maintenance: 2,
      inactive: 2
    },
    {
      category: 'Cloud Resources',
      icon: Cloud,
      total: 312,
      active: 298,
      maintenance: 12,
      inactive: 2
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {resources.map((resource) => (
          <div key={resource.category} className="bg-fw-base p-4 rounded-lg border border-fw-secondary">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <resource.icon className="h-5 w-5 text-fw-link mr-2" />
                <h3 className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{resource.category}</h3>
              </div>
              <span className="text-figma-lg font-semibold text-fw-heading">{resource.total}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-figma-base">
                <span className="text-fw-bodyLight">Active</span>
                <span className="text-fw-success">{resource.active}</span>
              </div>
              <div className="flex justify-between text-figma-base">
                <span className="text-fw-bodyLight">Maintenance</span>
                <span className="text-fw-bodyLight">{resource.maintenance}</span>
              </div>
              <div className="flex justify-between text-figma-base">
                <span className="text-fw-bodyLight">Inactive</span>
                <span className="text-fw-body">{resource.inactive}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-fw-accent rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="h-5 w-5 text-fw-link mr-2" />
            <span className="text-figma-base font-medium text-fw-linkHover">Resource Health</span>
          </div>
          <span className="text-figma-base text-fw-link">94.8% Healthy</span>
        </div>
      </div>
    </div>
  );
}
