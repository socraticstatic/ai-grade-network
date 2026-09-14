import { useState } from 'react';
import { Sparkles, Target, Shield, Zap, ArrowRight, CheckCircle, Clock, Building2, Globe as Globe2, Network } from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../types';
import { OutcomeSelector } from './OutcomeSelector';

interface DesignAssistantProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  onApply: (newNodes: NetworkNode[], newEdges: NetworkEdge[]) => void;
}

type DesignStage = 'purpose' | 'requirements' | 'patterns' | 'review';

interface DesignContext {
  purpose: 'connectivity' | 'security' | 'performance' | 'redundancy' | null;
  requirements: {
    multiRegion: boolean;
    highAvailability: boolean;
    security: boolean;
    costOptimized: boolean;
  };
  selectedPattern: string | null;
}

export function DesignAssistant({ nodes, edges, onApply }: DesignAssistantProps) {
  const [currentStage, setCurrentStage] = useState<DesignStage>('purpose');
  const [designContext, setDesignContext] = useState<DesignContext>({
    purpose: null,
    requirements: {
      multiRegion: false,
      highAvailability: false,
      security: false,
      costOptimized: false
    },
    selectedPattern: null
  });

  // If network already exists, show the outcome selector directly
  if (nodes.length > 2) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
            Enhance Your Network
          </h3>
          <p className="text-sm text-gray-600">Add patterns to improve your existing network design</p>
        </div>
        <OutcomeSelector nodes={nodes} edges={edges} onApply={onApply} />
      </div>
    );
  }

  const purposes = [
    {
      id: 'connectivity',
      title: 'Basic Connectivity',
      description: 'Connect your locations to cloud services reliably',
      icon: Network,
      color: 'blue'
    },
    {
      id: 'security',
      title: 'Secure Network',
      description: 'Protect data with security-first architecture',
      icon: Shield,
      color: 'red'
    },
    {
      id: 'performance',
      title: 'High Performance',
      description: 'Optimize for speed and low latency applications',
      icon: Zap,
      color: 'yellow'
    },
    {
      id: 'redundancy',
      title: 'Business Continuity',
      description: 'Ensure operations continue during outages',
      icon: Building2,
      color: 'green'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
      red: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
      yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100',
      green: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const handlePurposeSelect = (purpose: string) => {
    setDesignContext(prev => ({ ...prev, purpose: purpose as any }));
    setCurrentStage('requirements');
  };

  const handleRequirementToggle = (requirement: keyof DesignContext['requirements']) => {
    setDesignContext(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [requirement]: !prev.requirements[requirement]
      }
    }));
  };

  const handleContinueToPatterns = () => {
    setCurrentStage('patterns');
  };

  const getRecommendedPatterns = () => {
    const { purpose, requirements } = designContext;
    
    if (purpose === 'security') {
      return requirements.highAvailability ? 'Secure High-Availability Network' : 'Security-First Architecture';
    }
    if (purpose === 'performance') {
      return requirements.multiRegion ? 'Multi-Region Performance Network' : 'High-Performance Single Region';
    }
    if (purpose === 'redundancy') {
      return 'Business Continuity Network';
    }
    return 'Basic Cloud Connectivity';
  };

  const renderStageContent = () => {
    switch (currentStage) {
      case 'purpose':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">What's your primary network goal?</h3>
              <p className="text-gray-600">Choose your main objective to get personalized design recommendations</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {purposes.map(purpose => (
                <button
                  key={purpose.id}
                  onClick={() => handlePurposeSelect(purpose.id)}
                  className={`p-6 border-2 rounded-xl text-left transition-all duration-200 ${getColorClasses(purpose.color)}`}
                >
                  <div className="flex items-center mb-3">
                    <div className={`p-2 rounded-lg bg-white/60 mr-3`}>
                      <purpose.icon className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-semibold">{purpose.title}</h4>
                  </div>
                  <p className="text-sm opacity-80">{purpose.description}</p>
                </button>
              ))}
            </div>
          </div>
        );

      case 'requirements':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">What are your specific requirements?</h3>
              <p className="text-gray-600">Select the features that matter most for your network</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  designContext.requirements.multiRegion 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleRequirementToggle('multiRegion')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Globe2 className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="font-medium text-gray-900">Multi-Region</span>
                  </div>
                  {designContext.requirements.multiRegion && <CheckCircle className="h-5 w-5 text-blue-600" />}
                </div>
                <p className="text-sm text-gray-600 mt-1">Deploy across multiple geographic regions</p>
              </div>

              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  designContext.requirements.highAvailability 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleRequirementToggle('highAvailability')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-green-600 mr-2" />
                    <span className="font-medium text-gray-900">High Availability</span>
                  </div>
                  {designContext.requirements.highAvailability && <CheckCircle className="h-5 w-5 text-green-600" />}
                </div>
                <p className="text-sm text-gray-600 mt-1">99.99% uptime with automatic failover</p>
              </div>

              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  designContext.requirements.security 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleRequirementToggle('security')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-red-600 mr-2" />
                    <span className="font-medium text-gray-900">Enhanced Security</span>
                  </div>
                  {designContext.requirements.security && <CheckCircle className="h-5 w-5 text-red-600" />}
                </div>
                <p className="text-sm text-gray-600 mt-1">Firewalls and security controls</p>
              </div>

              <div 
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  designContext.requirements.costOptimized 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleRequirementToggle('costOptimized')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Target className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="font-medium text-gray-900">Cost Optimized</span>
                  </div>
                  {designContext.requirements.costOptimized && <CheckCircle className="h-5 w-5 text-purple-600" />}
                </div>
                <p className="text-sm text-gray-600 mt-1">Balance performance with cost efficiency</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setCurrentStage('purpose')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center"
              >
                ← Back
              </button>
              <button
                onClick={handleContinueToPatterns}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        );

      case 'patterns':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Recommended Network Pattern</h3>
              <p className="text-gray-600">Based on your selections, here's the ideal pattern for your network</p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center mb-4">
                <div className="p-3 bg-blue-100 rounded-full mr-4">
                  <Sparkles className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{getRecommendedPatterns()}</h4>
                  <p className="text-blue-700 text-sm">Tailored to your {designContext.purpose} goals</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/60 rounded-lg p-3">
                  <h5 className="font-medium text-gray-900 mb-1">Includes:</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• AT&T Core foundation</li>
                    <li>• Your named hub</li>
                    {designContext.requirements.security && <li>• Security firewall</li>}
                    {designContext.requirements.highAvailability && <li>• Redundant connections</li>}
                    {designContext.requirements.multiRegion && <li>• Multi-region setup</li>}
                  </ul>
                </div>
                
                <div className="bg-white/60 rounded-lg p-3">
                  <h5 className="font-medium text-gray-900 mb-1">Benefits:</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Enterprise-grade reliability</li>
                    <li>• Optimized for your use case</li>
                    <li>• Industry best practices</li>
                    <li>• Ready for production</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-blue-200">
                <button
                  onClick={() => setCurrentStage('requirements')}
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 flex items-center"
                >
                  ← Modify Requirements
                </button>
                <button
                  onClick={() => {
                    // Apply the pattern based on context
                    // For now, we'll show the outcome selector
                    setCurrentStage('review');
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  Apply Pattern
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <span className="font-medium text-green-900">Ready to enhance your network!</span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                Choose from the patterns below to add the features you selected.
              </p>
            </div>
            <OutcomeSelector nodes={nodes} edges={edges} onApply={onApply} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {renderStageContent()}
    </div>
  );
}