import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, TrendingUp, AlertCircle, Search, Filter,
  X, ArrowLeft, Menu, ChevronRight, Plus
} from 'lucide-react';
import { Connection } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { formatMobileBandwidth } from '../../utils/mobileHelpers';
import { CloudLegs } from './CloudLegs';
import { CardMetaChips } from './facts/cardFields';
import { getUtilization } from '../../utils/connectionFacts';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { useStore } from '../../store/useStore';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileConnectionGridProps {
  connections: Connection[];
}

export function MobileConnectionGrid({ connections }: MobileConnectionGridProps) {
  const navigate = useNavigate();
  const hubs = useStore(state => state.hubs);
  const { visibleColumns: cardFields } = useColumnVisibility('conn-card');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredConnections = connections.filter(conn => {
    const matchesSearch = conn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (conn.provider ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || conn.status === statusFilter;
    const matchesType = typeFilter === 'all' || conn.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: connections.length,
    active: connections.filter(c => c.status === 'active').length,
    provisioning: connections.filter(c => c.status === 'provisioning').length,
    avgUtilization: connections.reduce((sum, c) => sum + (c.utilization || 0), 0) / connections.length || 0,
  };

  const resetFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
  };

  return (
    <div className="flex flex-col bg-gradient-to-b from-fw-wash to-white">
      {/* Elegant Search Header */}
      <div className="bg-fw-base sticky top-0 z-10 shadow-sm">
        <div className="px-4 pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-fw-bodyLight" />
            <input
              type="text"
              placeholder="Search connections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-fw-wash border-0 rounded-xl text-fw-heading placeholder-fw-bodyLight focus:ring-2 focus:ring-brand-blue focus:bg-fw-base transition-all"
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-fw-bodyLight hover:text-fw-body hover:bg-fw-neutral rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-fw-bodyLight hover:text-brand-blue hover:bg-brand-lightBlue rounded-full transition-colors"
                aria-label="Filter connections"
              >
                <Filter className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Elegant Filters Panel */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-fw-base border-b border-fw-secondary overflow-hidden shadow-sm"
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-semibold text-fw-heading">Filter Connections</h3>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="p-1.5 text-fw-bodyLight hover:text-fw-body hover:bg-fw-neutral rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-figma-base font-medium text-fw-body mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-fw-secondary bg-fw-wash text-fw-heading focus:border-brand-blue focus:ring-2 focus:ring-brand-blue focus:bg-fw-base transition-all"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="provisioning">Provisioning</option>
                    <option value="deprovisioning">Deprovisioning</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                <div>
                  <label className="block text-figma-base font-medium text-fw-body mb-2">
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-fw-secondary bg-fw-wash text-fw-heading focus:border-brand-blue focus:ring-2 focus:ring-brand-blue focus:bg-fw-base transition-all"
                  >
                    <option value="all">All Types</option>
                    <option value="E-Line">E-Line</option>
                    <option value="E-LAN">E-LAN</option>
                    <option value="E-Access">E-Access</option>
                    <option value="Hub">Hub</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={resetFilters}
                  className="flex-1 px-4 py-2.5 text-fw-body bg-fw-neutral hover:bg-fw-neutral rounded-xl text-figma-base font-medium transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-brand-blue to-brand-darkBlue text-white rounded-xl text-figma-base font-medium hover:shadow-lg transition-all"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegant Connection List */}
      <div className="p-4 space-y-3 pb-24">
        {filteredConnections.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 px-6"
          >
            <div className="bg-gradient-to-br from-fw-neutral to-fw-neutral rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Activity className="h-10 w-10 text-fw-bodyLight" />
            </div>
            <h3 className="text-xl font-bold text-fw-heading mb-2">No connections found</h3>
            <p className="text-fw-bodyLight text-figma-base mb-6">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first connection to get started'}
            </p>
            {(!searchTerm && statusFilter === 'all' && typeFilter === 'all') && (
              <button
                onClick={() => navigate('/create')}
                className="px-6 py-3 bg-gradient-to-r from-brand-blue to-brand-darkBlue text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                Create Connection
              </button>
            )}
          </motion.div>
        ) : (
          filteredConnections.map((connection, index) => (
            <motion.div
              key={connection.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              className="bg-fw-base rounded-2xl border border-fw-secondary shadow-sm hover:shadow-md overflow-hidden transition-all active:scale-[0.98]"
              onClick={() => navigate(`/connections/${connection.id}`)}
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-fw-heading mb-1 truncate">
                      {connection.name}
                    </h3>
                    <div className="text-figma-base text-fw-bodyLight truncate flex items-center gap-1.5">
                      <CloudLegs connection={connection} withLogos logoSize={20} className="text-figma-sm" />
                      <span className="text-fw-bodyLight">•</span>
                      <span className="truncate">{connection.type}</span>
                    </div>
                  </div>
                  <StatusBadge status={connection.status} size="sm" />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3">
                    <div className="flex items-center mb-1">
                      <Activity className="h-4 w-4 text-fw-link mr-1.5" />
                      <span className="text-figma-sm font-medium text-fw-linkHover">Bandwidth</span>
                    </div>
                    <div className="text-lg font-bold text-fw-heading">
                      {formatMobileBandwidth(connection.bandwidth)}
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3">
                    <div className="flex items-center mb-1">
                      <TrendingUp className="h-4 w-4 text-fw-success mr-1.5" />
                      <span className="text-figma-sm font-medium text-fw-success">Usage</span>
                    </div>
                    <div className="text-lg font-bold text-fw-heading">
                      {getUtilization(connection)}%
                    </div>
                  </div>
                </div>

                {/* Facts — same configurable set as desktop cards */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-fw-secondary">
                  <CardMetaChips
                    connection={connection}
                    hubs={hubs}
                    visibleIds={cardFields}
                    variant="large"
                    navigate={navigate}
                    className="min-w-0 flex-1"
                  />
                  <ChevronRight className="h-5 w-5 text-fw-bodyLight shrink-0" />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
