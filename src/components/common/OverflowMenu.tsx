import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface OverflowMenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  hubRef?: React.RefObject<HTMLElement>;
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function OverflowMenu({
  items,
  hubRef,
  className = '',
  isOpen: controlledIsOpen,
  onOpenChange
}: OverflowMenuProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = (value: boolean) => {
    if (onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalIsOpen(value);
    }
  };

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 192;
      const menuHeight = 200;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceRight = viewportWidth - rect.right;

      let top = spaceBelow < menuHeight ? rect.top - menuHeight + 40 : rect.bottom + 4;
      let left = rect.right - menuWidth;

      if (left < 8) {
        left = 8;
      }

      setMenuPosition({ top, left });
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleItemClick = (item: OverflowMenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        aria-label="More options"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-2 text-fw-bodyLight hover:text-fw-body rounded-full hover:bg-fw-wash transition-colors ${className}`}
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 35 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />
          <div
            ref={menuRef}
            className="fixed w-48 rounded-md shadow-lg bg-fw-base ring-1 ring-black ring-opacity-5"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 50
            }}
          >
            <div className="py-1" role="menu">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                  className={`
                    flex items-center w-full px-4 py-2 text-figma-base
                    ${item.variant === 'danger'
                      ? 'text-fw-error hover:bg-fw-errorLight'
                      : 'text-fw-body hover:bg-fw-wash'
                    }
                  `}
                >
                  {item.icon}
                  <span className="ml-3">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}