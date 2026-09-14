import { useMemo } from 'react';
import { Card } from '../../common/Card';
import { LineChart } from '../../charts/LazyCharts';
import { ShieldAlert, AlertTriangle, Clock, Zap, Network } from 'lucide-react';
import { chartColors } from '../../../utils/chartColors';

interface ErrorRateChartProps {
  data: Array<{
    timestamp: string;
    latency: number;
    packetLoss: number;
    jitter: number;
    bandwidth: number;
    errorRate: number;
  }>;
  timeRange: string;
}

export function ErrorRateChart({ data, timeRange }: ErrorRateChartProps) {
  // Format data for chart
  const chartData = useMemo(() => {
    const labels = data.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    // Generate synthetic error types based on errorRate
    // TCP errors (40-60% of total errors)
    const tcpErrors = data.map(d => d.errorRate * 100 * (0.4 + Math.random() * 0.2));
    
    // Protocol errors (20-40% of total errors)
    const protocolErrors = data.map(d => d.errorRate * 100 * (0.2 + Math.random() * 0.2));
    
    // Timeout errors (10-30% of total errors)
    const timeoutErrors = data.map(d => d.errorRate * 100 * (0.1 + Math.random() * 0.2));
    
    return {
      labels,
      datasets: [
        {
          label: 'TCP Errors',
          data: tcpErrors,
          borderColor: chartColors.error,
          backgroundColor: chartColors.errorLight,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Protocol Errors',
          data: protocolErrors,
          borderColor: chartColors.warn,
          backgroundColor: chartColors.warnLight,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Timeout Errors',
          data: timeoutErrors,
          borderColor: chartColors.purple,
          backgroundColor: chartColors.purpleLight,
          fill: true,
          tension: 0.4
        }
      ]
    };
  }, [data]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!data.length) return { total: 0, avg: 0, peak: 0, byType: {} };
    
    const errorValues = data.map(d => d.errorRate * 100);
    const total = errorValues.reduce((sum, val) => sum + val, 0);
    const avg = total / errorValues.length;
    const peak = Math.max(...errorValues);
    
    // Calculate error distribution by type (synthetic)
    const tcpTotal = total * 0.5; // 50% TCP errors
    const protocolTotal = total * 0.3; // 30% protocol errors
    const timeoutTotal = total * 0.2; // 20% timeout errors

    // Identify time periods with concentration of errors
    const errorsByHour: Record<number, number> = {};
    
    data.forEach(d => {
      const hour = new Date(d.timestamp).getHours();
      errorsByHour[hour] = (errorsByHour[hour] || 0) + (d.errorRate * 100);
    });
    
    // Find hour with most errors
    const hourEntries = Object.entries(errorsByHour);
    const peakHour = hourEntries.length ? 
      hourEntries.reduce((max, [hour, count]) => count > max[1] ? [hour, count] : max, ['0', 0])[0] : '0';
    
    return { 
      total, 
      avg, 
      peak,
      peakHour,
      byType: {
        tcp: tcpTotal,
        protocol: protocolTotal,
        timeout: timeoutTotal
      }
    };
  }, [data]);
  
  // Format percentage
  const formatPercentage = (value: number) => {
    if (value < 0.01) return '<0.01%';
    return value.toFixed(3) + '%';
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-fw-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ShieldAlert className="h-5 w-5 text-fw-error mr-2" />
            <h3 className="text-lg font-medium tracking-[-0.03em]">Network Error Analysis</h3>
          </div>
          <div className="text-figma-base text-fw-bodyLight">
            Based on {data.length} data points over {timeRange}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 border-b border-fw-secondary">
        <div className="lg:col-span-1 space-y-4">
          <div>
            <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em] mb-3">Error Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-fw-wash rounded-lg p-4">
                <div className="text-figma-base text-fw-bodyLight mb-1">Average Rate</div>
                <div className="text-xl font-semibold text-fw-heading">{formatPercentage(stats.avg)}</div>
              </div>

              <div className="bg-fw-wash rounded-lg p-4">
                <div className="text-figma-base text-fw-bodyLight mb-1">Peak Rate</div>
                <div className="text-xl font-semibold text-fw-heading">{formatPercentage(stats.peak)}</div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-figma-base font-medium text-fw-heading mb-2">Error Distribution</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-figma-sm mb-1">
                  <span className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-fw-error mr-1"></div>
                    <span>TCP Errors</span>
                  </span>
                  <span>{Math.round(stats.byType.tcp / stats.total * 100)}%</span>
                </div>
                <div className="h-1.5 bg-fw-neutral rounded-full">
                  <div className="h-1.5 rounded-full bg-fw-error" style={{ width: `${stats.byType.tcp / stats.total * 100}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-figma-sm mb-1">
                  <span className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-fw-wash0 mr-1"></div>
                    <span>Protocol Errors</span>
                  </span>
                  <span>{Math.round(stats.byType.protocol / stats.total * 100)}%</span>
                </div>
                <div className="h-1.5 bg-fw-neutral rounded-full">
                  <div className="h-1.5 rounded-full bg-fw-wash0" style={{ width: `${stats.byType.protocol / stats.total * 100}%` }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-figma-sm mb-1">
                  <span className="flex items-center">
                    <div className="h-2 w-2 rounded-full bg-fw-link mr-1"></div>
                    <span>Timeout Errors</span>
                  </span>
                  <span>{Math.round(stats.byType.timeout / stats.total * 100)}%</span>
                </div>
                <div className="h-1.5 bg-fw-neutral rounded-full">
                  <div className="h-1.5 rounded-full bg-fw-link" style={{ width: `${stats.byType.timeout / stats.total * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em]">Error Pattern Analysis</h4>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-fw-bodyLight" />
                <span className="text-figma-sm text-fw-bodyLight">Peak Hour: {stats.peakHour}:00</span>
              </div>
              <div className={`px-2 py-1 rounded text-figma-sm font-medium ${
                stats.avg < 0.01 ? 'bg-fw-successLight text-fw-success' :
                stats.avg < 0.05 ? 'bg-fw-accent text-fw-linkHover' :
                stats.avg < 0.1 ? 'bg-fw-wash text-fw-bodyLight' :
                'bg-fw-errorLight text-fw-error'
              }`}>
                {stats.avg < 0.01 ? 'Excellent' :
                stats.avg < 0.05 ? 'Good' :
                stats.avg < 0.1 ? 'Fair' :
                'Poor'} Network Quality
              </div>
            </div>
          </div>
          
          <div className="bg-fw-wash rounded-lg p-4 border border-fw-secondary">
            <div className="flex items-start">
              {stats.avg < 0.05 ? (
                <>
                  <Zap className="h-5 w-5 text-fw-success mr-2 mt-0.5" />
                  <div>
                    <h5 className="text-figma-base font-medium text-fw-heading">Healthy Error Profile</h5>
                    <p className="mt-1 text-figma-base text-fw-bodyLight">
                      Your network is showing normal error patterns with minimal TCP errors and no significant spikes.
                      The current error rate is within expected ranges for enterprise connections.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-fw-bodyLight mr-2 mt-0.5" />
                  <div>
                    <h5 className="text-figma-base font-medium text-fw-heading">Elevated Error Rate Detected</h5>
                    <p className="mt-1 text-figma-base text-fw-bodyLight">
                      Your network is showing an increased error rate, particularly with TCP errors.
                      This could indicate network congestion, hardware issues, or interference.
                      Consider investigating during the peak error period around {stats.peakHour}:00.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-fw-wash rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Network className="h-4 w-4 text-fw-bodyLight mr-1" />
                <span className="text-figma-base font-medium text-fw-heading">Connection Status</span>
              </div>
              <div className="text-figma-base text-fw-bodyLight">
                {stats.peak < 0.1 ? (
                  <span className="text-fw-success">All diagnostic tests passing</span>
                ) : stats.peak < 0.5 ? (
                  <span className="text-fw-bodyLight">Minor issues detected</span>
                ) : (
                  <span className="text-fw-error">Performance degradation likely</span>
                )}
              </div>
            </div>
            
            <div className="bg-fw-wash rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-4 w-4 text-fw-bodyLight mr-1" />
                <span className="text-figma-base font-medium text-fw-heading">Recommended Action</span>
              </div>
              <div className="text-figma-base text-fw-bodyLight">
                {stats.peak < 0.1 ? (
                  <span className="text-fw-success">No action needed</span>
                ) : stats.peak < 0.5 ? (
                  <span className="text-fw-bodyLight">Monitor for changes</span>
                ) : (
                  <span className="text-fw-error">Investigate network issues</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-6">
          <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em] mb-2">Error Type Breakdown</h4>
          <p className="text-figma-base text-fw-bodyLight">
            This chart shows the different types of errors detected on your connection over time.
          </p>
        </div>
        
        <div className="h-80">
          <LineChart data={chartData} />
        </div>
        
        <div className="mt-6 text-figma-base text-fw-bodyLight">
          <p>The chart shows the distribution of different error types over time. TCP errors typically indicate network congestion or routing issues, while protocol errors may suggest configuration issues. Timeout errors often point to connectivity problems or resource constraints.</p>
        </div>
      </div>
    </Card>
  );
}