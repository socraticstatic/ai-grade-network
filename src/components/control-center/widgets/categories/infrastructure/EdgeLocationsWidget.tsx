import { Globe, Activity, Signal } from 'lucide-react';

export function EdgeLocationsWidget() {
  const locations = [
    {
      region: 'North America',
      locations: [
        { name: 'US East', status: 'operational', latency: '4.2ms' },
        { name: 'US West', status: 'operational', latency: '4.5ms' }
      ]
    },
    {
      region: 'Europe',
      locations: [
        { name: 'EU West', status: 'operational', latency: '5.1ms' },
        { name: 'EU Central', status: 'operational', latency: '5.3ms' }
      ]
    },
    {
      region: 'Asia Pacific',
      locations: [
        { name: 'AP Southeast', status: 'operational', latency: '6.2ms' },
        { name: 'AP Northeast', status: 'operational', latency: '6.5ms' }
      ]
    }
  ];

  return (
    <div className="space-y-4">
      {locations.map((region) => (
        <div key={region.region} className="space-y-2">
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4 text-fw-bodyLight" />
            <h3 className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">{region.region}</h3>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {region.locations.map((location) => (
              <div
                key={location.name}
                className="flex items-center justify-between p-2 bg-fw-wash rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <Signal className="h-4 w-4 text-fw-success" />
                  <span className="text-figma-base text-fw-body">{location.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-figma-sm text-fw-bodyLight">{location.latency}</span>
                  <div className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-fw-success" />
                    <span className="ml-1 text-figma-sm text-fw-bodyLight">{location.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
