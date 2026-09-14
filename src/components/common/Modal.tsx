import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'report' | 'fullscreen';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;

  const isFullscreen = size === 'fullscreen';

  const sizeClasses = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-[720px]',
    xl: 'sm:max-w-[762px]',
    report: 'sm:max-w-[880px]',
    fullscreen: 'max-w-none'
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className={`flex items-center justify-center ${isFullscreen ? 'min-h-screen' : 'min-h-screen px-4 py-8'}`}>
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-black/40"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className={`relative z-10 w-full flex flex-col text-left transform bg-fw-base shadow-xl ${
          isFullscreen
            ? 'h-screen max-h-screen p-8'
            : 'max-h-[calc(100vh-4rem)] px-6 pt-6 pb-6 rounded-3xl'
        } ${sizeClasses[size]}`}>
          {/* Close button */}
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={onClose}
              className="tab-button p-2 rounded-lg text-fw-bodyLight hover:text-fw-heading hover:bg-fw-wash transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title */}
          {title && (
            <div className="mb-4 flex-shrink-0">
              <h3 className="text-figma-xl font-bold text-fw-heading tracking-[-0.03em]">{title}</h3>
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}