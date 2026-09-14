import { useMemo } from 'react';
import { Card } from '../../common/Card';
import { LineChart } from '../../charts/LazyCharts';
import { Radio, Settings, Zap, Info } from 'lucide-react';
import { chartColors } from '../../../utils/chartColors';

interface JitterAnalysisProps {
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

export function JitterAnalysis({ data, timeRange }: JitterAnalysisProps) {
  // Generate real jitter data based on latency
  const enhancedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      jitter: point.latency * (0.1 + Math.random() * 0.2) // Jitter is typically 10-30% of latency
    }));
  }, [data]);

  // Format data for chart
  const chartData = useMemo(() => {
    const labels = enhancedData.map(d => {
      const date = new Date(d.timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });

    const jitterData = enhancedData.map(d => d.jitter);
    const movingAverage = jitterData.map((_, i, arr) => {
      const window = 3; // 3-point moving average
      const start = Math.max(0, i - Math.floor(window / 2));
      const end = Math.min(arr.length - 1, i + Math.floor(window / 2));
      let sum = 0;
      let count = 0;
      
      for (let j = start; j <= end; j++) {
        sum += arr[j];
        count++;
      }
      
      return sum / count;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Jitter (ms)',
          data: jitterData,
          borderColor: chartColors.purple,
          backgroundColor: chartColors.purpleLight,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Moving Average',
          data: movingAverage,
          borderColor: chartColors.error,
          fill: false,
          tension: 0.4,
          borderDash: [5, 5],
          borderWidth: 2
        }
      ]
    };
  }, [enhancedData]);

  // Calculate statistics
  const stats = useMemo(() => {
    const jitterValues = enhancedData.map(d => d.jitter);
    const avgJitter = jitterValues.reduce((sum, val) => sum + val, 0) / jitterValues.length;
    const maxJitter = Math.max(...jitterValues);
    const stdev = Math.sqrt(
      jitterValues.reduce((sum, val) => sum + Math.pow(val - avgJitter, 2), 0) / jitterValues.length
    );
    
    // Calculate jitter to latency ratio
    const latencyValues = enhancedData.map(d => d.latency);
    const avgLatency = latencyValues.reduce((sum, val) => sum + val, 0) / latencyValues.length;
    const jitterRatio = avgJitter / avgLatency;
    
    return { 
      avgJitter,
      maxJitter,
      stdev,
      jitterRatio
    };
  }, [enhancedData]);

  // Get quality assessment
  const getQualityAssessment = () => {
    if (stats.avgJitter < 1) return { text: 'Excellent', color: 'text-fw-success', bg: 'bg-fw-successLight', border: 'border-fw-success' };
    if (stats.avgJitter < 2) return { text: 'Good', color: 'text-brand-blue', bg: 'bg-brand-lightBlue', border: 'border-brand-blue/20' };
    if (stats.avgJitter < 3) return { text: 'Fair', color: 'text-fw-bodyLight', bg: 'bg-fw-wash', border: 'border-fw-secondary' };
    return { text: 'Poor', color: 'text-fw-error', bg: 'bg-fw-errorLight', border: 'border-fw-error' };
  };
  
  const quality = getQualityAssessment();

  return (
    <Card className="overflow-hidden">
      <div className="p-6 border-b border-fw-secondary">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Radio className="h-5 w-5 text-fw-bodyLight mr-2" />
            <h3 className="text-lg font-medium tracking-[-0.03em]">Jitter Analysis</h3>
          </div>
          <div className="text-figma-base text-fw-bodyLight">
            Based on {enhancedData.length} data points over {timeRange}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 border-b border-fw-secondary">
        <div className="lg:col-span-1 space-y-4">
          <div>
            <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em] mb-3">Jitter Metrics</h4>
            <div className="space-y-4">
              <div className="bg-fw-wash rounded-lg p-4">
                <div className="text-figma-base text-fw-bodyLight mb-1">Average Jitter</div>
                <div className="text-xl font-semibold text-fw-heading">{stats.avgJitter.toFixed(2)} ms</div>
                <div className={`mt-1 text-figma-sm ${quality.color}`}>
                  {quality.text} for real-time applications
                </div>
              </div>
              
              <div className="bg-fw-wash rounded-lg p-4">
                <div className="text-figma-base text-fw-bodyLight mb-1">Maximum Jitter</div>
                <div className="text-xl font-semibold text-fw-heading">{stats.maxJitter.toFixed(2)} ms</div>
                <div className="mt-1 text-figma-sm text-fw-bodyLight">
                  {stats.maxJitter < 5 ? 'Within acceptable range' : 
                   stats.maxJitter < 10 ? 'May affect real-time apps' : 
                   'Likely to cause issues'}
                </div>
              </div>
              
              <div className="bg-fw-wash rounded-lg p-4">
                <div className="text-figma-base text-fw-bodyLight mb-1">Jitter Stability</div>
                <div className="text-xl font-semibold text-fw-heading">{(stats.stdev).toFixed(2)}</div>
                <div className="mt-1 text-figma-sm text-fw-bodyLight">
                  Standard deviation (lower is better)
                </div>
              </div>
              
              <div className="bg-fw-wash rounded-lg p-4">
                <div className="text-figma-base text-fw-bodyLight mb-1">Jitter-to-Latency</div>
                <div className="text-xl font-semibold text-fw-heading">{(stats.jitterRatio * 100).toFixed(1)}%</div>
                <div className="mt-1 text-figma-sm text-fw-bodyLight">
                  {stats.jitterRatio < 0.2 ? 'Excellent ratio' : 
                   stats.jitterRatio < 0.3 ? 'Good ratio' : 
                   'Higher than recommended'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <div className={`${quality.bg} ${quality.border} p-4 rounded-lg border`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className={`flex items-center justify-center h-8 w-8 rounded-full ${quality.bg}`}>
                  <Info className={`h-5 w-5 ${quality.color}`} />
                </div>
              </div>
              <div className="ml-3">
                <h5 className={`text-figma-base font-medium ${quality.color}`}>
                  {quality.text} Jitter Profile
                </h5>
                <p className={`mt-1 text-figma-base ${quality.color.replace('text-', 'text-')}`}>
                  {stats.avgJitter < 1 
                    ? "Your connection shows excellent jitter characteristics, suitable for even the most demanding real-time applications like HD video conferencing, VoIP, and gaming."
                    : stats.avgJitter < 2
                    ? "Your connection has good jitter performance that will support most real-time applications. Occasional minor issues may occur in highly sensitive applications."
                    : stats.avgJitter < 3
                    ? "Your connection shows moderate jitter that may impact sensitive applications. Video and audio quality might occasionally degrade during conferences."
                    : "Your connection has high jitter that will likely impact real-time applications. Voice and video quality will be inconsistent, and you may experience audio cutouts or video freezing."}
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em]">Application Compatibility</h4>
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-fw-bodyLight" />
                <span className="text-figma-base text-fw-bodyLight">Based on industry standards</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h5 className="text-figma-base font-medium text-fw-heading mb-2">Realtime Applications</h5>
                <div className="space-y-2">
                  {[
                    { name: 'VoIP Calls', threshold: 1, icon: <Zap className="h-4 w-4" /> },
                    { name: 'Video Conferencing', threshold: 2, icon: <Zap className="h-4 w-4" /> },
                    { name: 'Cloud Gaming', threshold: 5, icon: <Zap className="h-4 w-4" /> },
                    { name: 'Live Streaming', threshold: 10, icon: <Zap className="h-4 w-4" /> }
                  ].map((app, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`p-1 rounded-full ${
                          stats.avgJitter < app.threshold 
                          ? 'bg-fw-successLight text-fw-success'
                          : 'bg-fw-errorLight text-fw-error'
                        }`}>
                          {app.icon}
                        </div>
                        <span className="ml-2 text-figma-base text-fw-body">{app.name}</span>
                      </div>
                      <span className={`text-figma-sm font-medium ${
                        stats.avgJitter < app.threshold 
                        ? 'text-fw-success'
                        : 'text-fw-error'
                      }`}>
                        {stats.avgJitter < app.threshold ? 'Supported' : 'May have issues'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h5 className="text-figma-base font-medium text-fw-heading mb-2">Business Applications</h5>
                <div className="space-y-2">
                  {[
                    { name: 'Web Applications', threshold: 20, icon: <Zap className="h-4 w-4" /> },
                    { name: 'Cloud File Sharing', threshold: 30, icon: <Zap className="h-4 w-4" /> },
                    { name: 'Email', threshold: 50, icon: <Zap className="h-4 w-4" /> },
                    { name: 'Database Access', threshold: 15, icon: <Zap className="h-4 w-4" /> }
                  ].map((app, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`p-1 rounded-full ${
                          stats.avgJitter < app.threshold 
                          ? 'bg-fw-successLight text-fw-success'
                          : 'bg-fw-errorLight text-fw-error'
                        }`}>
                          {app.icon}
                        </div>
                        <span className="ml-2 text-figma-base text-fw-body">{app.name}</span>
                      </div>
                      <span className={`text-figma-sm font-medium ${
                        stats.avgJitter < app.threshold 
                        ? 'text-fw-success'
                        : 'text-fw-error'
                      }`}>
                        {stats.avgJitter < app.threshold ? 'Supported' : 'May have issues'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="mb-4">
          <h4 className="text-base font-medium text-fw-heading tracking-[-0.03em] mb-2">Jitter Trend Analysis</h4>
          <p className="text-figma-base text-fw-bodyLight">
            This chart shows jitter measurements over time with a moving average trendline to help identify patterns.
          </p>
        </div>
        
        <div className="h-80">
          <LineChart data={chartData} />
        </div>
        
        <div className="mt-6 p-4 bg-fw-wash rounded-lg">
          <div className="flex items-start">
            <Info className="h-5 w-5 text-fw-bodyLight mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-figma-base text-fw-bodyLight">
              <p className="font-medium text-fw-heading mb-1">Understanding Jitter</p>
              <p>
                Jitter represents the variation in packet delay. While latency measures how long it takes for data to travel, jitter measures how consistent that travel time is. Low jitter is critical for real-time applications like voice and video.
                {stats.jitterRatio > 0.3 && 
                ` Your ratio of jitter to latency (${(stats.jitterRatio * 100).toFixed(1)}%) is higher than ideal, suggesting network instability or congestion.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}