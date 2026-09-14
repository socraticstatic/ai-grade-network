// src/components/common/notifications/ToastContainer.tsx
import { useEffect, memo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useStore } from '../../../store/useStore';
import { Toast } from './Toast';

export const ToastContainer = memo(function ToastContainer() {
  const { toasts, addToast, removeToast } = useStore();

  // Backward-compat shim — existing call sites use window.addToast
  useEffect(() => {
    window.addToast = (toast: any) => {
      addToast({
        type: toast.type === 'success' ? 'success' : toast.type === 'error' ? 'error' : 'info',
        title: toast.title,
        message: toast.message ?? '',
        duration: toast.type === 'error' ? null : (toast.duration ?? 5000),
      });
    };
    return () => {
      window.addToast = () => {};
    };
  }, [addToast]);

  return (
    <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
});
