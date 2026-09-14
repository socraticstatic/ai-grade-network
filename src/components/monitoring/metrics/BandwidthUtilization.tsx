import { useMemo } from 'react';
import { Card } from '../../common/Card';
import { LineChart } from '../../charts/LazyCharts';
import { ArrowUpDown, TrendingUp, Info, Zap } from 'lucide-react';
import { AttIcon } from '../../icons/AttIcon';
import { chartColors } from '../../../utils/chartColors';

interface BandwidthUtilizationProps {
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

export function BandwidthUtilization({ data, timeRange }: BandwidthUtilizationProps) {
  // Format data for charts
  const chartData = useMemo(() => {
    const labels = data.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    // Bandwidth direction simulation - upload/download split
    const uploadData = data.map(d => d.bandwidth * 0.35); // 35% upload
    const downloadData = data.map(d => d.bandwidth * 0.65); // 65% download

    // Create datasets for upload and download
    return {
      labels,
      datasets: [
        {
          label: 'Download (Mbps)',
          data: downloadData,
          borderColor: chartColors.success,
          backgroundColor: chartColors.successLight,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Upload (Mbps)',
          data: uploadData,
          borderColor: chartColors.purple,
          backgroundColor: chartColors.purpleLight,
          fill: true,
          tension: 0.4
        }
      ]
    };
  }, [data]);

  // Calculate usage statistics
  const usageStats = useMemo(() => {
    if (!data.length) return { avg: 0, peak: 0, peakTime: '', lowUsage: 0, highUsage: 0 };

    const bandwidthValues = data.map(d => d.bandwidth);
    const avg = bandwidthValues.reduce((sum, val) => sum + val, 0) / bandwidthValues.length;
    const peak = Math.max(...bandwidthValues);
    const peakIndex = bandwidthValues.indexOf(peak);
    const peakTime = new Date(data[peakIndex].timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Calculate low and high usage hours
    const lowUsageHours = data
      .map((d, i) => ({ value: d.bandwidth, index: i }))
      .sort((a, b) => a.value - b.value)
      .slice(0, 3)
      .map(item => {
        const date = new Date(data[item.index].timestamp);
        return date.getHours();
      });
      
    const highUsageHours = data
      .map((d, i) => ({ value: d.bandwidth, index: i }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(item => {
        const date = new Date(data[item.index].timestamp);
        return date.getHours();
      });
    
    const lowUsage = Math.min(...bandwidthValues);
    const highUsage = peak;
    
    return { avg, peak, peakTime, lowUsageHours, highUsageHours, lowUsage, highUsage };
  }, [data]);

  // Calculate threshold bands
  const thresholds = {
    warning: 80, // 80% utilization - warning threshold
    critical: 90 // 90% utilization - critical threshold
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-fw-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ArrowUpDown className="h-5 w-5 text-brand-blue mr-2" />
            <h3 className="text-lg font-medium tracking-[-0.03em]">Bandwidth Utilization Analysis</h3>
          </div>
          <div className="text-figma-base text-fw-bodyLight">
            Based on {data.length} data points over {timeRange}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 border-b border-fw-secondary">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AttIcon name="hub" className="h-6 w-6 text-fw-bodyLight mr-2" />
              <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em]">Bandwidth Usage Profile</h4>
            </div>
            <span className="bg-fw-accent text-fw-linkHover px-2 py-1 text-figma-sm font-medium rounded-full">
              {timeRange} time period
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-fw-wash rounded-lg p-4">
              <div className="text-figma-base text-fw-bodyLight mb-1">Average Usage</div>
              <div className="text-2xl font-semibold text-fw-heading">{usageStats.avg.toFixed(1)}%</div>
              <div className="mt-1 text-figma-sm text-fw-bodyLight">of contracted bandwidth</div>
            </div>

            <div className="bg-fw-wash rounded-lg p-4">
              <div className="text-figma-base text-fw-bodyLight mb-1">Peak Usage</div>
              <div className="text-2xl font-semibold text-fw-heading">{usageStats.peak.toFixed(1)}%</div>
              <div className="mt-1 text-figma-sm text-fw-bodyLight">at {usageStats.peakTime}</div>
            </div>
          </div>
          
          <div className="bg-fw-accent rounded-lg p-4">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-fw-link mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-figma-base font-medium text-fw-linkHover">Utilization Insights</h4>
                <p className="mt-1 text-figma-sm text-fw-link">
                  Bandwidth utilization shows typical business hour peaks, with the highest usage at {usageStats.peakTime}.
                  Consider load balancing during peak hours ({usageStats.highUsageHours.join(':00, ')}:00) or scheduling large data transfers during low usage hours ({usageStats.lowUsageHours.join(':00, ')}:00).
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em]">Cost Efficiency</h4>
            
            <div className="flex items-center">
              <div className={`px-2 py-1 rounded text-figma-sm font-medium ${
                usageStats.avg < 20 ? 'bg-fw-errorLight text-fw-error' :
                usageStats.avg < 40 ? 'bg-fw-wash text-fw-bodyLight' :
                usageStats.avg < 70 ? 'bg-fw-successLight text-fw-success' :
                'bg-fw-accent text-fw-linkHover'
              }`}>
                {usageStats.avg < 20 ? 'Underutilized' :
                usageStats.avg < 40 ? 'Moderately Used' :
                usageStats.avg < 70 ? 'Optimally Used' :
                'Heavily Used'}
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-figma-base mb-1">
                <span className="text-fw-bodyLight">Current Bandwidth</span>
                <span className="font-medium text-fw-heading">1 Gbps</span>
              </div>
              <div className="h-2.5 bg-fw-neutral rounded-full">
                <div className="h-2.5 rounded-full bg-brand-blue" style={{ width: '100%' }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-figma-base mb-1">
                <span className="text-fw-bodyLight">Peak Usage</span>
                <span className="font-medium text-fw-heading">{(10 * usageStats.peak / 100).toFixed(1)} Gbps</span>
              </div>
              <div className="h-2.5 bg-fw-neutral rounded-full">
                <div 
                  className={`h-2.5 rounded-full ${
                    usageStats.peak > thresholds.critical ? 'bg-fw-error' :
                    usageStats.peak > thresholds.warning ? 'bg-fw-wash0' :
                    'bg-fw-success'
                  }`} 
                  style={{ width: `${usageStats.peak}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-figma-base mb-1">
                <span className="text-fw-bodyLight">Average Usage</span>
                <span className="font-medium text-fw-heading">{(10 * usageStats.avg / 100).toFixed(1)} Gbps</span>
              </div>
              <div className="h-2.5 bg-fw-neutral rounded-full">
                <div 
                  className={`h-2.5 rounded-full ${
                    usageStats.avg > thresholds.critical ? 'bg-fw-error' :
                    usageStats.avg > thresholds.warning ? 'bg-fw-wash0' :
                    'bg-fw-success'
                  }`} 
                  style={{ width: `${usageStats.avg}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 rounded-lg p-4 border border-fw-secondary">
            <div className="flex items-center mb-2">
              <Zap className="h-4 w-4 text-brand-blue mr-2" />
              <h4 className="text-figma-base font-medium text-fw-heading tracking-[-0.03em]">Billing Efficiency</h4>
            </div>

            <p className="text-figma-base text-fw-bodyLight mb-2">
              {usageStats.avg < 40 ? 
                'Your bandwidth usage is lower than optimal. Consider downgrading to save costs.' :
                usageStats.avg > 80 ?
                'You are approaching your bandwidth limit. Consider upgrading to avoid performance issues.' :
                'Your bandwidth usage is in the optimal range for this connection size.'}
            </p>
            
            <div className="text-figma-sm text-fw-bodyLight">
              {usageStats.avg < 40 ? (
                <span className="text-fw-success">Potential monthly savings: $250 with a lower tier</span>
              ) : usageStats.avg > 80 ? (
                <span className="text-fw-bodyLight">Risk of over-limit charges if peak usage continues</span>
              ) : (
                <span className="text-brand-blue">Current plan provides optimal cost efficiency</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-6">
          <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em] mb-2">Bandwidth Usage Trend</h4>
          <p className="text-figma-base text-fw-bodyLight">
            This chart shows your download and upload bandwidth usage over time. The colored areas represent data flowing in each direction.
          </p>
        </div>
        
        <div className="h-80">
          <LineChart data={chartData} />
        </div>
        
        <div className="mt-6 p-4 bg-fw-wash rounded-lg border border-fw-secondary">
          <div className="flex items-start">
            <TrendingUp className="h-5 w-5 text-fw-bodyLight mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-figma-base text-fw-bodyLight">
              <p className="font-medium text-fw-heading mb-1">Bandwidth Observation</p>
              <p>
                Your average download/upload ratio is approximately 65/35, which is typical for enterprise networks. 
                The peak utilization periods align closely with business hours, suggesting regular usage patterns.
                {usageStats.peak > thresholds.warning && 
                  ' Consider implementing traffic shaping or examining bandwidth-intensive applications during peak periods.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}