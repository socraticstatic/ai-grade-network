import { useState } from 'react';
import { AlertTriangle, Check, Settings, Shield, Activity, Zap, RefreshCw, Scale, CloudLightning } from 'lucide-react';

interface NetworkParametersProps {
  onParameterChange: (parameter: string, value: number) => void;
}

export function NetworkParameters({ onParameterChange }: NetworkParametersProps) {
  const [parameters, setParameters] = useState({
    resiliency: 50,
    redundancy: 50,
    disaster: 25,
    security: 50,
    performance: 50
  });

  const handleSliderChange = (parameter: keyof typeof parameters, value: number) => {
    setParameters(prev => ({
      ...prev,
      [parameter]: value
    }));
    onParameterChange(parameter, value);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 80) return { icon: Check, text: 'Good' };
    if (score >= 50) return { icon: AlertTriangle, text: 'Moderate' };
    return { icon: AlertTriangle, text: 'Needs Improvement' };
  };

  const getParameterIcon = (parameter: string) => {
    switch (parameter) {
      case 'resiliency': return RefreshCw;
      case 'redundancy': return Scale;
      case 'disaster': return CloudLightning;
      case 'security': return Shield;
      case 'performance': return Activity;
      default: return Settings;
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 h-full overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-blue-600" />
          Network Design Parameters
        </h3>
      </div>

      <div className="space-y-4">
        {Object.entries(parameters).map(([param, value]) => {
          const ParamIcon = getParameterIcon(param);
          const { icon: StatusIcon, text: statusText } = getScoreStatus(value);
          
          return (
            <div key={param} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ParamIcon className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700 capitalize">{param}</span>
                </div>
                <div className="flex items-center">
                  <StatusIcon className={`h-4 w-4 ${getScoreColor(value)} mr-1`} />
                  <span className={`text-xs font-medium ${getScoreColor(value)}`}>{statusText}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) => handleSliderChange(param as keyof typeof parameters, parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-900 w-8 text-right">{value}%</span>
              </div>
              
              <div className="text-xs text-gray-500 mt-1">
                {param === 'resiliency' && 'How quickly your network can recover from failures'}
                {param === 'redundancy' && 'Duplicate components to eliminate single points of failure'}
                {param === 'disaster' && 'Ability to maintain operations during major disasters'}
                {param === 'security' && 'Protection against threats and unauthorized access'}
                {param === 'performance' && 'Speed and throughput of network communications'}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
        <p className="text-sm text-blue-700">
          Adjust these parameters to prioritize different network design aspects. The AI will make recommendations based on your preferences.
        </p>
      </div>
    </div>
  );
}