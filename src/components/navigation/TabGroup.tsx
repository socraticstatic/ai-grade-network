import { ReactNode } from 'react';
import { TabItem } from '../../types/navigation';

interface TabGroupProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function TabGroup({ tabs, activeTab, onChange, className = '' }: TabGroupProps) {
  return (
    <div className={`border-b border-fw-secondary ${className}`}>
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={`
              flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-figma-base no-rounded tracking-[-0.03em]
              transition-colors duration-200
              ${tab.disabled
                ? 'border-transparent text-fw-disabled cursor-not-allowed'
                : activeTab === tab.id
                  ? 'border-fw-active text-fw-link'
                  : 'border-transparent text-fw-heading hover:text-fw-link hover:border-fw-secondary'
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-2 rounded-full px-2.5 py-0.5 text-figma-sm font-medium ${
                  activeTab === tab.id ? 'bg-fw-blue-light text-fw-link' : 'bg-fw-wash text-fw-heading'
                }`}
                aria-label={tab.countLabel}
                title={tab.countLabel}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}