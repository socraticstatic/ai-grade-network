import { useState } from 'react';
import { FileText, Calendar, BarChart2, Users } from 'lucide-react';
import { VerticalTabGroup } from '../navigation/VerticalTabGroup';
import { TabItem } from '../../types/navigation';
import { ReportTemplates } from './reporting/ReportTemplates';
import { ScheduleSettings } from './reporting/ScheduleSettings';
import { MetricsConfiguration } from './reporting/MetricsConfiguration';
import { DistributionLists } from './reporting/DistributionLists';

export function ReportingSettings() {
  const [activeView, setActiveView] = useState<'templates' | 'schedule' | 'metrics' | 'distribution'>('templates');

  const tabs: TabItem[] = [
    { id: 'templates', label: 'Templates', icon: <FileText className="h-5 w-5 mr-2" /> },
    { id: 'schedule', label: 'Schedule', icon: <Calendar className="h-5 w-5 mr-2" /> },
    { id: 'metrics', label: 'Metrics', icon: <BarChart2 className="h-5 w-5 mr-2" /> },
    { id: 'distribution', label: 'Distribution', icon: <Users className="h-5 w-5 mr-2" /> }
  ];

  return (
    <div className="p-6">
      <div className="flex">
        <VerticalTabGroup
          tabs={tabs}
          activeTab={activeView}
          onChange={(tab) => setActiveView(tab as typeof activeView)}
        />

        <div className="flex-1 pl-6">
          {activeView === 'templates' && <ReportTemplates />}
          {activeView === 'schedule' && <ScheduleSettings />}
          {activeView === 'metrics' && <MetricsConfiguration />}
          {activeView === 'distribution' && <DistributionLists />}
        </div>
      </div>
    </div>
  );
}
