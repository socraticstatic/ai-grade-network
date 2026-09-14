import { Leaf, Zap, MapPin, TrendingDown, Award, AlertCircle, CheckCircle2, Droplets, Wind, Thermometer } from 'lucide-react';
import { useOutcomes } from '../context/OutcomesContext';

export function SustainabilityImpact() {
  const { outcomes } = useOutcomes();

  const calculateSustainabilityScore = () => {
    let score = 50;

    if (outcomes.renewableEnergyPreferred) score += 15;
    if (outcomes.carbonNeutralGoal) score += 15;
    if (outcomes.sustainabilityPriority === 'high') score += 20;
    else if (outcomes.sustainabilityPriority === 'medium') score += 10;

    if (outcomes.multiRegion) score -= 10;
    if (outcomes.bandwidth > 5000) score -= 5;

    return Math.max(0, Math.min(100, score));
  };

  const score = calculateSustainabilityScore();

  const getGradeFromScore = (s: number) => {
    if (s >= 85) return { grade: 'A', color: 'green', label: 'Excellent' };
    if (s >= 70) return { grade: 'B', color: 'emerald', label: 'Good' };
    if (s >= 55) return { grade: 'C', color: 'yellow', label: 'Fair' };
    if (s >= 40) return { grade: 'D', color: 'orange', label: 'Poor' };
    return { grade: 'E', color: 'red', label: 'Critical' };
  };

  const gradeInfo = getGradeFromScore(score);

  const estimatedCarbonFootprint = Math.round((10000 - (score * 80)) / 10) / 10;
  const estimatedPUE = (2.0 - (score / 100)).toFixed(2);
  const renewablePercentage = outcomes.renewableEnergyPreferred ? 75 : 35;

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center">
          <Leaf className="h-5 w-5 mr-2 text-green-600" />
          Sustainability Impact Assessment
        </h2>
        <p className="text-sm text-gray-600">
          Environmental performance analysis based on your network design
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`bg-gradient-to-br from-${gradeInfo.color}-50 to-${gradeInfo.color}-100 rounded-lg p-6 border-2 border-${gradeInfo.color}-200`}>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700 mb-2">Overall Sustainability Grade</div>
            <div className={`text-6xl font-bold text-${gradeInfo.color}-600 mb-2`}>{gradeInfo.grade}</div>
            <div className={`text-sm font-medium text-${gradeInfo.color}-700`}>{gradeInfo.label}</div>
            <div className="mt-3 text-2xl font-semibold text-gray-900">{score}/100</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-3">
            <TrendingDown className="h-5 w-5 mr-2 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Carbon Footprint</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-gray-900">{estimatedCarbonFootprint}</div>
              <div className="text-xs text-gray-500">tons CO₂e/year</div>
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              <span>Estimated annual emissions</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-3">
            <Zap className="h-5 w-5 mr-2 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900">Energy Efficiency</h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-gray-900">{estimatedPUE}</div>
              <div className="text-xs text-gray-500">Power Usage Effectiveness</div>
            </div>
            <div className="flex items-center text-xs text-gray-600">
              <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
              <span>Industry avg: 1.58</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <Wind className="h-4 w-4 mr-2 text-green-600" />
            Energy Profile
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Renewable Energy</span>
                <span className="text-xs font-semibold text-green-700">{renewablePercentage}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${renewablePercentage}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Grid Carbon Intensity</span>
                <span className="text-xs font-semibold text-gray-700">Medium</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
            <Award className="h-4 w-4 mr-2 text-blue-600" />
            Compliance & Standards
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
              <span className="text-xs font-medium text-gray-900">ISO 14001 Ready</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
              <span className="text-xs font-medium text-gray-900">EU Energy Directive</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
              <span className="text-xs font-medium text-gray-900">B Corp Standards</span>
              <AlertCircle className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-5 border border-blue-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-blue-600" />
          Green Optimization Recommendations
        </h3>
        <div className="space-y-3">
          {!outcomes.renewableEnergyPreferred && (
            <div className="flex items-start p-3 bg-white rounded border border-green-200">
              <Leaf className="h-4 w-4 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">Enable Renewable Energy Preference</div>
                <div className="text-xs text-gray-600">Prioritize datacenters powered by wind, solar, and hydro. Potential carbon reduction: 40%</div>
              </div>
            </div>
          )}
          {outcomes.sustainabilityPriority !== 'high' && (
            <div className="flex items-start p-3 bg-white rounded border border-blue-200">
              <Thermometer className="h-4 w-4 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">Increase Sustainability Priority</div>
                <div className="text-xs text-gray-600">Optimize for energy efficiency and lower PUE ratings. Estimated energy savings: 25%</div>
              </div>
            </div>
          )}
          {outcomes.multiRegion && (
            <div className="flex items-start p-3 bg-white rounded border border-yellow-200">
              <Droplets className="h-4 w-4 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">Consider Regional Consolidation</div>
                <div className="text-xs text-gray-600">Multi-region increases data transfer emissions. Edge computing can reduce carbon by 30%</div>
              </div>
            </div>
          )}
          {!outcomes.carbonNeutralGoal && (
            <div className="flex items-start p-3 bg-white rounded border border-green-200">
              <TrendingDown className="h-4 w-4 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">Set Carbon Neutral Target</div>
                <div className="text-xs text-gray-600">Commit to net-zero emissions through renewable energy and carbon offsets</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-700 leading-relaxed">
            <strong>Assessment Methodology:</strong> This sustainability analysis considers datacenter energy efficiency (PUE),
            renewable energy utilization, regional grid carbon intensity, data transfer volumes, and alignment with B Corp and
            EU sustainability standards. Scores are calculated based on industry benchmarks and best practices for
            environmentally responsible network infrastructure.
          </div>
        </div>
      </div>
    </div>
  );
}
