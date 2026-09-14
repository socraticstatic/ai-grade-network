// src/components/common/notifications/ConfirmDialog.tsx
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Button } from '../Button';

interface ConfirmDialogProps {
  title: string;
  message: string;
  variant?: 'standard' | 'destructive';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  title,
  message,
  variant = 'standard',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div
        data-testid="confirm-backdrop"
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm rounded-lg shadow-xl overflow-hidden flex"
      >
        <div className={`w-1 shrink-0 ${variant === 'destructive' ? 'bg-fw-error' : 'bg-fw-secondary'}`} />
        <div className="flex-1 bg-fw-base p-6">
        <h2
          id="confirm-title"
          className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em] mb-2"
        >
          {title}
        </h2>
        <p className="text-figma-base text-fw-body mb-6">{message}</p>

        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            autoFocus
            variant="primary"
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
