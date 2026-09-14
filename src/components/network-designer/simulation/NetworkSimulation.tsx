import { useState } from 'react';
import { Activity, Shield, Pause, Play, BarChart2, X, Network, AlertTriangle, Sliders } from 'lucide-react';
import { useDesignerStore } from '../store/useDesignerStore';
import { pauseSimulation, resumeSimulation, cancelSimulation, injectLatency, injectPacketLoss, injectBandwidthLimit } from './runSimulation';

type Tab = 'test-controls' | 'network-metrics' | 'pricing-comparison';

const PHASE_DOT: Record<string, string> = {
  initializing: 'bg-fw-warn animate-pulse',
  running: 'bg-fw-link animate-pulse',
  paused: 'bg-fw-warn',
  completed: 'bg-fw-success',
  error: 'bg-fw-error',
  idle: 'bg-fw-secondary',
};

const PROGRESS_COLOR: Record<string, string> = {
  initializing: 'bg-fw-warn',
  running: 'bg-fw-link',
  paused: 'bg-fw-warn',
  completed: 'bg-fw-success',
  error: 'bg-fw-error',
  idle: 'bg-fw-secondary',
};

export function NetworkSimulation() {
  const phase = useDesignerStore((s) => s.simulationPhase);
  const progress = useDesignerStore((s) => s.simulationProgress);
  const metrics = useDesignerStore((s) => s.simulationMetrics);
  const scores = useDesignerStore((s) => s.simulationScores);
  const isRunning = useDesignerStore((s) => s.isSimulationRunning);

  const [activeTab, setActiveTab] = useState<Tab>('network-metrics');
  const [latencyAmount, setLatencyAmount] = useState(50);
  const [packetLossAmount, setPacketLossAmount] = useState(5);
  const [bandwidthLimit, setBandwidthLimit] = useState(70);

  if (!isRunning && phase === 'idle') return null;

  const isPaused = phase === 'paused';
  const packetSuccess = metrics.packets.sent > 0
    ? ((metrics.packets.received / metrics.packets.sent) * 100).toFixed(2)
    : '100.00';

  const sharedInternet = {
    latency: Math.min(85, (metrics.latency.current / 10) * 3.5),
    bandwidth: Math.max(15, metrics.bandwidth.current / 3),
    security: Math.max(20, scores.security / 2),
  };

  const handleClose = () => {
    cancelSimulation();
    useDesignerStore.getState().stopSimulation();
  };

  const tabs: { id: Tab; label: string; icon: typeof Sliders }[] = [
    { id: 'test-controls', label: 'Test Controls', icon: Sliders },
    { id: 'network-metrics', label: 'Network Metrics', icon: BarChart2 },
    { id: 'pricing-comparison', label: 'Pricing Comparison', icon: Network },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-3xl mx-6 bg-fw-base rounded-2xl shadow-lg border border-fw-secondary overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-fw-wash rounded-full">
                <Network className="h-5 w-5 text-fw-link" />
              </div>
              <div>
                <h3 className="text-figma-base font-semibold text-fw-heading">Network Performance Simulation</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={`h-2 w-2 rounded-full ${PHASE_DOT[phase] || PHASE_DOT.idle}`} />
                  <span className="text-figma-xs text-fw-bodyLight capitalize">
                    {phase === 'running' ? 'Running simulation' : phase}
                    {isPaused && ' - Press play to continue'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={isPaused ? resumeSimulation : pauseSimulation}
                className={`p-2 rounded-full transition-colors ${
                  isPaused ? 'bg-fw-successLight text-fw-success hover:opacity-80' : 'bg-fw-warnLight text-fw-warn hover:opacity-80'
                }`}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button
                onClick={handleClose}
                className="p-2 rounded-full text-fw-bodyLight hover:bg-fw-wash transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-fw-wash rounded-full h-1.5 mt-4 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-500 ${PROGRESS_COLOR[phase] || PROGRESS_COLOR.idle}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Tabs - SDCI line pattern: border-b-2, active = border-fw-active text-fw-link */}
          <div className="flex gap-6 mt-4 border-b border-fw-secondary">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 pt-1 pb-2 px-1 border-b-2 font-medium text-figma-sm no-rounded tracking-[-0.03em] transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-fw-active text-fw-link'
                    : 'border-transparent text-fw-heading hover:text-fw-body hover:border-fw-secondary'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5">

          {/* Network Metrics */}
          {activeTab === 'network-metrics' && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <MetricCard
                  icon={<Activity className="h-5 w-5 text-fw-warn" />}
                  label="Latency"
                  sublabel="Network response time"
                  value={`${(metrics.latency.current / 10).toFixed(1)} ms`}
                />
                <MetricCard
                  icon={<Shield className="h-5 w-5 text-fw-success" />}
                  label="Packet Success"
                  sublabel="Transmission reliability"
                  value={`${packetSuccess} %`}
                />
                <MetricCard
                  icon={<Network className="h-5 w-5 text-fw-link" />}
                  label="Bandwidth"
                  sublabel="Available capacity"
                  value={`${metrics.bandwidth.current.toFixed(0)} %`}
                />
              </div>
              <div className="grid grid-cols-5 gap-4">
                <ScoreBar label="Resiliency" value={scores.resiliency} color="bg-fw-error" />
                <ScoreBar label="Redundancy" value={scores.redundancy} color="bg-fw-warn" />
                <ScoreBar label="Disaster" value={scores.disaster} color="bg-fw-error" />
                <ScoreBar label="Security" value={scores.security} color="bg-fw-link" />
                <ScoreBar label="Performance" value={scores.performance} color="bg-fw-warn" />
              </div>
            </div>
          )}

          {/* Test Controls */}
          {activeTab === 'test-controls' && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <InjectionCard
                  icon={<Activity className="h-4 w-4 text-fw-link" />}
                  label="Inject Latency"
                  value={latencyAmount}
                  unit="ms"
                  min={0}
                  max={200}
                  onChange={setLatencyAmount}
                  onApply={() => injectLatency(latencyAmount)}
                />
                <InjectionCard
                  icon={<AlertTriangle className="h-4 w-4 text-fw-link" />}
                  label="Packet Loss"
                  value={packetLossAmount}
                  unit="%"
                  min={0}
                  max={20}
                  onChange={setPacketLossAmount}
                  onApply={() => injectPacketLoss(packetLossAmount)}
                />
                <InjectionCard
                  icon={<Network className="h-4 w-4 text-fw-link" />}
                  label="Bandwidth Limit"
                  value={bandwidthLimit}
                  unit="%"
                  min={10}
                  max={100}
                  onChange={setBandwidthLimit}
                  onApply={() => injectBandwidthLimit(bandwidthLimit)}
                />
              </div>
              <div className="bg-fw-ctaGhost rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-fw-link mt-0.5 flex-shrink-0" />
                <p className="text-figma-xs text-fw-link">
                  These controls simulate real-world network conditions to test how your network design handles various performance challenges.
                  Use them to verify the resilience of your architecture under different conditions.
                </p>
              </div>
            </div>
          )}

          {/* Pricing Comparison */}
          {activeTab === 'pricing-comparison' && (
            <div>
              <p className="text-figma-xs text-fw-bodyLight mb-4 flex items-center gap-1.5">
                <BarChart2 className="h-3.5 w-3.5" />
                Here you can find comparison between your network and shared internet
              </p>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <ComparisonCard
                  label="Latency"
                  yourValue={(metrics.latency.current / 10).toFixed(1)}
                  sharedValue={sharedInternet.latency.toFixed(1)}
                  yourUnit="ms"
                  sharedUnit="ms"
                  improvement={Math.round(((sharedInternet.latency - metrics.latency.current / 10) / Math.max(1, sharedInternet.latency)) * 100)}
                />
                <ComparisonCard
                  label="Bandwidth"
                  yourValue={`${metrics.bandwidth.current.toFixed(0)}%`}
                  sharedValue={`${sharedInternet.bandwidth.toFixed(0)}%`}
                  yourUnit="utilized"
                  sharedUnit="utilized"
                  improvement={Math.round(((metrics.bandwidth.current - sharedInternet.bandwidth) / Math.max(1, sharedInternet.bandwidth)) * 100)}
                />
                <ComparisonCard
                  label="Bandwidth"
                  yourValue={`${(100 - metrics.bandwidth.current).toFixed(0)}%`}
                  sharedValue={`${(100 - sharedInternet.bandwidth).toFixed(0)}%`}
                  yourUnit="available"
                  sharedUnit="available"
                  improvement={0}
                />
                <ComparisonCard
                  label="Security"
                  yourValue={`${scores.security.toFixed(0)}%`}
                  sharedValue={`${sharedInternet.security.toFixed(0)}%`}
                  yourUnit="protected"
                  sharedUnit="protected"
                  improvement={Math.round(((scores.security - sharedInternet.security) / Math.max(1, sharedInternet.security)) * 100)}
                />
              </div>
              <div className="bg-fw-successLight rounded-lg border border-fw-success/20 p-4">
                <h4 className="text-figma-sm font-medium text-fw-success mb-2 flex items-center gap-1.5">
                  <BarChart2 className="h-4 w-4" />
                  Business Value Analysis
                </h4>
                <p className="text-figma-xs text-fw-body mb-3">
                  Your custom network design delivers superior performance and reliability compared to shared internet.
                </p>
                <div className="flex gap-6">
                  <div>
                    <span className="text-figma-xs text-fw-success block">Productivity</span>
                    <span className="text-figma-sm font-semibold text-fw-heading">+{Math.max(0, Math.round(scores.performance * 0.6))}%</span>
                  </div>
                  <div>
                    <span className="text-figma-xs text-fw-success block">Reliability</span>
                    <span className="text-figma-sm font-semibold text-fw-heading">+{Math.max(0, (99.5 - 0.5 * (100 - scores.redundancy)).toFixed(1))}%</span>
                  </div>
                  <div>
                    <span className="text-figma-xs text-fw-success block">Risk Reduction</span>
                    <span className="text-figma-sm font-semibold text-fw-heading">+{Math.max(0, Math.round(scores.security * 0.7))}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components

function MetricCard({ icon, label, sublabel, value }: {
  icon: React.ReactNode; label: string; sublabel: string; value: string;
}) {
  return (
    <div className="rounded-xl border border-fw-secondary bg-fw-base p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-figma-sm font-medium text-fw-heading">{label}</div>
      <div className="text-figma-xs text-fw-bodyLight mb-2">{sublabel}</div>
      <div className="text-2xl font-bold text-fw-heading">{value}</div>
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <span className="text-figma-xs text-fw-bodyLight block mb-1">{label}</span>
      <span className="text-figma-sm font-semibold text-fw-heading">{Math.round(value)}%</span>
      <div className="w-full bg-fw-wash rounded-full h-1.5 mt-1 overflow-hidden">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function InjectionCard({ icon, label, value, unit, min, max, onChange, onApply }: {
  icon: React.ReactNode; label: string; value: number; unit: string;
  min: number; max: number; onChange: (v: number) => void; onApply: () => void;
}) {
  return (
    <div className="bg-fw-base rounded-lg p-4 border border-fw-secondary">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5 text-figma-sm font-medium text-fw-heading">{icon}{label}</div>
        <span className="text-figma-xs font-semibold bg-fw-ctaGhost text-fw-link px-2 py-0.5 rounded-full">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-fw-neutral rounded-lg appearance-none cursor-pointer mb-3"
      />
      <button
        onClick={onApply}
        className="w-full py-1.5 text-figma-sm bg-fw-ctaGhost text-fw-link rounded-lg border border-fw-secondary hover:opacity-80 transition-colors"
      >
        Apply
      </button>
    </div>
  );
}

function ComparisonCard({ label, yourValue, sharedValue, yourUnit, sharedUnit, improvement }: {
  label: string; yourValue: string; sharedValue: string;
  yourUnit: string; sharedUnit: string; improvement: number;
}) {
  return (
    <div className="rounded-lg border border-fw-secondary bg-fw-base p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-figma-xs font-medium text-fw-heading">{label}</span>
        {improvement > 0 && (
          <span className="text-figma-xs font-semibold bg-fw-successLight text-fw-success px-1.5 py-0.5 rounded-full">
            {improvement}% better
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <div>
          <div className="flex justify-between text-figma-xs mb-0.5">
            <span className="text-fw-bodyLight">Your</span>
            <span className="text-fw-success font-medium">{yourValue} {yourUnit}</span>
          </div>
          <div className="h-1.5 bg-fw-wash rounded-full overflow-hidden">
            <div className="h-1.5 bg-fw-success rounded-full" style={{ width: '75%' }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-figma-xs mb-0.5">
            <span className="text-fw-bodyLight">Shared</span>
            <span className="text-fw-bodyLight font-medium">{sharedValue} {sharedUnit}</span>
          </div>
          <div className="h-1.5 bg-fw-wash rounded-full overflow-hidden">
            <div className="h-1.5 bg-fw-disabled rounded-full" style={{ width: '40%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
