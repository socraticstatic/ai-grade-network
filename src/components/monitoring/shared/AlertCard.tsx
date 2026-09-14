import { useState } from 'react';
import { AlertTriangle, AlertCircle, Clock, Activity, Network, X } from 'lucide-react';
import { Alert } from '../../../types';
import { motion } from 'framer-motion';

interface AlertCardProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
  isMobile?: boolean;
}

export function AlertCard({ alert, onDismiss, isMobile = false }: AlertCardProps) {
  const [isDismissing, setIsDismissing] = useState(false);

  const getIcon = () => {
    switch (alert.type) {
      case 'critical':
        return Activity;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Clock;
      default:
        return AlertCircle;
    }
  };

  const styles = {
    critical: {
      bg: 'bg-fw-error/10',
      border: 'border-fw-error/20',
      icon: 'text-fw-error',
      title: 'text-fw-error',
      text: 'text-fw-error/80'
    },
    warning: {
      bg: 'bg-fw-wash',
      border: 'border-fw-secondary/20',
      icon: 'text-fw-bodyLight',
      title: 'text-fw-heading',
      text: 'text-fw-body'
    },
    info: {
      bg: 'bg-fw-infoLight',
      border: 'border-fw-active/20',
      icon: 'text-fw-link',
      title: 'text-fw-link',
      text: 'text-fw-link/80'
    }
  }[alert.type];

  const Icon = getIcon();

  const handleDismiss = () => {
    if (onDismiss) {
      setIsDismissing(true);
      // Wait for animation to complete before removing
      setTimeout(() => {
        onDismiss(alert.id);
      }, 300);
    }
  };

  if (isMobile) {
    // Mobile-optimized version
    return (
      <motion.div 
        initial={{ opacity: 1, y: 0 }}
        animate={{ 
          opacity: isDismissing ? 0 : 1, 
          y: isDismissing ? -10 : 0,
          height: isDismissing ? 0 : 'auto'
        }}
        transition={{ duration: 0.3 }}
        className={`${styles.bg} ${styles.border} border rounded-lg overflow-hidden relative`}
      >
        <div className="p-3">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <Icon className={`h-5 w-5 ${styles.icon}`} />
            </div>
            <div className="ml-3 flex-1 pr-6">
              <h3 className={`text-figma-base font-medium ${styles.title}`}>
                {alert.title}
              </h3>
              <p className={`mt-1 text-figma-base ${styles.text}`}>
                {alert.message}
              </p>
              
              <div className="mt-3 pt-3 border-t border-fw-secondary/50">
                <div className="flex items-center justify-between text-figma-sm text-fw-bodyLight">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>
                      {new Date(alert.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="capitalize">{alert.type} Alert</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Dismiss button */}
          <button 
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-fw-neutral"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4 text-fw-bodyLight" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Desktop version
  return (
    <motion.div 
      initial={{ opacity: 1, y: 0 }}
      animate={{ 
        opacity: isDismissing ? 0 : 1, 
        y: isDismissing ? -10 : 0,
        height: isDismissing ? 0 : 'auto'
      }}
      transition={{ duration: 0.3 }}
      className={`${styles.bg} ${styles.border} border rounded-lg py-2.5 px-3 relative group`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`h-4 w-4 ${styles.icon} mt-0.5`} />
        </div>
        <div className="ml-2.5 w-0 flex-1">
          <h3 className={`text-figma-base font-medium ${styles.title}`}>
            {alert.title}
          </h3>
          <p className={`mt-0.5 text-figma-sm ${styles.text}`}>
            {alert.message}
          </p>
          <p className="mt-1 text-figma-sm text-fw-bodyLight">
            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        {/* Dismiss button - only visible on hover */}
        <button 
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-fw-neutral"
          aria-label="Dismiss alert"
        >
          <X className="h-3 w-3 text-fw-bodyLight" />
        </button>
      </div>
    </motion.div>
  );
}