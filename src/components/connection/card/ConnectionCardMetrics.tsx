import { BarChart3, ArrowLeftRight } from 'lucide-react';
import { Connection } from '../../../types';
import { isC2C, getConnectionLegs } from '../../../utils/connectionLegs';

interface ConnectionCardMetricsProps {
  connection: Connection;
  billingInfo: {
    type: string;
    cost: number | undefined;
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
  };
  performance?: {
    bandwidthUtilization: number;
  };
}

export function ConnectionCardMetrics({
  connection,
  billingInfo,
  performance
}: ConnectionCardMetricsProps) {
  // Cloud to Cloud: show each cloud leg (provider, location, per-leg bandwidth) so the
  // card makes the two linked legs explicit instead of a single provider/location.
  if (isC2C(connection)) {
    const legs = getConnectionLegs(connection);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-lightBlue text-fw-link">C2C</span>
          <span className="text-figma-xs text-fw-bodyLight">Legs linked through one Hub</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {legs.map((leg, i) => (
            <div key={`${leg.provider}-${i}`} className="p-4 bg-fw-wash rounded-lg">
              <div className="min-w-0 flex-1">
                <span className="text-figma-base font-medium text-fw-heading block">{leg.provider}</span>
                <p className="text-figma-sm text-fw-bodyLight truncate">{leg.location || '—'}</p>
                <p className="text-figma-sm font-medium text-fw-heading tabular-nums">{leg.bandwidth}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isAws = connection.provider === 'AWS';
  const locations = connection.locations || (connection.location ? [connection.location] : []);
  // Every AWS connection in this product is Max → display San Jose - SJ
  const primaryLocation = isAws ? 'San Jose - SJ' : (locations[0] || 'Not configured');

  // Derive region from location
  const getRegion = (location: string) => {
    if (location.includes('New York') || location.includes('Ashburn') || location.includes('Boston')) return 'US East';
    if (location.includes('San Jose') || location.includes('Los Angeles') || location.includes('Seattle')) return 'US West';
    if (location.includes('Chicago') || location.includes('Dallas')) return 'US Central';
    if (location.includes('London') || location.includes('Frankfurt') || location.includes('Paris')) return 'Europe';
    if (location.includes('Tokyo') || location.includes('Singapore') || location.includes('Sydney')) return 'Asia Pacific';
    return 'Global';
  };

  const region = getRegion(primaryLocation);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Bandwidth */}
      <div className="flex items-start space-x-3 p-4 bg-fw-wash rounded-lg">
        <BarChart3 className="h-4 w-4 text-fw-bodyLight mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <span className="text-figma-base font-medium text-fw-body block">Bandwidth</span>
          <p className="text-figma-lg font-medium text-fw-heading">{connection.bandwidth}</p>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-start space-x-3 p-4 bg-fw-wash rounded-lg">
        <ArrowLeftRight className="h-4 w-4 text-fw-bodyLight mt-0.5 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <span className="text-figma-base font-medium text-fw-body block">{region}</span>
          <p className="text-figma-base font-medium text-fw-heading truncate">{primaryLocation}</p>
        </div>
      </div>
    </div>
  );
}
