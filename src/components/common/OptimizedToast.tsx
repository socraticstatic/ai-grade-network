import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

// Optimized toast system with better performance
const ToastItem = memo(({ 
  toast, 
  onRemove 
}: { 
  toast: ToastMessage; 
  onRemove: (id: string) => void; 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (toast.duration && toast.duration !== Infinity) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onRemove(toast.id), 300);
      }, toast.duration);
      
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onRemove]);

  const styles = {
    success: 'bg-fw-successLight border-fw-success text-fw-success',
    error: 'bg-fw-errorLight border-fw-error text-fw-error',
    warning: 'bg-fw-warnLight border-fw-warn text-fw-warn',
    info: 'bg-brand-lightBlue border-brand-blue/20 text-brand-blue'
  }[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : 50 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={`border rounded-lg p-4 shadow-lg ${styles}`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium">{toast.title}</h4>
          <p className="text-figma-base mt-1">{toast.message}</p>
        </div>
        <button
          onClick={() => onRemove(toast.id)}
          className="ml-4 text-current opacity-50 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
});

export const OptimizedToastContainer = memo(() => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const maxToasts = 3; // Limit to prevent memory issues

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setToasts(prev => {
      const newToasts = [{ ...toast, id }, ...prev];
      // Keep only the latest toasts to prevent memory bloat
      return newToasts.slice(0, maxToasts);
    });
  }, []);

  // Global toast function
  useEffect(() => {
    window.addToast = addToast;
    return () => {
      window.addToast = () => console.warn('Toast container unmounted');
    };
  }, [addToast]);

  return (
    <div className="fixed bottom-0 right-0 p-6 space-y-4 pointer-events-none z-50 max-w-md">
      <AnimatePresence>
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
});