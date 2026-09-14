import React from 'react';
import { BrainCircuit as Circuit, Cable, Server } from 'lucide-react';
import { ViewMode } from '../CircuitTypes';

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onModeChange: (mode: 'logical' | 'physical' | 'rack') => void;
}

export function ViewModeSelector({ currentMode, onModeChange }: ViewModeSelectorProps) {
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-lg shadow-lg flex divide-x divide-gray-200">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onModeChange('logical');
        }}
        className={`px-4 py-2 text-sm font-medium flex items-center ${
          currentMode.mode === 'logical' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
        }`}
        type="button"
      >
        <Circuit className="h-4 w-4 mr-1.5" />
        Logical View
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onModeChange('physical');
        }}
        className={`px-4 py-2 text-sm font-medium flex items-center ${
          currentMode.mode === 'physical' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
        }`}
        type="button"
      >
        <Cable className="h-4 w-4 mr-1.5" />
        Physical View
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onModeChange('rack');
        }}
        className={`px-4 py-2 text-sm font-medium flex items-center ${
          currentMode.mode === 'rack' ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
        }`}
        type="button"
      >
        <Server className="h-4 w-4 mr-1.5" />
        Rack View
      </button>
    </div>
  );
}