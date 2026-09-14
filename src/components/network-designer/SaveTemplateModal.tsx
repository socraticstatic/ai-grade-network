import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../types';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}

export function SaveTemplateModal({ isOpen, onClose, onSave }: SaveTemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }
    
    onSave(templateName, templateDescription);
    
    // Reset form
    setTemplateName('');
    setTemplateDescription('');
    setError('');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[150]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Save className="h-5 w-5 mr-2 text-blue-600" />
            Save Network as Template
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="templateName" className="block text-sm font-medium text-gray-700 mb-1">
                Template Name*
              </label>
              <input
                type="text"
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Multi-Region VPC Network"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="templateDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe your template..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
            
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}