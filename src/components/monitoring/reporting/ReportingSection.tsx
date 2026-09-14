import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { StandardReports } from './StandardReports';
import { CustomTemplates } from './CustomTemplates';
import { ScheduledReports } from './ScheduledReports';
import { ComplianceReports } from './ComplianceReports';
import { CustomReports } from './CustomReports';
import { FileText, Calendar, BookTemplate as Template, ShieldCheck, LayoutGrid, Sliders } from 'lucide-react';

type ReportTab = 'overview' | 'standard' | 'templates' | 'scheduled' | 'compliance' | 'custom';

interface ReportingProps {
  selectedConnection: string;
  timeRange: string;
  defaultTab?: ReportTab;
}

export function ReportingSection({ selectedConnection, timeRange, defaultTab = 'overview' }: ReportingProps) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ReportTab>(defaultTab);

  useEffect(() => {
    const state = location.state as { defaultReportTab?: ReportTab };
    if (state?.defaultReportTab) {
      setActiveTab(state.defaultReportTab);
    } else {
      setActiveTab(defaultTab);
    }
  }, [location, defaultTab]);

  // Figma tab order: History, Standard Reports, Compliance, Templates, Scheduled, Custom
  // Figma layout: vertical sidebar nav on left, content on right, separated by vertical line
  const tabs = [
    { id: 'overview' as const, label: 'History', icon: LayoutGrid },
    { id: 'standard' as const, label: 'Standard Reports', icon: FileText },
    { id: 'compliance' as const, label: 'Compliance', icon: ShieldCheck },
    { id: 'templates' as const, label: 'Templates', icon: Template },
    { id: 'scheduled' as const, label: 'Scheduled', icon: Calendar },
    { id: 'custom' as const, label: 'Custom', icon: Sliders }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <StandardReports />;
      case 'standard':
        return <StandardReports />;
      case 'templates':
        return <CustomTemplates />;
      case 'scheduled':
        return <ScheduledReports />;
      case 'compliance':
        return <ComplianceReports />;
      case 'custom':
        return <CustomReports />;
      default:
        return null;
    }
  };

  return (
    <div className="flex">
      {/* Figma: Vertical sidebar nav - border-l-2 active state, icon 20x20 + text 14px w500 */}
      <div className="w-[186px] shrink-0 border-r border-fw-secondary pr-4">
        <nav className="space-y-1" aria-label="Report Types">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center text-left gap-2 px-4 py-3 text-figma-base font-medium no-rounded
                  transition-colors duration-200 border-l-2
                  ${isActive
                    ? 'border-fw-active text-fw-link'
                    : 'border-transparent text-fw-heading hover:text-fw-link hover:border-fw-secondary'
                  }
                `}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content Area */}
      <div className="flex-1 pl-6">
        {renderContent()}
      </div>
    </div>
  );
}
