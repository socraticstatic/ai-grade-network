import { Info, Server } from 'lucide-react';
import { useState } from 'react';

interface IPEInfoTooltipProps {
  className?: string;
  variant?: 'default' | 'connection' | 'link';
}

export function IPEInfoTooltip({ className = '', variant = 'default' }: IPEInfoTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getContent = () => {
    switch (variant) {
      case 'connection':
        return {
          title: 'Physical IPE Assignment',
          description: 'Your virtual connection runs on a physical Infrastructure Provider Edge (IPE) Router located at a data center. The IPE provides the actual network capacity and connects to cloud provider on-ramps.',
          example: 'Primary IPE: Where your connection traffic flows | Secondary IPE: Backup for redundancy'
        };
      case 'link':
        return {
          title: 'Link IPE Association',
          description: 'Each virtual Link (VLAN) is associated with a specific physical IPE router. This determines the physical path your traffic takes and which cloud providers are accessible.',
          example: 'IPE: NYC-2 means this Link physically connects through the IPE router at the New York data center'
        };
      default:
        return {
          title: 'What is an IPE?',
          description: 'Infrastructure Provider Edge (IPE) Router is physical network hardware located at data center facilities. IPEs provide the actual bandwidth capacity and connect to cloud provider networks.',
          example: 'Think of IPE as the physical bridge between your virtual network and cloud providers'
        };
    }
  };

  const content = getContent();

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className="cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Info className="h-4 w-4 text-fw-bodyLight hover:text-fw-link transition-colors" />
      </div>

      {showTooltip && (
        <div className="absolute z-50 left-0 top-full mt-2 w-80 p-4 bg-fw-gray-900 text-fw-linkPrimary text-figma-sm rounded-lg shadow-xl">
          <div className="flex items-start space-x-2 mb-2">
            <Server className="h-5 w-5 text-fw-link flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-1">{content.title}</div>
              <div className="text-fw-gray-300 text-figma-sm leading-relaxed mb-2">
                {content.description}
              </div>
              {content.example && (
                <div className="text-fw-gray-400 text-figma-sm italic border-t border-fw-gray-700 pt-2 mt-2">
                  {content.example}
                </div>
              )}
            </div>
          </div>
          <div className="absolute -top-1 left-4 w-2 h-2 bg-fw-gray-900 transform rotate-45" />
        </div>
      )}
    </div>
  );
}
