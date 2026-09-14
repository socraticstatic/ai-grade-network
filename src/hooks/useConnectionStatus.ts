import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Connection } from '../types';

interface UseConnectionStatusOptions {
  /**
   * Duration of the status change animation in milliseconds
   */
  animationDuration?: number;
}

interface UseConnectionStatusReturn {
  isPending: boolean;
  progress: number;
  handleToggleStatus: (e: React.MouseEvent) => void;
  getHealthStatus: () => { label: string; color: string };
  getStatusDotColor: () => string;
}

/**
 * Custom hook to manage connection status logic and transitions
 */
export function useConnectionStatus(
  connection: Connection,
  options: UseConnectionStatusOptions = {}
): UseConnectionStatusReturn {
  const { animationDuration = 15000 } = options;
  const updateConnection = useStore(state => state.updateConnection);
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Progress bar animation
  useEffect(() => {
    if (!isPending) return;
    
    const startTime = Date.now();
    let animationFrameId: number;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / animationDuration) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        setIsPending(false);
        setProgress(0);
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPending, animationDuration]);

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPending) return;

    const newStatus = connection.status === 'Active' ? 'Inactive' : 'Active';
    setIsPending(true);

    // Show initial toast
    window.addToast({
      type: 'info',
      title: 'Status Change Initiated',
      message: `Connection status change typically takes 6 minutes to complete. A notification will appear when finished.`,
      duration: 6000
    });

    // Simulate status change after 15 seconds
    setTimeout(() => {
      updateConnection(connection.id.toString(), { status: newStatus });
      setIsPending(false);
      setProgress(0);
      
      window.addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Connection is now ${newStatus}`,
        duration: 3000
      });
    }, animationDuration);
  };

  const getHealthStatus = () => {
    if (connection.status !== 'Active') return { label: 'Inactive', color: 'bg-fw-wash text-fw-body' };

    const utilization = connection.performance?.bandwidthUtilization || 0;
    if (utilization > 90) {
      return { label: 'Critical', color: 'bg-fw-errorLight text-fw-error' };
    } else if (utilization > 80) {
      return { label: 'Warning', color: 'bg-fw-warnLight text-fw-warn' };
    } else if (utilization > 60) {
      return { label: 'Good', color: 'bg-brand-lightBlue text-brand-blue' };
    } else {
      return { label: 'Optimal', color: 'bg-complementary-green/10 text-complementary-green' };
    }
  };

  const getStatusDotColor = () => {
    if (connection.status !== 'Active') return 'bg-fw-bodyLight';
    const utilization = connection.performance?.bandwidthUtilization || 0;
    if (utilization > 90) return 'bg-fw-errorLight0';
    if (utilization > 80) return 'bg-complementary-amber';
    if (utilization > 60) return 'bg-brand-blue';
    return 'bg-complementary-green';
  };

  return {
    isPending,
    progress,
    handleToggleStatus,
    getHealthStatus,
    getStatusDotColor
  };
}