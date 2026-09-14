import { AttIcon } from '../icons/AttIcon';

interface ConnectionTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hubCount?: number;
  connectionCount?: number;
  groupCount?: number;
}

export function ConnectionTabs({ activeTab, onTabChange, hubCount, connectionCount, groupCount }: ConnectionTabsProps) {
  const orderedTabs = [
    { id: 'marketplace',   label: 'Marketplace',    icon: <AttIcon name="shopping-bag" className="h-6 w-6 mr-2" /> },
    { id: 'hubs', label: 'Connection Hubs',  icon: <AttIcon name="hub"  className="h-6 w-6 mr-2" />, count: hubCount },
    { id: 'connections',   label: 'Connections',    icon: <AttIcon name="cloud"        className="h-6 w-6 mr-2" />, count: connectionCount },
    { id: 'groups',        label: 'Pools',          icon: <AttIcon name="person-group" className="h-6 w-6 mr-2" />, count: groupCount },
    { id: 'control-center',label: 'Insights',       icon: <AttIcon name="smart-meter"  className="h-6 w-6 mr-2" /> },
  ];

  return (
    <div className="border-b border-fw-secondary">
      <nav className="-mb-px flex space-x-8" data-onboarding="marketplace">
        {orderedTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center whitespace-nowrap pt-1 pb-2 px-1 border-b-2 font-medium text-figma-base no-rounded tracking-[-0.03em] transition-all duration-200
              ${activeTab === tab.id
                ? 'border-fw-active text-fw-link'
                : 'border-transparent text-fw-heading hover:text-fw-body hover:border-fw-secondary'
              }
            `}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full px-1.5 text-[10px] font-medium ${
                activeTab === tab.id ? 'bg-fw-primary text-white' : 'bg-fw-neutral text-fw-heading'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}