import { useEffect, useRef, useState, memo } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { ToastItem } from '../../../store/slices/inAppNotificationSlice';

interface ToastProps extends ToastItem {
  onRemove: (id: string) => void;
}

const iconMap = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
};

const barColorMap = {
  info: 'bg-att-blue',
  success: 'bg-fw-success',
  error: 'bg-fw-error',
};

const iconColorMap = {
  info: 'text-fw-info',
  success: 'text-fw-success',
  error: 'text-fw-error',
};

const progressColorMap = {
  info: 'bg-att-blue',
  success: 'bg-fw-success',
  error: 'bg-fw-error',
};

export const Toast = memo(function Toast({ id, type, title, message, duration, onRemove }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const hovering = useRef(false);
  const startTime = useRef(Date.now());
  const elapsed = useRef(0);
  const Icon = iconMap[type];

  useEffect(() => {
    if (!duration) return;

    const interval = setInterval(() => {
      if (hovering.current) return;
      elapsed.current = Date.now() - startTime.current;
      const pct = Math.max(0, 100 - (elapsed.current / duration) * 100);
      setProgress(pct);
      if (pct <= 0) {
        clearInterval(interval);
        onRemove(id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [id, duration, onRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className="relative w-80 rounded-md shadow-lg border border-fw-secondary overflow-hidden flex"
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => {
        hovering.current = false;
        startTime.current = Date.now() - elapsed.current;
      }}
    >
      {/* Straight color bar */}
      <div className={`w-1 shrink-0 ${barColorMap[type]}`} />

      {/* Content */}
      <div className="flex-1 bg-fw-base">
        <div className="flex items-start gap-3 p-4">
          <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${iconColorMap[type]}`} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-figma-sm font-medium text-fw-heading tracking-[-0.03em]">{title}</p>
            {message && (
              <p className="text-figma-sm text-fw-bodyLight mt-0.5">{message}</p>
            )}
          </div>
          <button
            onClick={() => onRemove(id)}
            aria-label="Dismiss notification"
            className="p-0.5 rounded text-fw-bodyLight hover:text-fw-heading hover:bg-fw-wash transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {duration && (
          <div className="h-0.5 bg-fw-secondary">
            <div
              className={`h-full ${progressColorMap[type]} opacity-40 transition-none`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
});
