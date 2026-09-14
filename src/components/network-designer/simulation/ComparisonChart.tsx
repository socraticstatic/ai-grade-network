import { useState, useEffect } from 'react';

interface ComparisonChartProps {
  title: string;
  yourValue: number;
  comparisonValue: number;
  format?: 'percentage' | 'decimal' | 'milliseconds' | 'mbps';
  higherIsBetter?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'amber' | 'red';
  maxValue?: number;
}

export function ComparisonChart({
  title,
  yourValue,
  comparisonValue,
  format = 'percentage',
  higherIsBetter = true,
  color = 'blue',
  maxValue
}: ComparisonChartProps) {
  const [improvement, setImprovement] = useState(0);
  
  // Calculate improvement percentage
  useEffect(() => {
    if (higherIsBetter) {
      if (comparisonValue === 0) {
        setImprovement(yourValue > 0 ? 100 : 0);
      } else {
        setImprovement(((yourValue - comparisonValue) / comparisonValue) * 100);
      }
    } else {
      if (yourValue === 0) {
        setImprovement(comparisonValue > 0 ? 100 : 0);
      } else {
        setImprovement(((comparisonValue - yourValue) / comparisonValue) * 100);
      }
    }
  }, [yourValue, comparisonValue, higherIsBetter]);
  
  // Format displayed values based on the format prop
  const formatValue = (value: number): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(0)}%`;
      case 'decimal':
        return value.toFixed(2);
      case 'milliseconds':
        return `${value.toFixed(1)}ms`;
      case 'mbps':
        return `${value.toFixed(0)} Mbps`;
      default:
        return value.toString();
    }
  };
  
  // Get color classes based on color prop
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return { bg: 'bg-green-500', text: 'text-green-600' };
      case 'purple':
        return { bg: 'bg-purple-500', text: 'text-purple-600' };
      case 'amber':
        return { bg: 'bg-amber-500', text: 'text-amber-600' };
      case 'red':
        return { bg: 'bg-red-500', text: 'text-red-600' };
      default:
        return { bg: 'bg-blue-500', text: 'text-blue-600' };
    }
  };
  
  const colorClasses = getColorClasses();
  
  // Calculate width percentages for bars
  const calculateWidth = (value: number) => {
    const max = maxValue || Math.max(yourValue, comparisonValue) * 1.2;
    return Math.min(100, (value / max) * 100);
  };
  
  const yourWidth = calculateWidth(yourValue);
  const comparisonWidth = calculateWidth(comparisonValue);
  
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className={`text-xs font-bold ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {improvement >= 0 ? 
            `${Math.abs(improvement).toFixed(0)}% better` : 
            `${Math.abs(improvement).toFixed(0)}% worse`}
        </span>
      </div>
      
      <div className="space-y-3 mt-1">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Your Network</span>
            <span className={`font-medium ${colorClasses.text}`}>{formatValue(yourValue)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full ${colorClasses.bg}`}
              style={{ width: `${yourWidth}%` }}
            ></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Shared Internet</span>
            <span className="font-medium text-gray-600">{formatValue(comparisonValue)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="h-1.5 rounded-full bg-gray-400"
              style={{ width: `${comparisonWidth}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}