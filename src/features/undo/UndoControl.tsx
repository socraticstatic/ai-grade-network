import { useCallback, useEffect, useState } from 'react';
import { Undo2, Share2, Check } from 'lucide-react';
import { useCloudControl, useCloudControlActions } from '../../engine/react/useCloudControl';
import { buildShareLink } from '../share/shareLink';

/** True when the given event target is a place the user is actively typing —
 * ⌘Z/Ctrl+Z inside an input/textarea/contenteditable should do normal text
 * undo, not the engine's undo. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/**
 * Undo + Share controls for the app shell top bar.
 *
 * Undo reverts the last engine mutation (`CC.undo()`), mirrors availability
 * from `CC.canUndo()`, and is also bound to the global ⌘Z / Ctrl+Z shortcut
 * (skipped while focus is in an editable field). Share copies a replay link
 * (`buildShareLink`) — built from the engine's `shareUrl()`/`serialize()` —
 * to the clipboard.
 */
export function UndoControl() {
  const canUndo = useCloudControl(cc => cc.canUndo());
  const actions = useCloudControlActions();
  const [copied, setCopied] = useState(false);

  const undo = useCallback(() => {
    actions.undo();
  }, [actions]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (isEditableTarget(e.target)) return;
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo]);

  const share = useCallback(async () => {
    const link = buildShareLink(actions);
    try {
      await navigator.clipboard?.writeText?.(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.warn('clipboard write failed', e);
    }
  }, [actions]);

  /* Menu rows, not icon buttons: both of these moved into the utility
     bar's overflow, where a label can say what the icon only hinted at.
     Undo still states WHAT it would undo - that sentence was the control's
     whole value and it was previously only reachable as a tooltip. */
  return (
    <>
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        aria-label={canUndo ? `Undo ${canUndo}` : 'Nothing to undo'}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-figma-sm text-fw-body transition-colors hover:bg-fw-wash disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
      >
        <Undo2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate">{canUndo ? `Undo ${canUndo}` : 'Nothing to undo'}</span>
      </button>
      <button
        type="button"
        onClick={share}
        aria-label="Share a replay link"
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-figma-sm text-fw-body transition-colors hover:bg-fw-wash"
      >
        {copied ? (
          <Check className="h-4 w-4 shrink-0 text-fw-success" aria-hidden="true" />
        ) : (
          <Share2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span>{copied ? 'Replay link copied' : 'Share a replay link'}</span>
      </button>
    </>
  );
}
