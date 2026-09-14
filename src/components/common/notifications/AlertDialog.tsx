import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../Button';
import { SupportID } from './SupportID';

interface AlertDialogProps {
  title: string;
  reassurance: string;
  reason: string;
  fix: string;
  escalation: string;
  supportId: string;
  actionLabel: string;
  onAction?: () => void;
  onClose: () => void;
}

export function AlertDialog({
  title,
  reassurance,
  reason,
  fix,
  escalation,
  supportId,
  actionLabel,
  onAction,
  onClose,
}: AlertDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
      {/* Overlay — no click-to-dismiss */}
      <div className="fixed inset-0 bg-black/40" />

      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-lg shadow-xl overflow-hidden flex"
      >
        <div className="w-1 shrink-0 bg-fw-error" />
        <div className="flex-1 bg-fw-base p-6">
          {/* Title row */}
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-fw-error shrink-0 mt-0.5" aria-hidden="true" />
            <h2
              id="alert-title"
              className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]"
            >
              {title}
            </h2>
          </div>

          {/* 5-part body */}
          <div className="text-figma-base text-fw-body space-y-2 mb-6">
            <p>
              {reassurance} {reason}
            </p>
            <p>{fix}</p>
            <p>
              If the issue keeps happening,{' '}
              <a href="/support" className="text-fw-link underline underline-offset-2 hover:text-fw-linkHover transition-colors">
                {escalation}
              </a>
              .
            </p>
          </div>

          {/* Support ID + Buttons */}
          <div className="flex items-center justify-between">
            <SupportID id={supportId} />
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={onAction ?? (() => {})}
                autoFocus
              >
                {actionLabel}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
