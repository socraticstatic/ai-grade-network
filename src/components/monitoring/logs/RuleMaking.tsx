import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, AlertTriangle, Zap, Filter, Settings } from 'lucide-react';
import { Button } from '../../common/Button';
import { AlertRules } from './rules/AlertRules';
import { AutomationRules } from './rules/AutomationRules';
import { FilterRules } from './rules/FilterRules';

interface RuleMakingProps {
  selectedConnection: string;
  timeRange: string;
  defaultTab?: 'alerts' | 'automation' | 'filters';
}

export function RuleMaking({ selectedConnection, timeRange, defaultTab = 'alerts' }: RuleMakingProps) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'alerts' | 'automation' | 'filters'>(defaultTab);

  useEffect(() => {
    const state = location.state as { defaultRuleTab?: typeof activeTab };
    if (state?.defaultRuleTab) {
      setActiveTab(state.defaultRuleTab);
    } else {
      setActiveTab(defaultTab);
    }
  }, [location, defaultTab]);

  const tabs = [
    { id: 'alerts', label: 'Alert Rules', icon: AlertTriangle, description: 'Create rules to trigger alerts' },
    { id: 'automation', label: 'Automation Rules', icon: Zap, description: 'Automate actions based on logs' },
    { id: 'filters', label: 'Filter Rules', icon: Filter, description: 'Create custom log filters' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'alerts':
        return <AlertRules selectedConnection={selectedConnection} />;
      case 'automation':
        return <AutomationRules selectedConnection={selectedConnection} />;
      case 'filters':
        return <FilterRules selectedConnection={selectedConnection} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex">
      {/* Vertical Tabs */}
      <div className="w-[186px] shrink-0 border-r border-fw-secondary pr-4">
        <nav className="space-y-1" aria-label="Rule Types">
          {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`
                  w-full flex items-center px-4 py-3 text-figma-base font-medium text-left tracking-[-0.03em]
                  transition-colors duration-200 border-l-2 no-rounded
                  ${activeTab === tab.id
                    ? 'border-fw-active text-fw-link'
                    : 'border-transparent text-fw-heading hover:bg-fw-wash'
                  }
                `}
              >
                {tab.label}
              </button>
          ))}
        </nav>

        <div className="mt-6 p-4 bg-fw-wash rounded-lg border border-fw-secondary">
          <h4 className="text-figma-sm font-semibold text-fw-body uppercase tracking-wider mb-2">Quick Actions</h4>
          <Button
            variant="secondary"
            size="sm"
            icon={Plus}
            onClick={() => {
              window.addToast({
                type: 'info',
                title: 'Create Rule',
                message: 'Select a rule type from the menu',
                duration: 3000
              });
            }}
            className="w-full"
          >
            New Rule
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 pl-6">
        <div className="bg-fw-base rounded-lg">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
