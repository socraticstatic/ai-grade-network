import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Filter } from 'lucide-react';
import { Button } from '../../common/Button';
import { FilterRules } from './rules/FilterRules';

interface LogRuleMakingProps {
  selectedConnection: string;
  timeRange: string;
}

export function LogRuleMaking({ selectedConnection, timeRange }: LogRuleMakingProps) {
  const location = useLocation();

  return (
    <div className="flex">
      {/* Vertical Tabs */}
      <div className="w-[186px] shrink-0 border-r border-fw-secondary pr-4">
        <nav className="space-y-1" aria-label="Rule Types">
          <button
            className="w-full flex items-center px-4 py-3 text-figma-base font-medium text-left tracking-[-0.03em] border-l-2 no-rounded border-fw-active text-fw-link"
          >
            <Filter className="h-5 w-5 mr-3 text-fw-link" />
            Filter Rules
          </button>
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
                title: 'Create Filter',
                message: 'Create a new log filter rule',
                duration: 3000
              });
            }}
            className="w-full"
          >
            New Filter
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 pl-6">
        <div className="bg-fw-base rounded-lg">
          <FilterRules selectedConnection={selectedConnection} />
        </div>
      </div>
    </div>
  );
}
