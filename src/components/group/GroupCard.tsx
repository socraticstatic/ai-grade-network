import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minimize2 } from 'lucide-react';
import { Group } from '../../types/group';
import { motion } from 'framer-motion';
import {
  GroupCardHeader,
  GroupCardMetrics,
  GroupCardFooter,
  GroupCardProgress,
  GroupCardStatus,
  GroupCardInfo
} from './card';
import { GroupOverflowMenu } from './GroupOverflowMenu';
import { IconButton } from '../common/IconButton';

interface GroupCardProps {
  group: Group;
  onDelete: (id: string) => void;
  isMinimized?: boolean;
}

export function GroupCard({ group, onDelete, isMinimized = false }: GroupCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(!isMinimized);

  useEffect(() => {
    setIsExpanded(!isMinimized);
  }, [isMinimized]);

  const handleManageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/groups/${group.id}`);
  };

  const handleCardClick = () => {
    navigate(`/groups/${group.id}`);
  };

  return (
    <motion.div
      className="relative bg-fw-base rounded-[16px] border border-fw-secondary shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:translate-y-[-2px] cursor-pointer flex flex-col"
      style={{ minHeight: isMinimized ? 'auto' : '562px' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
    >
      {isMinimized ? (
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="p-2 bg-fw-wash rounded-lg">
              <svg className="h-4 w-4 text-fw-link" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-figma-base font-medium text-fw-heading truncate">{group.name}</h3>
              <p className="text-figma-sm text-fw-bodyLight truncate">{group.description}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            className="p-1.5 text-fw-disabled hover:text-fw-body hover:bg-fw-wash rounded-full transition-colors"
            aria-label="Expand"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      ) : (
        <>
          <GroupCardHeader group={group} onDelete={onDelete}>
            <div className="flex items-center space-x-2">
              <IconButton
                icon={<Minimize2 className="h-4 w-4" />}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                variant="ghost"
                size="sm"
                title="Minimize"
              />
              <GroupOverflowMenu group={group} onDelete={onDelete} />
            </div>
          </GroupCardHeader>

          {/* Separator */}
          <div className="mx-6 border-t border-fw-secondary" />

          <div className="px-6 py-4 space-y-4">
            {/* Performance Progress Bar */}
            <GroupCardProgress group={group} />

            {/* Pool Metrics (stat boxes + utilization row) */}
            <GroupCardMetrics group={group} />

            {/* Info rows (Uptime, Location, Latency, Created) + Tags */}
            <GroupCardInfo group={group} />
          </div>

          {/* Separator */}
          <div className="mx-6 border-t border-fw-secondary" />

          {/* Status */}
          <GroupCardStatus group={group} />

          {/* Action - no separator per Figma, button pushed to bottom via mt-auto */}
          <GroupCardFooter onManageClick={handleManageClick} />
        </>
      )}
    </motion.div>
  );
}
