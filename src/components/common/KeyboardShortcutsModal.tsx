import { memo } from 'react';
import { X, Keyboard } from 'lucide-react';
import { Modal } from './Modal';
import { useStore } from '../../store/useStore';
import { formatShortcut, isMacOS } from '../../hooks/useKeyboardShortcut';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function KeyboardShortcutsModalComponent({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const shortcuts = useStore(state => state.shortcuts);

  const categories = {
    global: { label: 'Global', description: 'Available everywhere' },
    navigation: { label: 'Navigation', description: 'Navigate between pages' },
    actions: { label: 'Actions', description: 'Perform common actions' },
    views: { label: 'Views', description: 'Switch between views' }
  };

  const isMac = isMacOS();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-lg bg-brand-lightBlue flex items-center justify-center">
              <Keyboard className="h-6 w-6 text-brand-blue" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-fw-heading">Keyboard Shortcuts</h2>
              <p className="text-figma-base text-fw-bodyLight mt-1">
                Speed up your workflow with keyboard shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-fw-neutral transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-fw-bodyLight" />
          </button>
        </div>

        {/* Platform indicator */}
        <div className="mb-6 p-3 bg-fw-wash rounded-lg border border-fw-secondary">
          <p className="text-figma-base text-fw-body">
            <span className="font-medium">Platform:</span>{' '}
            {isMac ? 'macOS (using ⌘ Command key)' : 'Windows/Linux (using Ctrl key)'}
          </p>
        </div>

        {/* Shortcuts by category */}
        <div className="space-y-6">
          {Object.entries(categories).map(([categoryId, categoryInfo]) => {
            const categoryShortcuts = shortcuts.filter(s => s.category === categoryId);

            if (categoryShortcuts.length === 0) return null;

            return (
              <div key={categoryId}>
                <div className="mb-3">
                  <h3 className="text-lg font-semibold text-fw-heading">
                    {categoryInfo.label}
                  </h3>
                  <p className="text-figma-base text-fw-bodyLight">
                    {categoryInfo.description}
                  </p>
                </div>
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className="flex items-center justify-between p-3 bg-fw-base border border-fw-secondary rounded-lg hover:bg-fw-wash transition-colors"
                    >
                      <span className="text-figma-base text-fw-body">
                        {shortcut.description}
                      </span>
                      <kbd className="px-3 py-1.5 text-figma-base font-mono font-semibold text-fw-heading bg-fw-wash border border-fw-secondary rounded-md shadow-sm">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer tip */}
        <div className="mt-6 p-4 bg-brand-lightBlue/20 border border-brand-blue/30 rounded-lg">
          <p className="text-figma-base text-fw-body">
            <span className="font-medium">Tip:</span> Press{' '}
            <kbd className="px-2 py-1 text-figma-sm font-mono font-semibold bg-fw-base border border-fw-secondary rounded">
              ?
            </kbd>{' '}
            to show this dialog anytime
          </p>
        </div>
      </div>
    </Modal>
  );
}

export const KeyboardShortcutsModal = memo(KeyboardShortcutsModalComponent);
