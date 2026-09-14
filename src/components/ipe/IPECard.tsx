import { Server, MapPin, Activity, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { IPE } from '../../types/ipe';
import { Card } from '../common/Card';

interface IPECardProps {
  ipe: IPE;
  onClick?: () => void;
}

export function IPECard({ ipe, onClick }: IPECardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-fw-success bg-fw-successLight';
      case 'maintenance':
        return 'text-fw-warn bg-fw-warnLight';
      case 'degraded':
        return 'text-fw-warn bg-fw-warnLight';
      case 'offline':
        return 'text-fw-error bg-fw-error/15';
      default:
        return 'text-fw-bodyLight bg-fw-wash';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4" />;
      case 'offline':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-fw-error';
    if (utilization >= 75) return 'text-fw-warn';
    if (utilization >= 60) return 'text-fw-warn';
    return 'text-fw-success';
  };

  const getUtilizationBgColor = (utilization: number) => {
    if (utilization >= 90) return 'bg-fw-error';
    if (utilization >= 75) return 'bg-fw-warn';
    if (utilization >= 60) return 'bg-fw-warn';
    return 'bg-fw-success';
  };

  const getTrendIcon = () => {
    if (!ipe.utilizationTrend || ipe.utilizationTrend.length < 2) return <Minus className="h-3 w-3" />;

    const recent = ipe.utilizationTrend.slice(-3);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const older = ipe.utilizationTrend.slice(-6, -3);
    const oldAvg = older.reduce((a, b) => a + b, 0) / older.length;

    if (avg > oldAvg + 5) return <TrendingUp className="h-3 w-3 text-fw-error" />;
    if (avg < oldAvg - 5) return <TrendingDown className="h-3 w-3 text-fw-success" />;
    return <Minus className="h-3 w-3 text-fw-bodyLight" />;
  };

  return (
    <Card
      onClick={onClick}
      className="hover:shadow-lg transition-all duration-200 cursor-pointer"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-fw-accent rounded-lg">
              <Server className="h-5 w-5 text-fw-link" />
            </div>
            <div>
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">{ipe.name}</h3>
              <div className="flex items-center text-figma-base text-fw-bodyLight mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                {ipe.location}
              </div>
            </div>
          </div>
          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-figma-sm font-medium ${getStatusColor(ipe.status)}`}>
            {getStatusIcon(ipe.status)}
            <span className="ml-1 capitalize">{ipe.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-figma-sm text-fw-bodyLight mb-1">Region</div>
            <div className="text-figma-base font-medium text-fw-heading">{ipe.region}</div>
          </div>
          <div>
            <div className="text-figma-sm text-fw-bodyLight mb-1">Data Center</div>
            <div className="text-figma-base font-medium text-fw-heading">{ipe.dataCenterProvider}</div>
          </div>
        </div>

        <div className="border-t border-fw-secondary pt-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-figma-base font-medium text-fw-body">Utilization</span>
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-lg font-bold ${getUtilizationColor(ipe.utilization)}`}>
                {ipe.utilization}%
              </span>
            </div>
          </div>
          <div className="w-full bg-fw-neutral rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${getUtilizationBgColor(ipe.utilization)}`}
              style={{ width: `${ipe.utilization}%` }}
            />
          </div>
          <div className="flex justify-between text-figma-sm text-fw-bodyLight mt-1">
            <span>{ipe.availableCapacity} available</span>
            <span>{ipe.installedCapacity} total</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center border-t border-fw-secondary pt-4">
          <div>
            <div className="text-figma-sm text-fw-bodyLight mb-1">Connections</div>
            <div className="text-lg font-semibold text-fw-heading">{ipe.totalConnections}</div>
          </div>
          <div>
            <div className="text-figma-sm text-fw-bodyLight mb-1">Links</div>
            <div className="text-lg font-semibold text-fw-heading">{ipe.totalLinks}</div>
          </div>
          <div>
            <div className="text-figma-sm text-fw-bodyLight mb-1">VNFs</div>
            <div className="text-lg font-semibold text-fw-heading">{ipe.totalVNFs}</div>
          </div>
        </div>

        {ipe.cloudOnRamps && ipe.cloudOnRamps.length > 0 && (
          <div className="border-t border-fw-secondary pt-4 mt-4">
            <div className="text-figma-sm text-fw-bodyLight mb-2">Cloud On-Ramps</div>
            <div className="flex flex-wrap gap-1.5">
              {ipe.cloudOnRamps.filter(onRamp => onRamp.available).map((onRamp) => (
                <span
                  key={onRamp.provider}
                  className="inline-flex items-center px-2 py-1 rounded text-figma-sm font-medium bg-fw-accent text-fw-link"
                >
                  {onRamp.provider}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
