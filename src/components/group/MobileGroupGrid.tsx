import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, TrendingUp, Activity, Search, Filter, X,
  ArrowLeft, Plus, ChevronRight
} from 'lucide-react';
import { Group } from '../../types/group';
import { StatusBadge } from '../common/StatusBadge';
import { formatMobileDate, truncateText } from '../../utils/mobileHelpers';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileGroupGridProps {
  groups: Group[];
}

export function MobileGroupGrid({ groups }: MobileGroupGridProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || group.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: groups.length,
    active: groups.filter(g => g.status === 'active').length,
    totalConnections: groups.reduce((sum, g) => sum + (g.connectionIds?.length || 0), 0),
    avgUtilization: groups.reduce((sum, g) => {
      const connections = g.connectionIds?.length || 0;
      return sum + (connections > 0 ? 50 : 0);
    }, 0) / (groups.length || 1),
  };

  const resetFilters = () => {
    setStatusFilter('all');
  };

  return (
    <div className="flex flex-col min-h-screen bg-fw-wash">
      {/* Mobile Header */}
      <div className="bg-fw-base border-b border-fw-secondary sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center flex-1">
            <button
              onClick={() => navigate(-1)}
              className="mr-3 p-2 -ml-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-[-0.03em] text-fw-heading">Pools</h1>
              <p className="text-figma-base text-fw-bodyLight">{filteredGroups.length} pools</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="p-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
              aria-label="Filter pools"
            >
              <Filter className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                window.addToast({
                  type: 'info',
                  title: 'Create Pool',
                  message: 'Pool creation is available on desktop',
                  duration: 3000
                });
              }}
              className="p-2 text-white bg-brand-blue hover:bg-brand-darkBlue rounded-full"
              aria-label="Create pool"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fw-bodyLight" />
            <input
              type="text"
              placeholder="Search pools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-fw-secondary rounded-lg focus:ring-2 focus:ring-fw-active focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fw-bodyLight hover:text-fw-body"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-fw-base border-b border-fw-secondary overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-figma-base font-medium text-fw-heading">Filters</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div>
                <label className="block text-figma-base font-medium text-fw-body mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-lg border-fw-secondary shadow-sm focus:border-fw-active focus:ring-fw-active"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-2 flex justify-between">
                <button
                  onClick={resetFilters}
                  className="text-figma-base text-fw-bodyLight hover:text-fw-body"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="px-4 py-2 bg-brand-blue text-white rounded-lg text-figma-base font-medium hover:bg-brand-darkBlue"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Stats */}
      <div className="p-4 bg-fw-base border-b border-fw-secondary">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-fw-heading">{stats.active}</div>
            <div className="text-figma-sm text-fw-bodyLight mt-1">Active</div>
          </div>
          <div className="text-center border-l border-r border-fw-secondary">
            <div className="text-2xl font-bold text-fw-heading">{stats.totalConnections}</div>
            <div className="text-figma-sm text-fw-bodyLight mt-1">Connections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-fw-heading">{stats.avgUtilization.toFixed(0)}%</div>
            <div className="text-figma-sm text-fw-bodyLight mt-1">Avg. Usage</div>
          </div>
        </div>
      </div>

      {/* Pool List */}
      <div className="flex-1 p-4 space-y-3 pb-20">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-fw-secondary mx-auto mb-3" />
            <h3 className="text-lg font-medium text-fw-heading tracking-[-0.03em] mb-1">No pools found</h3>
            <p className="text-fw-bodyLight text-figma-base">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first pool to get started'}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const connectionCount = group.connectionIds?.length || 0;
            const memberCount = group.members?.length || 0;

            return (
              <motion.div
                key={group.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm overflow-hidden"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-fw-heading tracking-[-0.03em] mb-1 truncate">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-figma-base text-fw-bodyLight line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={group.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="flex items-center">
                      <Activity className="h-4 w-4 text-fw-bodyLight mr-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-figma-base font-medium text-fw-heading">
                          {connectionCount}
                        </div>
                        <div className="text-figma-sm text-fw-bodyLight">Connections</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-fw-bodyLight mr-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-figma-base font-medium text-fw-heading">
                          {memberCount}
                        </div>
                        <div className="text-figma-sm text-fw-bodyLight">Members</div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-fw-bodyLight mr-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-figma-base font-medium text-fw-heading">
                          {Math.floor(Math.random() * 40 + 40)}%
                        </div>
                        <div className="text-figma-sm text-fw-bodyLight">Usage</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-fw-secondary">
                    <div className="flex items-center text-figma-sm text-fw-bodyLight">
                      <span>Updated {formatMobileDate(group.updatedAt || new Date())}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-fw-bodyLight" />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
