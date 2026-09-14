import { useState, useEffect } from 'react';
import { Button } from '../../../common/Button';
import { FormField } from '../../../form/FormField';
import { AlertTriangle, Clock, TrendingUp, TrendingDown, Activity, Info, Calendar, Plus, X } from 'lucide-react';

interface ScalingRule {
  id: string;
  name: string;
  enabled: boolean;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
  scalingIncrement: number;
}

interface ScheduleWindow {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  minBandwidth: number;
  maxBandwidth: number;
  enabled: boolean;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function BandwidthScalingPolicy() {
  // Basic configuration
  const [autoScalingEnabled, setAutoScalingEnabled] = useState(true);
  const [scaleUpThreshold, setScaleUpThreshold] = useState(80);
  const [scaleDownThreshold, setScaleDownThreshold] = useState(30);
  const [minBandwidth, setMinBandwidth] = useState(100);
  const [maxBandwidth, setMaxBandwidth] = useState(10000);
  const [scalingIncrement, setScalingIncrement] = useState(100);
  const [cooldownPeriod, setCooldownPeriod] = useState(5);

  // Advanced configuration
  const [evaluationPeriod, setEvaluationPeriod] = useState(5);
  const [consecutiveThresholdBreaches, setConsecutiveThresholdBreaches] = useState(2);
  const [notifyOnScale, setNotifyOnScale] = useState(true);
  const [enablePredictiveScaling, setEnablePredictiveScaling] = useState(false);

  // Schedule windows
  const [scheduleWindows, setScheduleWindows] = useState<ScheduleWindow[]>([
    {
      id: 'window-1',
      name: 'Business Hours',
      startTime: '09:00',
      endTime: '17:00',
      daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      minBandwidth: 500,
      maxBandwidth: 10000,
      enabled: true
    },
    {
      id: 'window-2',
      name: 'Off Hours',
      startTime: '17:00',
      endTime: '09:00',
      daysOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      minBandwidth: 100,
      maxBandwidth: 5000,
      enabled: true
    }
  ]);

  const [showAddWindow, setShowAddWindow] = useState(false);
  const [newWindow, setNewWindow] = useState<Partial<ScheduleWindow>>({
    name: '',
    startTime: '',
    endTime: '',
    daysOfWeek: [],
    minBandwidth: 100,
    maxBandwidth: 1000,
    enabled: true
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate configuration
  const validateConfiguration = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (scaleUpThreshold <= scaleDownThreshold) {
      newErrors.thresholds = 'Scale up threshold must be greater than scale down threshold';
    }

    if (scaleUpThreshold < 50 || scaleUpThreshold > 95) {
      newErrors.scaleUp = 'Scale up threshold should be between 50% and 95%';
    }

    if (scaleDownThreshold < 10 || scaleDownThreshold > 50) {
      newErrors.scaleDown = 'Scale down threshold should be between 10% and 50%';
    }

    if (minBandwidth >= maxBandwidth) {
      newErrors.bandwidth = 'Minimum bandwidth must be less than maximum bandwidth';
    }

    if (minBandwidth < 50) {
      newErrors.minBandwidth = 'Minimum bandwidth should be at least 50 Mbps';
    }

    if (scalingIncrement < 50 || scalingIncrement > 1000) {
      newErrors.increment = 'Scaling increment should be between 50 and 1000 Mbps';
    }

    if (cooldownPeriod < 1 || cooldownPeriod > 60) {
      newErrors.cooldown = 'Cooldown period should be between 1 and 60 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      validateConfiguration();
    }
  }, [scaleUpThreshold, scaleDownThreshold, minBandwidth, maxBandwidth, scalingIncrement, cooldownPeriod]);

  const handleSave = () => {
    if (validateConfiguration()) {
      console.log('Saving bandwidth scaling configuration...');
    }
  };

  const handleReset = () => {
    setAutoScalingEnabled(true);
    setScaleUpThreshold(80);
    setScaleDownThreshold(30);
    setMinBandwidth(100);
    setMaxBandwidth(10000);
    setScalingIncrement(100);
    setCooldownPeriod(5);
    setEvaluationPeriod(5);
    setConsecutiveThresholdBreaches(2);
    setNotifyOnScale(true);
    setEnablePredictiveScaling(false);
    setErrors({});
  };

  const handleAddWindow = () => {
    if (!newWindow.name || !newWindow.startTime || !newWindow.endTime || !newWindow.daysOfWeek?.length) {
      return;
    }

    const window: ScheduleWindow = {
      id: `window-${Date.now()}`,
      name: newWindow.name,
      startTime: newWindow.startTime,
      endTime: newWindow.endTime,
      daysOfWeek: newWindow.daysOfWeek,
      minBandwidth: newWindow.minBandwidth || 100,
      maxBandwidth: newWindow.maxBandwidth || 1000,
      enabled: true
    };

    setScheduleWindows([...scheduleWindows, window]);
    setShowAddWindow(false);
    setNewWindow({
      name: '',
      startTime: '',
      endTime: '',
      daysOfWeek: [],
      minBandwidth: 100,
      maxBandwidth: 1000,
      enabled: true
    });
  };

  const handleRemoveWindow = (id: string) => {
    setScheduleWindows(scheduleWindows.filter(w => w.id !== id));
  };

  const handleToggleWindow = (id: string) => {
    setScheduleWindows(scheduleWindows.map(w =>
      w.id === id ? { ...w, enabled: !w.enabled } : w
    ));
  };

  const toggleDayOfWeek = (day: string) => {
    const current = newWindow.daysOfWeek || [];
    if (current.includes(day)) {
      setNewWindow({ ...newWindow, daysOfWeek: current.filter(d => d !== day) });
    } else {
      setNewWindow({ ...newWindow, daysOfWeek: [...current, day] });
    }
  };

  return (
    <div className="space-y-6">
      {/* LMCC Bandwidth Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-fw-accent border border-fw-active/20">
        <Info className="h-5 w-5 text-fw-link flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-figma-sm font-semibold text-fw-heading">AWS Max Connections: Auto-Scaling Not Supported</p>
          <p className="text-figma-xs text-fw-bodyLight mt-1">
            AWS Interconnect – last mile hosted connections (used by AWS Max) do not support dynamic bandwidth changes. To change speed on an AWS Max connection, you must provision 4 new paths at the new bandwidth, have the customer accept them in the AWS Console, then delete the 4 old paths. Auto-scaling policies below apply only to non-AWS Max connections.
          </p>
        </div>
      </div>

      {/* Header Card */}
      <div className="bg-fw-base border border-fw-secondary rounded-2xl shadow-sm">
        <div className="p-6 border-b border-fw-secondary">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">Bandwidth Auto-Scaling</h2>
              <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] mt-1">
                Configure automatic bandwidth scaling policies to optimize network performance and cost efficiency
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-figma-base font-medium ${autoScalingEnabled ? 'text-fw-success' : 'text-fw-bodyLight'}`}>
                {autoScalingEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                onClick={() => setAutoScalingEnabled(!autoScalingEnabled)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  autoScalingEnabled
                    ? 'bg-fw-success focus:ring-fw-success shadow-sm'
                    : 'bg-fw-neutral focus:ring-fw-secondary'
                }`}
                aria-label="Toggle auto-scaling"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-300 ${
                    autoScalingEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Configuration Sections */}
        <div className="p-6 space-y-8">
          {/* Threshold Configuration */}
          <div>
            <div className="flex items-center mb-4">
              <Activity className="h-5 w-5 text-fw-link mr-2" />
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Scaling Thresholds</h3>
            </div>

            {errors.thresholds && (
              <div className="mb-4 bg-fw-error/10 border-l-4 border-fw-error rounded p-3 flex items-start">
                <AlertTriangle className="h-5 w-5 text-fw-error mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-figma-base font-medium text-fw-error tracking-[-0.03em]">{errors.thresholds}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Scale Up Threshold"
                error={errors.scaleUp}
                helpText="Trigger scale up when utilization exceeds this percentage"
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={scaleUpThreshold}
                    onChange={(e) => setScaleUpThreshold(parseInt(e.target.value))}
                    className="flex-1"
                    disabled={!autoScalingEnabled}
                  />
                  <div className="flex items-center space-x-2 min-w-[100px]">
                    <input
                      type="number"
                      value={scaleUpThreshold}
                      onChange={(e) => setScaleUpThreshold(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-fw-secondary rounded text-center"
                      disabled={!autoScalingEnabled}
                    />
                    <span className="text-fw-bodyLight">%</span>
                    <TrendingUp className="h-4 w-4 text-fw-success" />
                  </div>
                </div>
              </FormField>

              <FormField
                label="Scale Down Threshold"
                error={errors.scaleDown}
                helpText="Trigger scale down when utilization falls below this percentage"
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={scaleDownThreshold}
                    onChange={(e) => setScaleDownThreshold(parseInt(e.target.value))}
                    className="flex-1"
                    disabled={!autoScalingEnabled}
                  />
                  <div className="flex items-center space-x-2 min-w-[100px]">
                    <input
                      type="number"
                      value={scaleDownThreshold}
                      onChange={(e) => setScaleDownThreshold(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-fw-secondary rounded text-center"
                      disabled={!autoScalingEnabled}
                    />
                    <span className="text-fw-bodyLight">%</span>
                    <TrendingDown className="h-4 w-4 text-fw-warn" />
                  </div>
                </div>
              </FormField>
            </div>

            <div className="mt-4 bg-fw-wash border border-fw-secondary rounded p-3">
              <div className="flex items-start">
                <Info className="h-4 w-4 text-fw-info mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">
                  <strong>Recommendation:</strong> Maintain at least a 30% gap between scale up and scale down thresholds to prevent rapid oscillation.
                </p>
              </div>
            </div>
          </div>

          {/* Bandwidth Limits */}
          <div>
            <div className="flex items-center mb-4">
              <TrendingUp className="h-5 w-5 text-fw-link mr-2" />
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Bandwidth Limits</h3>
            </div>

            {errors.bandwidth && (
              <div className="mb-4 bg-fw-error/10 border-l-4 border-fw-error rounded p-3 flex items-start">
                <AlertTriangle className="h-5 w-5 text-fw-error mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-figma-base font-medium text-fw-error tracking-[-0.03em]">{errors.bandwidth}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                label="Minimum Bandwidth (Mbps)"
                error={errors.minBandwidth}
                helpText="Never scale below this value"
              >
                <input
                  type="number"
                  value={minBandwidth}
                  onChange={(e) => setMinBandwidth(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  disabled={!autoScalingEnabled}
                  min="50"
                  step="50"
                />
              </FormField>

              <FormField
                label="Maximum Bandwidth (Mbps)"
                helpText="Never scale above this value"
              >
                <input
                  type="number"
                  value={maxBandwidth}
                  onChange={(e) => setMaxBandwidth(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  disabled={!autoScalingEnabled}
                  min="100"
                  step="100"
                />
              </FormField>

              <FormField
                label="Scaling Increment (Mbps)"
                error={errors.increment}
                helpText="Amount to add/remove per scaling action"
              >
                <input
                  type="number"
                  value={scalingIncrement}
                  onChange={(e) => setScalingIncrement(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  disabled={!autoScalingEnabled}
                  min="50"
                  step="50"
                />
              </FormField>
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <div className="flex items-center mb-4">
              <Clock className="h-5 w-5 text-fw-link mr-2" />
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Advanced Settings</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="Cooldown Period (minutes)"
                error={errors.cooldown}
                helpText="Wait time between scaling actions"
              >
                <input
                  type="number"
                  value={cooldownPeriod}
                  onChange={(e) => setCooldownPeriod(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  disabled={!autoScalingEnabled}
                  min="1"
                  max="60"
                />
              </FormField>

              <FormField
                label="Evaluation Period (minutes)"
                helpText="How long to monitor before scaling"
              >
                <input
                  type="number"
                  value={evaluationPeriod}
                  onChange={(e) => setEvaluationPeriod(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  disabled={!autoScalingEnabled}
                  min="1"
                  max="30"
                />
              </FormField>

              <FormField
                label="Consecutive Breaches Required"
                helpText="Number of consecutive threshold breaches needed"
              >
                <input
                  type="number"
                  value={consecutiveThresholdBreaches}
                  onChange={(e) => setConsecutiveThresholdBreaches(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active focus:border-fw-active"
                  disabled={!autoScalingEnabled}
                  min="1"
                  max="5"
                />
              </FormField>
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={notifyOnScale}
                  onChange={(e) => setNotifyOnScale(e.target.checked)}
                  className="h-4 w-4 rounded border-fw-secondary text-fw-link focus:ring-fw-active"
                  disabled={!autoScalingEnabled}
                />
                <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Send notifications on scaling events</span>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={enablePredictiveScaling}
                  onChange={(e) => setEnablePredictiveScaling(e.target.checked)}
                  className="h-4 w-4 rounded border-fw-secondary text-fw-link focus:ring-fw-active"
                  disabled={!autoScalingEnabled}
                />
                <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em]">Enable predictive scaling (uses ML to forecast demand)</span>
              </label>
            </div>
          </div>

          {/* Schedule Windows - Continued in next part due to size */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-fw-link mr-2" />
                <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Schedule Windows</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={() => setShowAddWindow(true)}
                disabled={!autoScalingEnabled}
              >
                Add Window
              </Button>
            </div>

            <div className="space-y-3">
              {scheduleWindows.map((window) => (
                <div
                  key={window.id}
                  className={`border rounded-xl p-4 ${
                    window.enabled ? 'border-fw-secondary bg-fw-base' : 'border-fw-disabled bg-fw-wash'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-fw-heading">{window.name}</h4>
                        <span className={`px-2 py-0.5 text-figma-sm rounded-full ${
                          window.enabled ? 'bg-fw-success/10 text-fw-success' : 'bg-fw-disabled text-fw-bodyLight'
                        }`}>
                          {window.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-figma-base">
                        <div>
                          <span className="text-fw-bodyLight">Time:</span>
                          <span className="ml-2 text-fw-body">{window.startTime} - {window.endTime}</span>
                        </div>
                        <div>
                          <span className="text-fw-bodyLight">Days:</span>
                          <span className="ml-2 text-fw-body">{window.daysOfWeek.length} days</span>
                        </div>
                        <div>
                          <span className="text-fw-bodyLight">Range:</span>
                          <span className="ml-2 text-fw-body">{window.minBandwidth} - {window.maxBandwidth} Mbps</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleToggleWindow(window.id)}
                        className="text-fw-link hover:text-fw-linkHover text-figma-base"
                        disabled={!autoScalingEnabled}
                      >
                        {window.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleRemoveWindow(window.id)}
                        className="text-fw-error hover:text-fw-error p-1"
                        disabled={!autoScalingEnabled}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Window Form */}
            {showAddWindow && (
              <div className="mt-4 border border-fw-secondary rounded-xl p-4 bg-fw-wash">
                <h4 className="font-medium text-fw-heading mb-4">Add Schedule Window</h4>
                <div className="space-y-4">
                  <FormField label="Window Name">
                    <input
                      type="text"
                      value={newWindow.name || ''}
                      onChange={(e) => setNewWindow({ ...newWindow, name: e.target.value })}
                      className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active"
                      placeholder="e.g., Peak Hours"
                    />
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Start Time">
                      <input
                        type="time"
                        value={newWindow.startTime || ''}
                        onChange={(e) => setNewWindow({ ...newWindow, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active"
                      />
                    </FormField>

                    <FormField label="End Time">
                      <input
                        type="time"
                        value={newWindow.endTime || ''}
                        onChange={(e) => setNewWindow({ ...newWindow, endTime: e.target.value })}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active"
                      />
                    </FormField>
                  </div>

                  <FormField label="Days of Week">
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <button
                          key={day}
                          onClick={() => toggleDayOfWeek(day)}
                          className={`px-3 py-1 text-figma-base rounded-md border transition-colors ${
                            (newWindow.daysOfWeek || []).includes(day)
                              ? 'bg-fw-link text-white border-fw-link'
                              : 'bg-fw-base text-fw-body border-fw-secondary hover:bg-fw-wash'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Min Bandwidth (Mbps)">
                      <input
                        type="number"
                        value={newWindow.minBandwidth || 100}
                        onChange={(e) => setNewWindow({ ...newWindow, minBandwidth: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active"
                      />
                    </FormField>

                    <FormField label="Max Bandwidth (Mbps)">
                      <input
                        type="number"
                        value={newWindow.maxBandwidth || 1000}
                        onChange={(e) => setNewWindow({ ...newWindow, maxBandwidth: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-fw-secondary rounded-md focus:outline-none focus:ring-2 focus:ring-fw-active"
                      />
                    </FormField>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setShowAddWindow(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleAddWindow}>
                      Add Window
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-fw-wash border-t border-fw-secondary flex justify-between items-center">
          <div className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">
            Last saved: Never
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}