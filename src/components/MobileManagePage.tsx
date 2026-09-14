import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Network, Users, Grid, ShoppingBag, Plus, Bell, User,
  TrendingUp, Activity, Zap
} from 'lucide-react';
import { Connection } from '../types';
import { Group } from '../types/group';
import { MobileConnectionGrid } from './connection/MobileConnectionGrid';
import { MobileGroupGrid } from './group/MobileGroupGrid';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileManagePageProps {
  connections: Connection[];
  groups: Group[];
  activeTab: 'connections' | 'groups' | 'control-center' | 'marketplace';
  onTabChange: (tab: 'connections' | 'groups' | 'control-center' | 'marketplace') => void;
}

export function MobileManagePage({ connections, groups, activeTab, onTabChange }: MobileManagePageProps) {
  const navigate = useNavigate();

  const stats = {
    connections: connections.length,
    activeConnections: connections.filter(c => c.status === 'active').length,
    groups: groups.length,
    avgUtilization: connections.reduce((sum, c) => sum + (c.utilization || 0), 0) / (connections.length || 1),
  };

  const tabs = [
    { id: 'connections' as const, label: 'Connections', icon: Network, count: stats.connections },
    { id: 'groups' as const, label: 'Pools', icon: Users, count: stats.groups },
    { id: 'control-center' as const, label: 'Control', icon: Grid, count: 0 },
    { id: 'marketplace' as const, label: 'Market', icon: ShoppingBag, count: 0 },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'connections':
        return <MobileConnectionGrid connections={connections} />;
      case 'groups':
        return <MobileGroupGrid groups={groups} />;
      case 'control-center':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <div className="bg-gradient-to-br from-brand-blue to-brand-darkBlue rounded-full p-6 mb-4">
              <Grid className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-2">Control Center</h3>
            <p className="text-figma-base font-medium text-fw-bodyLight mb-6 max-w-sm">
              The Control Center is optimized for desktop. Switch to a larger screen for the full experience.
            </p>
            <button
              onClick={() => onTabChange('connections')}
              className="px-6 py-3 bg-fw-active text-white rounded-full font-medium hover:bg-brand-darkBlue transition-colors"
            >
              View Connections
            </button>
          </div>
        );
      case 'marketplace':
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
            <div className="bg-gradient-to-br from-fw-success to-fw-success rounded-full p-6 mb-4">
              <ShoppingBag className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-2">Marketplace</h3>
            <p className="text-figma-base font-medium text-fw-bodyLight mb-6 max-w-sm">
              Browse solutions and integrations on desktop for the best experience.
            </p>
            <button
              onClick={() => onTabChange('connections')}
              className="px-6 py-3 bg-fw-active text-white rounded-full font-medium hover:bg-brand-darkBlue transition-colors"
            >
              View Connections
            </button>
          </div>
        );
      default:
        return <MobileConnectionGrid connections={connections} />;
    }
  };

  // Only show header and stats for connections/groups tabs
  const showHeader = activeTab === 'connections' || activeTab === 'groups';

  return (
    <div className="flex flex-col min-h-screen bg-fw-wash">
      {showHeader && (
        <>
          {/* Elegant Header */}
          <div className="bg-fw-base border-b border-fw-secondary shadow-sm">
            <div className="px-4 pt-6 pb-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em] mb-1">
                    Network Management
                  </h1>
                  <p className="text-figma-sm font-medium text-fw-bodyLight">
                    {activeTab === 'connections' ? 'Your connections at a glance' : 'Manage your pools'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigate('/notifications')}
                    className="relative p-3 text-fw-bodyLight hover:text-fw-heading rounded-full hover:bg-fw-neutral transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-fw-errorLight0 rounded-full"></span>
                  </button>
                  <button
                    onClick={() => navigate('/profile')}
                    className="p-3 text-fw-bodyLight hover:text-fw-heading rounded-full hover:bg-fw-neutral transition-colors"
                    aria-label="Profile"
                  >
                    <User className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Quick Stats - Only for connections tab */}
              {activeTab === 'connections' && (
                <div className="grid grid-cols-3 gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-fw-wash rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Activity className="h-4 w-4 text-fw-link" />
                    </div>
                    <div className="text-figma-lg font-bold text-fw-heading">{stats.activeConnections}</div>
                    <div className="text-figma-sm text-fw-bodyLight font-medium">Active</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-fw-wash rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <TrendingUp className="h-4 w-4 text-fw-success" />
                    </div>
                    <div className="text-figma-lg font-bold text-fw-heading">{stats.avgUtilization.toFixed(0)}%</div>
                    <div className="text-figma-sm text-fw-bodyLight font-medium">Usage</div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-fw-wash rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Zap className="h-4 w-4 text-fw-link" />
                    </div>
                    <div className="text-figma-lg font-bold text-fw-heading">{stats.connections}</div>
                    <div className="text-figma-sm text-fw-bodyLight font-medium">Total</div>
                  </motion.div>
                </div>
              )}
            </div>

            {/* Elegant Tab Navigation */}
            <div className="px-2 pb-2">
              <div className="flex bg-fw-neutral rounded-xl p-1">
                {tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className="relative flex-1 flex flex-col items-center py-3 px-2 rounded-lg transition-all duration-200"
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-fw-base rounded-lg shadow-sm"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <div className="relative z-10">
                      <tab.icon className={`h-5 w-5 mb-1 mx-auto transition-colors ${
                        activeTab === tab.id ? 'text-brand-blue' : 'text-fw-bodyLight'
                      }`} />
                      <span className={`text-figma-sm font-medium transition-colors ${
                        activeTab === tab.id ? 'text-fw-heading' : 'text-fw-bodyLight'
                      }`}>
                        {tab.label}
                      </span>
                      {tab.count > 0 && (
                        <span className={`ml-1 text-figma-sm ${
                          activeTab === tab.id ? 'text-fw-bodyLight' : 'text-fw-bodyLight'
                        }`}>
                          ({tab.count})
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className={showHeader ? '' : 'min-h-screen'}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* Floating Action Button */}
      {activeTab === 'connections' && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
          onClick={() => navigate('/create')}
          className="fixed bottom-6 right-20 w-14 h-14 bg-gradient-to-br from-brand-blue to-brand-darkBlue text-white rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center z-40"
          aria-label="Create connection"
        >
          <Plus className="h-6 w-6" />
        </motion.button>
      )}
    </div>
  );
}
