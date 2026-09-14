import { useMemo } from 'react';
import { Card } from '../../common/Card';
import { LineChart } from '../charts/LineChart';
import { Signal, AlertTriangle, Info, Wifi } from 'lucide-react';
import { chartColors } from '../../../utils/chartColors';

interface PacketLossAnalysisProps {
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

export function PacketLossAnalysis({ data, timeRange }: PacketLossAnalysisProps) {
  // Format data for chart
  const chartData = useMemo(() => {
    const labels = data.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    return {
      labels,
      datasets: [
        {
          label: 'Packet Loss (%)',
          data: data.map(d => d.packetLoss * 100), // Convert to percentage
          borderColor: chartColors.warn,
          backgroundColor: chartColors.warnLight,
          fill: true,
          tension: 0.4
        }
      ]
    };
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data.length) return { avg: 0, max: 0, spikes: 0, critical: 0 };

    const packetLossValues = data.map(d => d.packetLoss * 100); // Convert to percentage
    const avg = packetLossValues.reduce((sum, val) => sum + val, 0) / packetLossValues.length;
    const max = Math.max(...packetLossValues);
    
    // Count number of spikes (values over 0.1%)
    const spikes = packetLossValues.filter(val => val > 0.1).length;
    
    // Count critical incidents (values over 1%)
    const critical = packetLossValues.filter(val => val > 1).length;
    
    return { avg, max, spikes, critical };
  }, [data]);

  // Network quality rating
  const getNetworkQualityRating = () => {
    if (stats.avg < 0.01) return { label: 'Excellent', color: 'text-fw-success', bgColor: 'bg-fw-successLight' };
    if (stats.avg < 0.05) return { label: 'Very Good', color: 'text-fw-link', bgColor: 'bg-fw-accent' };
    if (stats.avg < 0.1) return { label: 'Good', color: 'text-fw-link', bgColor: 'bg-fw-accent' };
    if (stats.avg < 0.5) return { label: 'Fair', color: 'text-fw-bodyLight', bgColor: 'bg-fw-wash' };
    return { label: 'Poor', color: 'text-fw-error', bgColor: 'bg-fw-errorLight' };
  };

  const networkQuality = getNetworkQualityRating();

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-fw-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Signal className="h-5 w-5 text-fw-bodyLight mr-2" />
            <h3 className="text-lg font-medium tracking-[-0.03em]">Packet Loss Analysis</h3>
          </div>
          <div className="flex items-center">
            <div className={`px-3 py-1 rounded-full text-figma-base font-medium ${networkQuality.bgColor} ${networkQuality.color}`}>
              {networkQuality.label}
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 border-b border-fw-secondary">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Wifi className="h-5 w-5 text-fw-bodyLight mr-2" />
              <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em]">Network Quality Indicators</h4>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-fw-wash rounded-lg p-4">
              <div className="text-figma-base text-fw-bodyLight mb-1">Average Loss</div>
              <div className="text-2xl font-semibold text-fw-heading">{stats.avg.toFixed(4)}%</div>
              <div className="mt-1 text-figma-sm text-fw-bodyLight">
                {stats.avg < 0.01 ? 'Excellent quality' : 
                 stats.avg < 0.1 ? 'Good quality' : 
                 stats.avg < 0.5 ? 'Acceptable quality' : 
                 'Poor quality'}
              </div>
            </div>
            
            <div className="bg-fw-wash rounded-lg p-4">
              <div className="text-figma-base text-fw-bodyLight mb-1">Maximum Loss</div>
              <div className="text-2xl font-semibold text-fw-heading">{stats.max.toFixed(4)}%</div>
              <div className="mt-1 text-figma-sm text-fw-bodyLight">
                Maximum recorded packet loss
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-fw-wash rounded-lg p-4">
              <div className="text-figma-base text-fw-bodyLight mb-1">Loss Events</div>
              <div className="text-2xl font-semibold text-fw-heading">{stats.spikes}</div>
              <div className="mt-1 text-figma-sm text-fw-bodyLight">
                Events with &gt;0.1% packet loss
              </div>
            </div>
            
            <div className="bg-fw-wash rounded-lg p-4">
              <div className="text-figma-base text-fw-bodyLight mb-1">Critical Events</div>
              <div className="text-2xl font-semibold text-fw-heading">{stats.critical}</div>
              <div className="mt-1 text-figma-sm text-fw-bodyLight">
                Events with &gt;1% packet loss
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em]">Quality Assessment</h4>
          </div>
          
          {stats.avg < 0.1 ? (
            <div className="bg-fw-successLight rounded-lg p-4 border border-fw-success">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-fw-successLight">
                    <Info className="h-5 w-5 text-fw-success" />
                  </div>
                </div>
                <div className="ml-3">
                  <h5 className="text-figma-base font-medium text-fw-success">Healthy Connection</h5>
                  <p className="mt-1 text-figma-base text-fw-success">
                    Your packet loss metrics indicate a healthy, stable connection. Current levels are well within acceptable ranges for voice, video, and data applications.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-fw-wash rounded-lg p-4 border border-fw-secondary">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-fw-wash">
                    <AlertTriangle className="h-5 w-5 text-fw-bodyLight" />
                  </div>
                </div>
                <div className="ml-3">
                  <h5 className="text-figma-base font-medium text-fw-bodyLight">Moderate Packet Loss Detected</h5>
                  <p className="mt-1 text-figma-base text-fw-bodyLight">
                    Your connection is experiencing some packet loss. While not critical, this may affect real-time applications like voice and video calls. Consider investigating network congestion or interference issues.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-fw-wash rounded-lg p-4">
            <h5 className="text-figma-base font-medium text-fw-heading mb-2">Application Impact</h5>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-figma-base mb-1">
                  <span className="text-fw-bodyLight">Voice Calls</span>
                  <span className="font-medium text-fw-heading">{stats.avg < 0.5 ? 'Excellent' : stats.avg < 1 ? 'Good' : 'Poor'}</span>
                </div>
                <div className="h-1.5 bg-fw-neutral rounded-full">
                  <div
                    className={`h-1.5 rounded-full ${
                      stats.avg < 0.5 ? 'bg-fw-success' : stats.avg < 1 ? 'bg-fw-wash0' : 'bg-fw-error'
                    }`}
                    style={{ width: `${100 - stats.avg * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-figma-base mb-1">
                  <span className="text-fw-bodyLight">Video Conferencing</span>
                  <span className="font-medium text-fw-heading">{stats.avg < 0.3 ? 'Excellent' : stats.avg < 0.8 ? 'Good' : 'Poor'}</span>
                </div>
                <div className="h-1.5 bg-fw-neutral rounded-full">
                  <div
                    className={`h-1.5 rounded-full ${
                      stats.avg < 0.3 ? 'bg-fw-success' : stats.avg < 0.8 ? 'bg-fw-wash0' : 'bg-fw-error'
                    }`}
                    style={{ width: `${100 - stats.avg * 120}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-figma-base mb-1">
                  <span className="text-fw-bodyLight">Cloud Applications</span>
                  <span className="font-medium text-fw-heading">{stats.avg < 1 ? 'Excellent' : stats.avg < 2 ? 'Good' : 'Poor'}</span>
                </div>
                <div className="h-1.5 bg-fw-neutral rounded-full">
                  <div
                    className={`h-1.5 rounded-full ${
                      stats.avg < 1 ? 'bg-fw-success' : stats.avg < 2 ? 'bg-fw-wash0' : 'bg-fw-error'
                    }`}
                    style={{ width: `${100 - stats.avg * 50}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-4">
          <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em] mb-2">Packet Loss Trend</h4>
          <p className="text-figma-base text-fw-bodyLight">
            This chart shows your packet loss percentage over time. Lower values indicate better network quality and reliability.
          </p>
        </div>
        
        <div className="h-80">
          <LineChart data={chartData} />
        </div>
      </div>
    </Card>
  );
}

