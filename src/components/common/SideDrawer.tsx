import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
};

export function SideDrawer({ isOpen, onClose, title, children, size = 'lg', footer }: SideDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[1000]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="drawer-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={`fixed top-0 right-0 h-full bg-fw-base shadow-2xl z-[1001] flex flex-col ${sizeClasses[size]} w-full`}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-fw-secondary flex items-center justify-between bg-fw-base sticky top-0 z-10">
              <h2 id="drawer-title" className="text-xl font-semibold text-fw-heading">{title}</h2>
              <button
                onClick={onClose}
                className="text-fw-bodyLight hover:text-fw-body transition-colors p-2 rounded-lg hover:bg-fw-wash"
                aria-label="Close drawer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-fw-secondary bg-fw-wash sticky bottom-0">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
