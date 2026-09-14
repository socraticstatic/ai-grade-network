import { useState, useRef } from 'react';
import { Upload, LayoutGrid, FolderOpen, ArrowLeft, Info, Trash2, Sparkles, Clock } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { DESIGNER_TEMPLATES } from './templates/templateDefinitions';
import { useDesignerStore } from './store/useDesignerStore';
import type { NetworkNode, NetworkEdge } from './types/designer';

type View = 'options' | 'import' | 'templates' | 'drafts';

interface WelcomeModalProps {
  onClose: () => void;
  onCreate: () => void;
  onLoadTemplate: (nodes: NetworkNode[], edges: NetworkEdge[]) => void;
}

export function WelcomeModal({ onClose, onCreate, onLoadTemplate }: WelcomeModalProps) {
  const [view, setView] = useState<View>('options');
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const drafts = useDesignerStore((s) => s.drafts);
  const loadDraft = useDesignerStore((s) => s.loadDraft);
  const deleteDraft = useDesignerStore((s) => s.deleteDraft);

  const handleLoadTemplate = (nodes: NetworkNode[], edges: NetworkEdge[]) => {
    onLoadTemplate(nodes, edges);
    onClose();
  };

  const handleLoadDraft = (id: string) => {
    loadDraft(id);
    onClose();
    window.addToast?.({ type: 'success', title: 'Draft Loaded', message: 'Topology restored from saved draft.', duration: 3000 });
  };

  const handleDeleteDraft = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteDraft(id);
    window.addToast?.({ type: 'info', title: 'Draft Deleted', message: 'Saved topology removed.', duration: 3000 });
  };

  const handleSimulateImport = () => {
    setIsImporting(true);
    // Simulate AI processing, then load a template
    setTimeout(() => {
      const template = DESIGNER_TEMPLATES[0]; // High Availability
      onLoadTemplate(template.nodes, template.edges);
      onClose();
      window.addToast?.({
        type: 'success',
        title: 'AI Import Complete',
        message: `Imported ${template.nodeCount} nodes and ${template.edgeCount} connections from your diagram.`,
        duration: 4000,
      });
    }, 2000);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-[700px] rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center" style={{ background: 'linear-gradient(180deg, #4a6a8a 0%, #3a5a7a 100%)' }}>
          <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <AttIcon name="hub" className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-figma-lg font-semibold text-white">Welcome to Cloud Designer</h2>
          <p className="text-figma-sm text-white/70 mt-1">
            Choose how you'd like to create your enterprise network
          </p>
        </div>

        {/* Body */}
        <div className="bg-fw-base px-6 py-6">
          {/* Options View */}
          {view === 'options' && (
            <div className="grid grid-cols-4 gap-3">
              {/* Create */}
              <button
                onClick={onCreate}
                className="group flex flex-col items-center text-center px-3 py-5 rounded-xl border border-transparent hover:border-fw-secondary hover:bg-fw-wash cursor-pointer transition-all duration-150"
              >
                <AttIcon name="hub" className="w-6 h-6 text-fw-bodyLight group-hover:text-fw-link transition-colors mb-3" />
                <span className="text-figma-base font-semibold text-fw-heading mb-1">Create</span>
                <span className="text-figma-xs text-fw-bodyLight leading-snug">Start with AT&T Core and customize your hub.</span>
              </button>

              {/* Import */}
              <button
                onClick={() => setView('import')}
                className="group flex flex-col items-center text-center px-3 py-5 rounded-xl border border-transparent hover:border-fw-secondary hover:bg-fw-wash cursor-pointer transition-all duration-150"
              >
                <Upload className="w-6 h-6 text-fw-bodyLight group-hover:text-fw-link transition-colors mb-3" />
                <span className="text-figma-base font-semibold text-fw-heading mb-1">Import</span>
                <span className="text-figma-xs text-fw-bodyLight leading-snug">Upload diagram and let AI recreate it.</span>
                <span className="mt-2 text-figma-xs text-fw-link font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI
                </span>
              </button>

              {/* Choose */}
              <button
                onClick={() => setView('templates')}
                className="group flex flex-col items-center text-center px-3 py-5 rounded-xl border border-transparent hover:border-fw-secondary hover:bg-fw-wash cursor-pointer transition-all duration-150"
              >
                <LayoutGrid className="w-6 h-6 text-fw-bodyLight group-hover:text-fw-link transition-colors mb-3" />
                <span className="text-figma-base font-semibold text-fw-heading mb-1">Choose</span>
                <span className="text-figma-xs text-fw-bodyLight leading-snug">Choose from pre-built enterprise patterns.</span>
              </button>

              {/* Open */}
              <button
                onClick={() => setView('drafts')}
                className="group flex flex-col items-center text-center px-3 py-5 rounded-xl border border-transparent hover:border-fw-secondary hover:bg-fw-wash cursor-pointer transition-all duration-150"
              >
                <FolderOpen className="w-6 h-6 text-fw-bodyLight group-hover:text-fw-link transition-colors mb-3" />
                <span className="text-figma-base font-semibold text-fw-heading mb-1">Open</span>
                <span className="text-figma-xs text-fw-bodyLight leading-snug">Continue working on saved topologies.</span>
                <span className="mt-2 text-figma-xs text-fw-bodyLight flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {drafts.length} saved
                </span>
              </button>
            </div>
          )}

          {/* Templates View */}
          {view === 'templates' && (
            <div>
              <div className="text-center mb-4">
                <LayoutGrid className="w-6 h-6 text-fw-bodyLight mx-auto mb-2" />
                <h3 className="text-figma-base font-semibold text-fw-heading">Choose a Template</h3>
                <p className="text-figma-xs text-fw-bodyLight mt-1">Start with a proven enterprise network pattern</p>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {DESIGNER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleLoadTemplate(tpl.nodes, tpl.edges)}
                    className="text-left p-4 rounded-xl border border-fw-secondary hover:border-fw-link hover:bg-fw-wash transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-figma-sm font-semibold text-fw-heading group-hover:text-fw-link transition-colors">{tpl.name}</span>
                      {tpl.name === 'High Availability' && (
                        <span className="text-[10px] font-medium text-fw-link bg-fw-accent px-1.5 py-0.5 rounded">Recommended</span>
                      )}
                    </div>
                    {/* No preview badges - title and description are sufficient */}
                    <p className="text-[11px] text-fw-bodyLight leading-snug mb-2 line-clamp-2">{tpl.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-fw-bodyLight">
                      <span>{tpl.nodeCount} nodes</span>
                      <span>{tpl.edgeCount} connections</span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setView('options')} className="flex items-center gap-1 text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Options
              </button>
            </div>
          )}

          {/* Drafts View */}
          {view === 'drafts' && (
            <div>
              <div className="text-center mb-4">
                <FolderOpen className="w-6 h-6 text-fw-bodyLight mx-auto mb-2" />
                <h3 className="text-figma-base font-semibold text-fw-heading">Your Saved Topologies</h3>
                <p className="text-figma-xs text-fw-bodyLight mt-1">Select a topology to continue working on it</p>
              </div>
              {drafts.length === 0 ? (
                <div className="text-center py-8 text-figma-sm text-fw-bodyLight">
                  No saved topologies yet. Create one and save it to see it here.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {drafts.map((draft) => (
                    <button
                      key={draft.id}
                      onClick={() => handleLoadDraft(draft.id)}
                      className="text-left p-4 rounded-xl border border-fw-secondary hover:border-fw-link hover:bg-fw-wash transition-all cursor-pointer group relative"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-figma-sm font-semibold text-fw-heading group-hover:text-fw-link transition-colors pr-6">{draft.name}</span>
                        <button
                          onClick={(e) => handleDeleteDraft(e, draft.id)}
                          className="absolute top-3 right-3 p-1 rounded text-fw-bodyLight hover:text-fw-error hover:bg-fw-errorLight transition-colors"
                          title="Delete draft"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-[11px] text-fw-bodyLight mb-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(draft.savedAt)}
                      </div>
                      <p className="text-[11px] text-fw-bodyLight leading-snug mb-2 line-clamp-2">{draft.description}</p>
                      <div className="flex items-center gap-3 text-[11px] text-fw-bodyLight">
                        <span>{draft.nodes.length} nodes</span>
                        <span>{draft.edges.length} connections</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setView('options')} className="flex items-center gap-1 text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Options
              </button>
            </div>
          )}

          {/* Import View */}
          {view === 'import' && (
            <div>
              <div className="text-center mb-4">
                <Upload className="w-6 h-6 text-fw-bodyLight mx-auto mb-2" />
                <h3 className="text-figma-base font-semibold text-fw-heading">AI Network Import</h3>
                <p className="text-figma-xs text-fw-bodyLight mt-1">Upload your diagram and let AI recreate it</p>
              </div>

              {/* How it works */}
              <div className="bg-fw-wash rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-fw-bodyLight flex-shrink-0" />
                  <span className="text-figma-sm font-medium text-fw-heading">How Import Works</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-figma-xs text-fw-body ml-6">
                  <span>- Identifies network devices</span>
                  <span>- Maps connection types</span>
                  <span>- Detects cloud providers</span>
                  <span>- Recreates topology</span>
                </div>
                <p className="text-[11px] text-fw-bodyLight mt-2 ml-6">Supports: LucidChart, Visio, PNG, JPG, PDF</p>
              </div>

              {/* Upload area */}
              {isImporting ? (
                <div className="border-2 border-fw-link border-dashed rounded-xl p-8 text-center bg-fw-accent">
                  <div className="animate-spin w-8 h-8 border-2 border-fw-link border-t-transparent rounded-full mx-auto mb-3" />
                  <p className="text-figma-sm font-medium text-fw-heading">Analyzing diagram with AI...</p>
                  <p className="text-figma-xs text-fw-bodyLight mt-1">Identifying nodes, connections, and cloud providers</p>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    dragOver ? 'border-fw-link bg-fw-accent' : 'border-fw-secondary hover:border-fw-link hover:bg-fw-wash'
                  }`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleSimulateImport(); }}
                >
                  <Upload className="w-8 h-8 text-fw-bodyLight mx-auto mb-2" />
                  <p className="text-figma-sm font-medium text-fw-heading">Upload Network Diagram</p>
                  <p className="text-figma-xs text-fw-bodyLight mt-1">PDF, PNG, JPG up to 10MB</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.vsdx"
                    className="hidden"
                    onChange={handleSimulateImport}
                  />
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => setView('options')} className="flex items-center gap-1 text-figma-sm text-fw-link hover:text-fw-linkHover transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Options
                </button>
                <button
                  onClick={handleSimulateImport}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-4 py-2 bg-fw-primary text-white rounded-lg text-figma-sm font-medium hover:bg-fw-primaryHover transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" /> Import with AI
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
