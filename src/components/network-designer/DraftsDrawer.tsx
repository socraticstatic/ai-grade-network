import { X, FolderOpen, Trash2 } from 'lucide-react';
import { useDesignerStore } from './store/useDesignerStore';
import type { Draft } from './store/useDesignerStore';

interface DraftsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function DraftsDrawer({ isOpen, onClose }: DraftsDrawerProps) {
  const drafts = useDesignerStore((s) => s.drafts);
  const currentDraftId = useDesignerStore((s) => s.currentDraftId);
  const loadDraft = useDesignerStore((s) => s.loadDraft);
  const deleteDraft = useDesignerStore((s) => s.deleteDraft);

  if (!isOpen) return null;

  function handleLoad(draft: Draft) {
    loadDraft(draft.id);
    onClose();
    window.addToast?.({
      type: 'success',
      title: 'Draft Loaded',
      message: `"${draft.name}" loaded onto the canvas.`,
      duration: 3000,
    });
  }

  function handleDelete(draft: Draft, e: React.MouseEvent) {
    e.stopPropagation();
    deleteDraft(draft.id);
    window.addToast?.({
      type: 'info',
      title: 'Draft Deleted',
      message: `"${draft.name}" removed.`,
      duration: 2500,
    });
  }

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-80 z-30 bg-fw-base rounded-2xl border border-fw-secondary shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fw-secondary">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-fw-bodyLight" />
          <h2 className="text-figma-base font-semibold text-fw-heading">Saved Drafts</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-fw-bodyLight hover:bg-fw-wash transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Draft list */}
      <div className="max-h-[480px] overflow-y-auto">
        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <FolderOpen className="h-8 w-8 text-fw-disabled mb-3" />
            <p className="text-figma-sm font-medium text-fw-body mb-1">No saved drafts</p>
            <p className="text-figma-xs text-fw-bodyLight">Save your current canvas as a draft to access it later.</p>
          </div>
        ) : (
          <div className="divide-y divide-fw-secondary/50">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className={`p-4 ${currentDraftId === draft.id ? 'bg-fw-accent/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="text-figma-sm font-semibold text-fw-heading truncate">{draft.name}</h3>
                    {draft.description && (
                      <p className="text-figma-xs text-fw-bodyLight line-clamp-2 mt-0.5">{draft.description}</p>
                    )}
                  </div>
                  {currentDraftId === draft.id && (
                    <span className="flex-shrink-0 text-figma-xs font-medium text-fw-link bg-fw-accent px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-figma-xs text-fw-bodyLight mb-3">
                  <span>{draft.nodes.length} nodes</span>
                  <span>{draft.edges.length} edges</span>
                  <span>{formatDate(draft.savedAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoad(draft)}
                    className="flex-1 px-3 py-1.5 rounded-full text-figma-xs font-medium text-white bg-fw-link hover:bg-fw-linkHover transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={(e) => handleDelete(draft, e)}
                    title="Delete draft"
                    className="p-1.5 rounded-full text-fw-bodyLight hover:bg-fw-errorLight hover:text-fw-error transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
