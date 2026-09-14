import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../Button';
import { SupportID } from './SupportID';

interface WarningDialogProps {
  title: string;
  reassurance: string;
  reason: string;
  fix: string;
  escalation: string;
  supportId?: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

export function WarningDialog({
  title,
  reassurance,
  reason,
  fix,
  escalation,
  supportId,
  actionLabel = 'I Understand',
  onAction,
  onClose,
}: WarningDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/40" />

      <motion.div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="warning-title"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md rounded-lg shadow-xl overflow-hidden flex"
      >
        <div className="w-1 shrink-0 bg-fw-warn" />
        <div className="flex-1 bg-fw-base p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-fw-warn shrink-0 mt-0.5" aria-hidden="true" />
            <h2
              id="warning-title"
              className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]"
            >
              {title}
            </h2>
          </div>

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

          <div className="flex items-center justify-between">
            <div>{supportId && <SupportID id={supportId} />}</div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                autoFocus
                variant="primary"
                size="sm"
                onClick={onAction}
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
