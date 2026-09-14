import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { useStore } from '../../store/useStore';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

/**
 * Global keyboard shortcuts manager
 * Handles app-wide keyboard shortcuts
 */
export function GlobalKeyboardShortcuts() {
  const navigate = useNavigate();
  const shortcutsEnabled = useStore(state => state.shortcutsEnabled);
  const [showHelp, setShowHelp] = useState(false);

  // Global shortcuts
  useKeyboardShortcut(
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      handler: useCallback(() => {
        setShowHelp(true);
      }, [])
    },
    shortcutsEnabled
  );

  // Search shortcut
  useKeyboardShortcut(
    {
      key: 'k',
      ctrl: true,
      description: 'Focus search',
      handler: useCallback(() => {
        const searchInput = document.querySelector<HTMLInputElement>('[type="search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }, [])
    },
    shortcutsEnabled
  );

  // Navigation shortcuts
  useKeyboardShortcut(
    [
      {
        key: 'h',
        description: 'Go to home',
        handler: () => navigate('/')
      }
    ],
    shortcutsEnabled
  );

  // Action shortcuts
  useKeyboardShortcut(
    [
      {
        key: 'n',
        ctrl: true,
        description: 'Create new connection',
        handler: () => {
          // Trigger the create connection wizard
          const createButton = document.querySelector<HTMLButtonElement>('[data-action="create-connection"]');
          if (createButton) {
            createButton.click();
          } else {
            window.addToast?.({
              type: 'info',
              title: 'Create Connection',
              message: 'Navigate to Connections page to create a new connection',
              duration: 3000
            });
          }
        }
      },
      {
        key: 'r',
        ctrl: true,
        description: 'Refresh data',
        handler: (e) => {
          e.preventDefault();
          window.location.reload();
        },
        preventDefault: true
      }
    ],
    shortcutsEnabled
  );

  // View shortcuts (1, 2, 3 for grid, list, topology)
  useKeyboardShortcut(
    [
      {
        key: '1',
        description: 'Switch to grid view',
        handler: () => {
          const gridButton = document.querySelector<HTMLButtonElement>('[data-view="grid"]');
          if (gridButton) gridButton.click();
        }
      },
      {
        key: '2',
        description: 'Switch to list view',
        handler: () => {
          const listButton = document.querySelector<HTMLButtonElement>('[data-view="list"]');
          if (listButton) listButton.click();
        }
      },
      {
        key: '3',
        description: 'Switch to topology view',
        handler: () => {
          const topoButton = document.querySelector<HTMLButtonElement>('[data-view="topology"]');
          if (topoButton) topoButton.click();
        }
      }
    ],
    shortcutsEnabled
  );

  return (
    <>
      <KeyboardShortcutsModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </>
  );
}
