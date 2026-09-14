import { useState } from 'react';
import { X } from 'lucide-react';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

export function SaveTemplateModal({ isOpen, onClose, onSave }: SaveTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim());
    setName('');
    setDescription('');
    onClose();
  }

  function handleClose() {
    setName('');
    setDescription('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-fw-base rounded-2xl border border-fw-secondary shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-figma-base font-semibold text-fw-heading">Save as Template</h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-fw-bodyLight hover:bg-fw-wash transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-figma-sm font-medium text-fw-body mb-1">
              Template Name <span className="text-fw-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My HA Setup"
              className="w-full px-3 py-2 rounded-lg border border-fw-secondary bg-fw-wash text-figma-sm text-fw-heading placeholder:text-fw-disabled focus:outline-none focus:border-fw-link transition-colors"
            />
          </div>
          <div>
            <label className="block text-figma-sm font-medium text-fw-body mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this topology..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-fw-secondary bg-fw-wash text-figma-sm text-fw-heading placeholder:text-fw-disabled focus:outline-none focus:border-fw-link transition-colors resize-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-full text-figma-sm font-medium text-fw-body hover:bg-fw-wash transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className={`px-4 py-2 rounded-full text-figma-sm font-medium transition-colors ${
              name.trim()
                ? 'bg-fw-link text-white hover:bg-fw-linkHover'
                : 'bg-fw-neutral text-fw-disabled cursor-not-allowed'
            }`}
          >
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}
