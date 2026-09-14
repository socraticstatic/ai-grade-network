import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { Connection } from '../../types';
import { Group } from '../../types/group';
import { useStore } from '../../store/useStore';
import { motion } from 'framer-motion';

// Import modular components
import { ConnectionCardHeader } from './card/ConnectionCardHeader';
import { ConnectionCardStatus } from './card/ConnectionCardStatus';
import { displayStatus as displayStatusOf } from '../../utils/lmccDisplay';
import { ConnectionCardMetrics } from './card/ConnectionCardMetrics';
import { ConnectionCardProgress } from './card/ConnectionCardProgress';
import { ConnectionCardAction } from './card/ConnectionCardAction';
import { ConnectionCardMinimized } from './card/ConnectionCardMinimized';
import { CardMetaChips } from './facts/cardFields';
import { useColumnVisibility } from '../../hooks/useColumnVisibility';
import { AWSPendingConfigModal } from './modals/AWSPendingConfigModal';
import { ProvisioningTracker } from './ProvisioningTracker';
import { LmccProvisioningTracker } from './LmccProvisioningTracker';

interface ConnectionCardProps {
  connection: Connection;
  groups?: Group[];
  isMinimized?: boolean;
  onClick?: () => void;
}

/**
 * Card component for displaying connection information
 * Supports both expanded and minimized views
 */
export function ConnectionCard({ connection, groups = [], isMinimized: isMinimizedProp = false, onClick }: ConnectionCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isHighlighted = (location.state as any)?.highlightedConnectionId === connection.id;
  const updateConnection = useStore(state => state.updateConnection);
  const completeProvisioning = useStore(state => state.completeProvisioning);
  const hubs = useStore(state => state.hubs);
  const { visibleColumns: cardFields } = useColumnVisibility('conn-card');
  const isProvisioning = connection.status === 'Provisioning';
  const [isMinimized, setIsMinimized] = useState(isMinimizedProp);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [remainingTime, setRemainingTime] = useState(420);
  const [isEditingName, setIsEditingName] = useState(connection.name.startsWith('Internet to'));
  const [nodeName, setNodeName] = useState(connection.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showEffects] = useState(true);
  const [showAWSConfigModal, setShowAWSConfigModal] = useState(false);

  const isPendingLmcc = connection.status === 'Pending' && connection.configuration?.isLmcc && connection.configuration?.lmccPending;
  const isPendingAWS = connection.status === 'Pending' && connection.origin?.source === 'aws-marketplace' && !isPendingLmcc;

  // Update local minimized state when prop changes
  useEffect(() => {
    setIsMinimized(isMinimizedProp);
  }, [isMinimizedProp]);

  // When this card is the highlight target (post-creation navigation):
  // force-expand it and scroll it into the center of the viewport.
  useEffect(() => {
    if (!isHighlighted) return;
    setIsMinimized(false);
    const t = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    return () => clearTimeout(t);
  }, [isHighlighted]);

  // Progress bar and countdown timer animation
  useEffect(() => {
    if (isPending) {
      const startTime = Date.now();
      const duration = 7000; // 7 seconds to emulate 7 minutes
      const totalSeconds = 420; // 7 minutes = 420 seconds

      const updateProgress = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        const secondsRemaining = Math.max(0, Math.ceil(totalSeconds - (elapsed / duration) * totalSeconds));

        setProgress(newProgress);
        setRemainingTime(secondsRemaining);

        if (newProgress < 100) {
          requestAnimationFrame(updateProgress);
        } else {
          setIsPending(false);
          setProgress(0);
          setRemainingTime(420);
        }
      };

      requestAnimationFrame(updateProgress);
    }
  }, [isPending]);

  const handleNameSubmit = () => {
    setNameError(null);
    
    if (!nodeName.trim()) {
      setNameError("Connection name cannot be empty");
      return;
    }
    
    // Duplicate names are allowed — the store auto-suffixes "(2)", "(3)", etc.
    updateConnection(connection.id, { name: nodeName.trim() })
      .catch(error => {
        setNameError(error.message);
      });
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setNodeName(connection.name);
      setNameError(null);
      setIsEditingName(false);
    }
  };

  const getBillingInfo = () => {
    const planLabels = {
      'trial': { label: '22 days left', color: 'green', bgColor: 'bg-fw-successLight', textColor: 'text-fw-success' },
      'pay-as-you-go': { label: 'Pay as you go', color: 'blue', bgColor: 'bg-brand-lightBlue', textColor: 'text-fw-link' },
      '12-months': { label: '12 Months', color: 'blue', bgColor: 'bg-brand-lightBlue', textColor: 'text-fw-link' },
      '24-months': { label: '24 Months', color: 'blue', bgColor: 'bg-brand-lightBlue', textColor: 'text-fw-link' },
      '36-months': { label: '36 Months', color: 'purple', bgColor: 'bg-fw-purpleLight', textColor: 'text-fw-link' }
    };

    const planId = connection.billing?.planId || 'pay-as-you-go';
    const planInfo = planLabels[planId as keyof typeof planLabels] || planLabels['pay-as-you-go'];

    return {
      type: planId.charAt(0).toUpperCase() + planId.slice(1),
      cost: connection.billing?.total,
      label: planInfo.label,
      color: planInfo.color,
      bgColor: planInfo.bgColor,
      textColor: planInfo.textColor
    };
  };
  
  // Provider logo mapping
  const getCardIcon = () => {
    return <AttIcon name="cloud" className="h-5 w-5 text-fw-link" />;
  };

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;

    const newStatus = connection.status === 'Active' ? 'Inactive' : 'Active';
    const isActivating = newStatus === 'Active';

    if (isActivating) {
      // Activating: Instant activation
      updateConnection(connection.id, { status: newStatus });
      setIsPending(false);
      setProgress(0);
      setRemainingTime(420);

      window.addToast({
        type: 'success',
        title: 'Connection Activated',
        message: `Connection is now Active`,
        duration: 3000
      });
    } else {
      // Deactivating: Instant change, no timer
      updateConnection(connection.id, { status: newStatus });

      window.addToast({
        type: 'success',
        title: 'Connection Deactivated',
        message: `Connection is now Inactive`,
        duration: 3000
      });
    }
  };

  const getHealthStatus = () => {
    if (connection.status === 'Provisioning') {
      return connection.configuration?.awsFirst
        ? { label: 'PROVISIONING', color: 'bg-brand-lightBlue text-fw-link' }
        : { label: 'WAITING FOR AWS', color: 'bg-brand-lightBlue text-fw-link' };
    }
    if (connection.status === 'Pending') return null;
    if (connection.status !== 'Active') return { label: 'INACTIVE', color: 'bg-fw-secondary text-fw-disabled' };

    const utilization = connection.performance?.bandwidthUtilization || 0;
    if (utilization > 90) {
      return { label: 'CRITICAL', color: 'bg-fw-errorLight text-fw-error' };
    } else if (utilization > 80) {
      return { label: 'WARNING', color: 'bg-fw-accent text-fw-link' };
    } else {
      return { label: 'GOOD', color: 'bg-fw-accent text-fw-link' };
    }
  };

  const getStatusDotColor = () => {
    if (connection.status === 'Provisioning') return 'bg-fw-link animate-pulse';
    if (connection.status !== 'Active') return 'bg-fw-neutral';
    const utilization = connection.performance?.bandwidthUtilization || 0;
    if (utilization > 90) return 'bg-fw-errorLight0';
    if (utilization > 80) return 'bg-complementary-amber';
    if (utilization > 60) return 'bg-brand-blue';
    return 'bg-complementary-green';
  };

  const handleCardClick = () => {
    if (isProvisioning) return; // Don't navigate during provisioning
    if (isPendingAWS) {
      setShowAWSConfigModal(true);
      return;
    }

    if (onClick) {
      onClick();
    } else {
      navigate(`/connections/${connection.id}`);
    }
  };

  const handleAWSActivation = (config: any) => {
    updateConnection(connection.id, {
      status: 'Active',
      configuration: config,
      primaryIPE: 'Ashburn-1',
      ipeRedundancy: true,
      performance: {
        latency: '4.5ms',
        packetLoss: '0.02%',
        uptime: '99.9%',
        throughput: '1 Gbps',
        tunnels: 'Active',
        bandwidthUtilization: 15,
        currentUsage: '150 Mbps',
        utilizationTrend: [10, 12, 15, 14, 16, 15, 15]
      }
    });

    setIsPending(false);
    setProgress(0);
    setRemainingTime(420);

    window.addToast({
      type: 'success',
      title: 'Connection Activated',
      message: 'AWS connection is now active and ready to use.',
      duration: 3000
    });
  };

  const healthStatus = getHealthStatus();
  const billingInfo = getBillingInfo();

  return (
    <motion.div
      ref={cardRef}
      className={`
        relative
        bg-fw-base rounded-2xl border border-fw-secondary
        shadow-sm
        hover:shadow-md
        transition-all duration-300 ease-in-out
        transform hover:translate-y-[-2px]
        ${isMinimized ? 'h-[88px]' : ''}
        ${isPendingAWS ? 'opacity-75' : ''}
        ${isHighlighted ? 'connection-highlight' : ''}
        cursor-pointer
        flex flex-col
      `}
      data-tour-target="connection-card"
      data-connection-id={connection.id}
      onClick={handleCardClick}
      // Add motion animation when pending (but not for AWS pending)
      animate={isPending && !isPendingAWS ? {
        boxShadow: ['0 2px 4px rgba(0,0,0,0.05)', '0 0 8px rgba(0,159,219,0.5)', '0 2px 4px rgba(0,0,0,0.05)'],
        scale: [1, 1.02, 1],
        transition: {
          repeat: Infinity,
          duration: 2.5,
          ease: "easeInOut"
        }
      } : {}}
    >
      {/* Progress Bar */}
      {isPending && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-fw-neutral rounded-t-2xl overflow-hidden">
          <motion.div
            className="h-full bg-fw-link transition-all duration-300 ease-linear"
            style={{ width: `${progress}%` }}
            // Add pulse animation to the progress bar
            animate={{
              opacity: [0.7, 1, 0.7],
              transition: { 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut" 
              }
            }}
          />
        </div>
      )}

      {isMinimized ? (
        // Minimized View
        <ConnectionCardMinimized
          connection={connection}
          groups={groups}
          getStatusDotColor={getStatusDotColor}
          getCardIcon={getCardIcon}
          handleToggleStatus={handleToggleStatus}
          isPending={isPending}
          progress={progress}
          remainingTime={remainingTime}
          navigate={navigate}
          onMaximize={() => setIsMinimized(false)}
          showEffects={showEffects}
        />
      ) : (
        // Expanded View
        <>
          <ConnectionCardHeader
            name={connection.name}
            type={connection.type}
            icon={getCardIcon()}
            isEditingName={isEditingName}
            nodeName={nodeName}
            nameError={nameError}
            onNameChange={(e) => setNodeName(e.target.value)}
            onNameSubmit={handleNameSubmit}
            onNameKeyDown={handleNameKeyDown}
            onEditNameClick={() => setIsEditingName(true)}
            onMinimize={() => setIsMinimized(true)}
            connection={connection}
          />

          {(
            <>
              {/* Status - Figma: immediately after header */}
              <ConnectionCardStatus
                status={connection.configuration?.isLmcc ? displayStatusOf(connection) : connection.status}
                isLmcc={connection.configuration?.isLmcc === true}
                bandwidthUtilization={connection.performance?.bandwidthUtilization || 0}
                isPending={isPending}
                progress={progress}
                remainingTime={remainingTime}
                handleToggleStatus={handleToggleStatus}
                healthStatus={healthStatus}
                showEffects={showEffects}
              />

              <div className="p-6 space-y-4 flex-grow">
                {/* Configurable fact strip — same fields as the mini card, full size */}
                <div className="rounded-xl border border-fw-secondary bg-fw-wash px-4 py-3">
                  <CardMetaChips
                    connection={connection}
                    hubs={hubs}
                    visibleIds={cardFields}
                    variant="large"
                    navigate={navigate}
                  />
                </div>

                {/* Bandwidth Utilization Bar */}
                <ConnectionCardProgress
                  performance={connection.performance}
                  bandwidth={connection.bandwidth}
                />

                {/* Connection Metrics */}
                <ConnectionCardMetrics
                  connection={connection}
                  billingInfo={billingInfo}
                  performance={connection.performance}
                />
              </div>
            </>
          )}

          {/* Action */}
          {isPendingAWS ? (
            <div className="p-6 border-t border-fw-secondary mt-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAWSConfigModal(true);
                }}
                className="w-full flex items-center justify-center h-9 px-4 rounded-full text-figma-base font-medium text-fw-link hover:bg-fw-accent border border-fw-active/30 transition-colors"
              >
                Complete Setup
                <ChevronRight className="ml-2 h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-auto">
              <ConnectionCardAction connectionId={connection.id} />
            </div>
          )}
        </>
      )}

      {/* AWS Configuration Modal */}
      {isPendingAWS && (
        <AWSPendingConfigModal
          connection={connection}
          isOpen={showAWSConfigModal}
          onClose={() => setShowAWSConfigModal(false)}
          onActivate={handleAWSActivation}
        />
      )}

    </motion.div>
  );
}