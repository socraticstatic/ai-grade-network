import { ReactNode } from 'react';
import { Sparkles, Target, Settings } from 'lucide-react';

interface BottomPanelProps {
  viewMode: 'assistant' | 'optimize' | 'advanced';
  setViewMode: (mode: 'assistant' | 'optimize' | 'advanced') => void;
  children: ReactNode;
}

export function BottomPanel({ viewMode, setViewMode, children }: BottomPanelProps) {
  const tabs = [
    { id: 'assistant', label: 'Design Assistant', icon: Sparkles },
    { id: 'optimize', label: 'AI Optimize', icon: Target },
    { id: 'advanced', label: 'Advanced', icon: Settings },
  ] as const;

  return (
    <div className="bg-white border-t-2 border-gray-200">
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                viewMode === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
