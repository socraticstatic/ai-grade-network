// src/components/common/notifications/AnnouncementBanner.tsx
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { AttIcon } from '../../icons/AttIcon';

interface AnnouncementBannerProps {
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
  onDismiss: () => void;
}

export function AnnouncementBanner({ title, message, ctaLabel, ctaHref, onDismiss }: AnnouncementBannerProps) {
  return (
    <motion.div
      role="banner"
      aria-live="polite"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-[9997] bg-fw-accent border-b border-fw-secondary border-l-4 border-l-att-blue px-4 py-2"
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <AttIcon name="bell" className="h-3.5 w-3.5 text-fw-info shrink-0" />
          <span className="text-figma-sm font-medium text-fw-heading tracking-[-0.03em]">
            {title}
          </span>
          <span className="text-figma-xs text-fw-bodyLight tracking-[-0.03em]">{message}</span>
          {ctaLabel && ctaHref && (
            <>
              <span className="text-figma-xs text-fw-bodyLight">&middot;</span>
              <a
                href={ctaHref}
                className="text-figma-xs text-fw-link underline underline-offset-2 hover:text-fw-linkHover transition-colors tracking-[-0.03em]"
              >
                {ctaLabel}
              </a>
            </>
          )}
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss announcement"
          className="p-0.5 rounded hover:bg-fw-wash transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5 text-fw-bodyLight" />
        </button>
      </div>
    </motion.div>
  );
}
