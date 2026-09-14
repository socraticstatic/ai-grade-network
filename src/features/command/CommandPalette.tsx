import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { CC } from '../../engine';
import { commandRegistry, parseIntent, type Command } from './commandRegistry';

/**
 * ⌘K / Ctrl+K command palette. Opens over any page, filters the live
 * engine-derived command registry (nav to the six sections, Attach /
 * Enforce / Undo actions) by label, and runs the selected command.
 *
 * The registry is rebuilt on every open/keystroke so it always reflects
 * current CC state — e.g. an on-ramp that was just attached drops off the
 * "Attach ..." list immediately.
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global ⌘K / Ctrl+K binding — independent of the app's other keyboard
  // shortcuts so it always fires, even while focus sits in another input.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(open => !open);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      // Focus after the overlay mounts.
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [isOpen]);

  const commands: Command[] = useMemo(() => {
    if (!isOpen) return [];
    return commandRegistry(CC, navigate);
  }, [isOpen, navigate, query]);

  const filtered = useMemo(() => {
    // Typed intents match the query by construction — they skip the fuzzy
    // filter and lead the list.
    const intents = isOpen ? parseIntent(query, CC) : [];
    const q = query.trim().toLowerCase();
    const matches = q
      ? commands.filter(c => c.label.toLowerCase().includes(q))
      : commands;
    return [...intents, ...matches];
  }, [commands, query, isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  function runCommand(cmd: Command) {
    cmd.run();
    setIsOpen(false);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[activeIndex];
      if (cmd) runCommand(cmd);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  const content = (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 px-4">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={() => setIsOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative z-10 w-full max-w-lg rounded-2xl bg-fw-base border border-fw-secondary shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 h-12 border-b border-fw-secondary">
          <Search className="w-4 h-4 text-fw-bodyLight shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to a section or run a command..."
            className="flex-1 h-full bg-transparent text-figma-base text-fw-heading placeholder:text-fw-bodyLight focus:outline-none"
          />
          <kbd className="hidden sm:inline text-figma-xs text-fw-bodyLight border border-fw-secondary rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-figma-sm text-fw-bodyLight text-center">
              No matching commands.
            </p>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => runCommand(cmd)}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 text-figma-sm transition-colors ${
                  i === activeIndex
                    ? 'bg-fw-active/10 text-fw-heading'
                    : 'text-fw-body hover:bg-fw-wash'
                }`}
              >
                <span>{cmd.label}</span>
                <span className="text-figma-xs uppercase tracking-wide text-fw-bodyLight">
                  {cmd.kind}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
