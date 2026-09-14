import { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  icon?: ReactNode;
  confirmText?: string;
  confirmVariant?: 'danger' | 'primary';
  cancelText?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  icon,
  confirmText = 'Confirm',
  confirmVariant = 'primary',
  cancelText = 'Cancel'
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="sm:flex sm:items-start">
        {icon && (
          <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-[var(--status-error-bg)] rounded-full sm:mx-0 sm:h-10 sm:w-10">
            {icon}
          </div>
        )}
        <div className={`mt-3 text-center sm:mt-0 ${icon ? 'sm:ml-4' : ''} sm:text-left`}>
          <h3 className="text-lg font-medium text-fw-heading">{title}</h3>
          <div className="mt-2">
            <p className="text-figma-base text-fw-bodyLight">{message}</p>
          </div>
        </div>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
        <Button
          variant={confirmVariant === 'danger' ? 'primary' : 'primary'}
          onClick={onConfirm}
          className={confirmVariant === 'danger' ? 'bg-fw-error hover:bg-[rgb(159_0_40)]' : ''}
        >
          {confirmText}
        </Button>
        <div className="mt-3 sm:mt-0 sm:mr-3">
          <Button variant="outline" onClick={onClose}>
            {cancelText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}