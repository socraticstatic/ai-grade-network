import { ChevronRight, Network, Server, Cable } from 'lucide-react';

interface BreadcrumbProps {
  selectedDevice: string | null;
  selectedPort: string | null;
  selectedCircuit: string | null;
  onNavigate: (level: 'rack' | 'device' | 'port') => void;
}

export function Breadcrumb({ selectedDevice, selectedPort, selectedCircuit, onNavigate }: BreadcrumbProps) {
  return (
    <div className="flex items-center space-x-2 text-sm">
      <button
        onClick={() => onNavigate('rack')}
        className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        type="button"
      >
        <Network className="h-4 w-4 mr-1" />
        <span>Rack View</span>
      </button>

      {selectedDevice && (
        <>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => onNavigate('device')}
            className={`flex items-center transition-colors ${
              !selectedPort && !selectedCircuit
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            type="button"
          >
            <Server className="h-4 w-4 mr-1" />
            <span>Device Details</span>
          </button>
        </>
      )}

      {selectedPort && (
        <>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => onNavigate('port')}
            className="flex items-center text-blue-600 font-medium"
            type="button"
          >
            <Cable className="h-4 w-4 mr-1" />
            <span>Port Details</span>
          </button>
        </>
      )}

      {selectedCircuit && (
        <>
          <ChevronRight className="h-4 w-4 text-gray-400" />
          <span className="flex items-center text-blue-600 font-medium">
            <Cable className="h-4 w-4 mr-1" />
            <span>Circuit Details</span>
          </span>
        </>
      )}
    </div>
  );
}
