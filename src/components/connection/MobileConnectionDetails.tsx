import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Activity, TrendingUp, Clock, MapPin, Globe,
  ChevronDown, ChevronUp, Menu, MoreVertical, Play, Pause,
  Trash2, Edit2, Network, Settings, DollarSign
} from 'lucide-react';
import { Connection } from '../../types';
import { displayStatus } from '../../utils/lmccDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { CloudLegs } from './CloudLegs';
import { getUtilization } from '../../utils/connectionFacts';
import { formatMobileDate, formatMobileBandwidth } from '../../utils/mobileHelpers';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';

interface MobileConnectionDetailsProps {
  connection: Connection;
}

export function MobileConnectionDetails({ connection }: MobileConnectionDetailsProps) {
  const navigate = useNavigate();
  const updateConnection = useStore(state => state.updateConnection);
  const removeConnection = useStore(state => state.removeConnection);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    details: true,
    performance: true,
    configuration: false,
    billing: false,
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDelete = () => {
    removeConnection(connection.id);
    window.addToast({
      type: 'success',
      title: 'Connection Deleted',
      message: `${connection.name} has been deleted`,
      duration: 3000
    });
    navigate('/manage');
  };

  const handleToggleStatus = () => {
    const newStatus = connection.status === 'active' ? 'inactive' : 'active';
    updateConnection({
      ...connection,
      status: newStatus
    });
    window.addToast({
      type: 'info',
      title: 'Status Updated',
      message: `Connection ${newStatus}`,
      duration: 2000
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-fw-wash">
      {/* Mobile Header */}
      <div className="bg-fw-base border-b border-fw-secondary sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center flex-1 min-w-0">
            <button
              onClick={() => navigate(-1)}
              className="mr-3 p-2 -ml-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-fw-heading truncate">{connection.name}</h1>
              <div className="text-figma-base text-fw-bodyLight truncate flex items-center gap-1.5">
                <CloudLegs connection={connection} withLogos logoSize={20} className="text-figma-sm" />
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-neutral ml-2"
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-4 pb-3 flex items-center justify-between">
          {connection.configuration?.isLmcc ? (
            <span className="inline-flex items-center gap-1.5 text-figma-sm font-medium text-fw-heading">
              <span className={`h-2 w-2 rounded-full ${connection.status === 'Active' ? 'bg-fw-success' : connection.status === 'Provisioning' || connection.status === 'Pending' ? 'bg-fw-active animate-pulse' : 'bg-fw-disabled'}`} />
              {displayStatus(connection)}
            </span>
          ) : (
            <StatusBadge status={connection.status} size="md" />
          )}
          <span className="text-figma-base text-fw-bodyLight">
            Updated {formatMobileDate(connection.createdAt || new Date())}
          </span>
        </div>
      </div>

      {/* Actions Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-fw-base border-b border-fw-secondary overflow-hidden"
          >
            <div className="p-4 space-y-2">
              {/* AWS has no Inactive state — Delete is the only removal action */}
              {connection.provider !== 'AWS' && (
                <button
                  onClick={() => {
                    handleToggleStatus();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center p-3 text-left text-fw-body hover:bg-fw-wash rounded-lg"
                >
                  {connection.status === 'active' ? (
                    <Pause className="h-5 w-5 text-fw-bodyLight mr-3" />
                  ) : (
                    <Play className="h-5 w-5 text-fw-bodyLight mr-3" />
                  )}
                  <span>{connection.status === 'active' ? 'Pause Connection' : 'Activate Connection'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  navigate(`/connections/${connection.id}/edit`);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center p-3 text-left text-fw-body hover:bg-fw-wash rounded-lg"
              >
                <Edit2 className="h-5 w-5 text-fw-bodyLight mr-3" />
                <span>Edit Connection</span>
              </button>

              <button
                onClick={() => {
                  navigate('/monitor', { state: { selectedConnection: connection.id } });
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center p-3 text-left text-fw-body hover:bg-fw-wash rounded-lg"
              >
                <Activity className="h-5 w-5 text-fw-bodyLight mr-3" />
                <span>View Monitoring</span>
              </button>

              <button
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center p-3 text-left text-fw-error hover:bg-fw-errorLight rounded-lg"
              >
                <Trash2 className="h-5 w-5 mr-3" />
                <span>Delete Connection</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-fw-base p-4 rounded-lg border border-fw-secondary shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-figma-sm font-medium text-fw-bodyLight">Bandwidth</h3>
              <Activity className="h-4 w-4 text-brand-blue" />
            </div>
            <div className="text-xl font-semibold text-fw-heading">
              {formatMobileBandwidth(connection.bandwidth)}
            </div>
          </div>

          <div className="bg-fw-base p-4 rounded-lg border border-fw-secondary shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-figma-sm font-medium text-fw-bodyLight">Utilization</h3>
              <TrendingUp className="h-4 w-4 text-fw-success" />
            </div>
            <div className="text-xl font-semibold text-fw-heading">
              {getUtilization(connection)}%
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm overflow-hidden">
          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('details')}
          >
            <div className="flex items-center">
              <Network className="h-5 w-5 text-brand-blue mr-2" />
              <h3 className="text-base font-medium text-fw-heading">Connection Details</h3>
            </div>
            {expandedSections.details ? (
              <ChevronUp className="h-5 w-5 text-fw-bodyLight" />
            ) : (
              <ChevronDown className="h-5 w-5 text-fw-bodyLight" />
            )}
          </div>

          <AnimatePresence>
            {expandedSections.details && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex justify-between py-2 border-b border-fw-secondary">
                    <span className="text-figma-base text-fw-bodyLight">Type</span>
                    <span className="text-figma-base font-medium text-fw-heading">{connection.type}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-fw-secondary">
                    <span className="text-figma-base text-fw-bodyLight">Provider</span>
                    <span className="text-figma-base font-medium text-fw-heading">{connection.provider}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-fw-secondary">
                    <span className="text-figma-base text-fw-bodyLight">Location</span>
                    <span className="text-figma-base font-medium text-fw-heading">{connection.location}</span>
                  </div>
                  {connection.vlan && (
                    <div className="flex justify-between py-2 border-b border-fw-secondary">
                      <span className="text-figma-base text-fw-bodyLight">VLAN</span>
                      <span className="text-figma-base font-medium text-fw-heading">{connection.vlan}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2">
                    <span className="text-figma-base text-fw-bodyLight">Created</span>
                    <span className="text-figma-base font-medium text-fw-heading">
                      {new Date(connection.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Performance Section */}
        <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm overflow-hidden">
          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('performance')}
          >
            <div className="flex items-center">
              <TrendingUp className="h-5 w-5 text-brand-blue mr-2" />
              <h3 className="text-base font-medium text-fw-heading">Performance</h3>
            </div>
            {expandedSections.performance ? (
              <ChevronUp className="h-5 w-5 text-fw-bodyLight" />
            ) : (
              <ChevronDown className="h-5 w-5 text-fw-bodyLight" />
            )}
          </div>

          <AnimatePresence>
            {expandedSections.performance && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="px-4 pb-4">
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-fw-secondary">
                      <span className="text-figma-base text-fw-bodyLight">Latency</span>
                      <span className="text-figma-base font-medium text-fw-heading">
                        {connection.latency || 'N/A'} ms
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-fw-secondary">
                      <span className="text-figma-base text-fw-bodyLight">Packet Loss</span>
                      <span className="text-figma-base font-medium text-fw-heading">
                        {connection.packetLoss || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-figma-base text-fw-bodyLight">Uptime</span>
                      <span className="text-figma-base font-medium text-fw-heading">99.9%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/monitor', { state: { selectedConnection: connection.id } })}
                    className="w-full mt-4 px-4 py-2 bg-fw-neutral text-fw-body rounded-lg text-figma-base font-medium hover:bg-fw-neutral"
                  >
                    View Detailed Metrics
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Configuration Section */}
        <div className="bg-fw-base rounded-lg border border-fw-secondary shadow-sm overflow-hidden">
          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => toggleSection('configuration')}
          >
            <div className="flex items-center">
              <Settings className="h-5 w-5 text-brand-blue mr-2" />
              <h3 className="text-base font-medium text-fw-heading">Configuration</h3>
            </div>
            {expandedSections.configuration ? (
              <ChevronUp className="h-5 w-5 text-fw-bodyLight" />
            ) : (
              <ChevronDown className="h-5 w-5 text-fw-bodyLight" />
            )}
          </div>

          <AnimatePresence>
            {expandedSections.configuration && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="px-4 pb-4">
                  <p className="text-figma-base text-fw-bodyLight mb-3">
                    Advanced configuration options are available on desktop.
                  </p>
                  <button
                    onClick={() => {
                      window.addToast({
                        type: 'info',
                        title: 'Desktop Only',
                        message: 'This feature is optimized for desktop viewing',
                        duration: 3000
                      });
                    }}
                    className="w-full px-4 py-2 bg-fw-neutral text-fw-body rounded-lg text-figma-base font-medium hover:bg-fw-neutral"
                  >
                    View on Desktop
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDeleteConfirm(false)} />
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="relative bg-fw-base rounded-t-2xl sm:rounded-lg p-6 m-0 sm:m-4 w-full sm:max-w-md"
          >
            <h3 className="text-lg font-semibold text-fw-heading mb-2">Delete Connection?</h3>
            <p className="text-figma-base text-fw-bodyLight mb-6">
              Are you sure you want to delete "{connection.name}"? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-fw-neutral text-fw-body rounded-lg font-medium hover:bg-fw-neutral"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-fw-error text-white rounded-lg font-medium hover:bg-fw-error"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
