import { useState } from 'react';
import { Target, Shield, DollarSign, CheckCircle2, TrendingUp, Activity, Clock, ArrowRight, Leaf } from 'lucide-react';
import { useOutcomes } from '../context/OutcomesContext';

export function EnhancedBusinessOutcomes() {
  const { outcomes, updateOutcomes, hasOutcomes } = useOutcomes();
  const [activeSection, setActiveSection] = useState<'setup' | 'summary'>('setup');

  const handleSave = () => {
    setActiveSection('summary');
  };

  const renderSetup = () => (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
          <Target className="h-5 w-5 mr-2 text-gray-700" />
          Business Outcomes
        </h2>
        <p className="text-sm text-gray-600">
          Define your network requirements to generate AI recommendations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center mb-3">
            <Clock className="h-4 w-4 mr-2 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Target Latency</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-gray-900">{outcomes.latency}ms</span>
              <span className="text-xs text-gray-500">Maximum</span>
            </div>
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={outcomes.latency}
              onChange={(e) => updateOutcomes({ latency: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>10ms</span>
              <span>200ms</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center mb-3">
            <Activity className="h-4 w-4 mr-2 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Bandwidth</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-gray-900">{outcomes.bandwidth}</span>
              <span className="text-xs text-gray-500">Mbps</span>
            </div>
            <input
              type="range"
              min="100"
              max="10000"
              step="100"
              value={outcomes.bandwidth}
              onChange={(e) => updateOutcomes({ bandwidth: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>100</span>
              <span>10000</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center mb-3">
            <TrendingUp className="h-4 w-4 mr-2 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Availability</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold text-gray-900">{outcomes.availability}%</span>
              <span className="text-xs text-gray-500">Uptime</span>
            </div>
            <input
              type="range"
              min="95"
              max="99.99"
              step="0.1"
              value={outcomes.availability}
              onChange={(e) => updateOutcomes({ availability: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>95%</span>
              <span>99.99%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center mb-3">
            <Shield className="h-4 w-4 mr-2 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Security Level</h3>
          </div>
          <div className="space-y-1.5">
            {(['basic', 'enhanced', 'enterprise'] as const).map((level) => (
              <button
                key={level}
                onClick={() => updateOutcomes({ security: level })}
                className={`w-full p-2 rounded text-sm text-left transition-colors ${
                  outcomes.security === level
                    ? 'bg-blue-50 text-blue-900 border border-blue-200'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium capitalize">{level}</span>
                  {outcomes.security === level && <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Additional Requirements</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center space-x-2 p-3 bg-white rounded border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
            <input
              type="checkbox"
              checked={outcomes.redundancy}
              onChange={(e) => updateOutcomes({ redundancy: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900">Redundancy</div>
              <div className="text-xs text-gray-500">Backup paths</div>
            </div>
          </label>

          <label className="flex items-center space-x-2 p-3 bg-white rounded border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
            <input
              type="checkbox"
              checked={outcomes.multiRegion}
              onChange={(e) => updateOutcomes({ multiRegion: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900">Multi-Region</div>
              <div className="text-xs text-gray-500">Geographic distribution</div>
            </div>
          </label>

          <label className="flex items-center space-x-2 p-3 bg-white rounded border border-gray-200 cursor-pointer hover:border-gray-300 transition-colors">
            <input
              type="checkbox"
              checked={outcomes.complianceRequired}
              onChange={(e) => updateOutcomes({ complianceRequired: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900">Compliance</div>
              <div className="text-xs text-gray-500">Regulatory</div>
            </div>
          </label>

          <div className="p-3 bg-white rounded border border-gray-200">
            <div className="font-medium text-gray-900 mb-2 flex items-center text-sm">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Cost Priority
            </div>
            <select
              value={outcomes.costPriority}
              onChange={(e) => updateOutcomes({ costPriority: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white"
            >
              <option value="low">Minimize costs</option>
              <option value="medium">Balanced</option>
              <option value="high">Performance first</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
          <Leaf className="h-4 w-4 mr-2 text-green-600" />
          Sustainability Goals
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center space-x-2 p-3 bg-white rounded border border-green-100 cursor-pointer hover:border-green-300 transition-colors">
            <input
              type="checkbox"
              checked={outcomes.renewableEnergyPreferred}
              onChange={(e) => updateOutcomes({ renewableEnergyPreferred: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded"
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900">Renewable Energy</div>
              <div className="text-xs text-gray-500">Prioritize green datacenters</div>
            </div>
          </label>

          <label className="flex items-center space-x-2 p-3 bg-white rounded border border-green-100 cursor-pointer hover:border-green-300 transition-colors">
            <input
              type="checkbox"
              checked={outcomes.carbonNeutralGoal}
              onChange={(e) => updateOutcomes({ carbonNeutralGoal: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded"
            />
            <div className="text-sm">
              <div className="font-medium text-gray-900">Carbon Neutral</div>
              <div className="text-xs text-gray-500">Net-zero emissions target</div>
            </div>
          </label>

          <div className="col-span-2 p-3 bg-white rounded border border-green-100">
            <div className="font-medium text-gray-900 mb-2 flex items-center text-sm">
              <Leaf className="h-3.5 w-3.5 mr-1 text-green-600" />
              Sustainability Priority
            </div>
            <select
              value={outcomes.sustainabilityPriority}
              onChange={(e) => updateOutcomes({ sustainabilityPriority: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full p-1.5 border border-gray-300 rounded text-xs bg-white"
            >
              <option value="low">Standard practices</option>
              <option value="medium">Balanced approach</option>
              <option value="high">Maximum efficiency</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center text-sm font-medium transition-colors"
        >
          Generate Recommendations
          <ArrowRight className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center">
          <CheckCircle2 className="h-5 w-5 text-blue-600 mr-3" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Outcomes Configured</h3>
            <p className="text-xs text-blue-700">AI recommendations are ready in the next tab</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Latency</div>
          <div className="text-lg font-semibold text-gray-900">{outcomes.latency}ms</div>
        </div>
        <div className="bg-white rounded p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Bandwidth</div>
          <div className="text-lg font-semibold text-gray-900">{outcomes.bandwidth}</div>
        </div>
        <div className="bg-white rounded p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Availability</div>
          <div className="text-lg font-semibold text-gray-900">{outcomes.availability}%</div>
        </div>
        <div className="bg-white rounded p-3 border border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Security</div>
          <div className="text-lg font-semibold text-gray-900 capitalize">{outcomes.security}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {outcomes.redundancy && (
          <div className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            Redundancy
          </div>
        )}
        {outcomes.multiRegion && (
          <div className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            Multi-Region
          </div>
        )}
        {outcomes.complianceRequired && (
          <div className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
            Compliance
          </div>
        )}
      </div>

      <button
        onClick={() => setActiveSection('setup')}
        className="text-sm text-blue-600 hover:text-blue-800 flex items-center font-medium"
      >
        ← Modify Outcomes
      </button>
    </div>
  );

  return (
    <div className="min-h-[400px]">
      {activeSection === 'setup' ? renderSetup() : renderSummary()}
    </div>
  );
}
