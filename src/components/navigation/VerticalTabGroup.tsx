import { TabItem } from '../../types/navigation';

interface VerticalTabGroupProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function VerticalTabGroup({ tabs, activeTab, onChange, className = '' }: VerticalTabGroupProps) {
  // Group tabs by category
  const groupedTabs: Record<string, TabItem[]> = {};

  tabs.forEach(tab => {
    const category = tab.category || 'default';
    if (!groupedTabs[category]) {
      groupedTabs[category] = [];
    }
    groupedTabs[category].push(tab);
  });

  return (
    <div className={`w-[186px] shrink-0 border-r border-fw-secondary pr-4 ${className}`}>
      <nav className="space-y-1" aria-label="Tabs">
        {Object.entries(groupedTabs).map(([category, categoryTabs]) => (
          <div key={category} className="mb-4">
            {category !== 'default' && (
              <h3 className="text-figma-sm font-medium text-fw-bodyLight uppercase tracking-wider mb-2 px-4">
                {category}
              </h3>
            )}
            <div className="space-y-1">
              {categoryTabs.map((tab) => {
                return (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && onChange(tab.id)}
                    disabled={tab.disabled}
                    className={`
                      w-full flex items-center text-left px-4 py-3 text-figma-base font-medium no-rounded tracking-[-0.03em]
                      transition-colors duration-200 border-l-2
                      ${tab.disabled
                        ? 'text-fw-bodyLight cursor-not-allowed border-transparent'
                        : activeTab === tab.id
                          ? 'border-fw-active text-fw-link'
                          : 'border-transparent text-fw-heading hover:text-fw-link hover:border-fw-secondary'
                      }
                    `}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`ml-auto rounded-full px-2.5 py-0.5 text-figma-sm font-medium ${
                        activeTab === tab.id ? 'bg-fw-accent text-fw-link' : 'bg-fw-neutral text-fw-bodyLight'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
