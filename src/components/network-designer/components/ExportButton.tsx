import { useState } from 'react';
import { Download, FileText, Image, Settings } from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../../types';
import { exportNetworkToPDF } from '../utils/pdfExporter';

interface ExportButtonProps {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  canvasRef: React.RefObject<HTMLElement>;
}

export function ExportButton({ nodes, edges, canvasRef }: ExportButtonProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handlePDFExport = async (includeMetadata: boolean = true) => {
    if (!canvasRef.current || nodes.length === 0) {
      window.addToast({
        type: 'warning',
        title: 'Nothing to Export',
        message: 'Please create a network design before exporting',
        duration: 3000
      });
      return;
    }

    setIsExporting(true);
    setShowExportMenu(false);

    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '_');
      const fileName = `network-design_${timestamp}.pdf`;

      await exportNetworkToPDF({
        nodes,
        edges,
        canvasElement: canvasRef.current,
        fileName,
        includeMetadata
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowExportMenu(!showExportMenu);
        }}
        disabled={isExporting || nodes.length === 0}
        className={`
          px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors
          ${nodes.length === 0
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isExporting
            ? 'bg-blue-100 text-blue-600 cursor-wait'
            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm'
          }
        `}
        title="Export Network Design"
        type="button"
      >
        <Download className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
        <span className="text-sm font-medium">
          {isExporting ? 'Exporting...' : 'Export'}
        </span>
      </button>

      {/* Export Menu */}
      {showExportMenu && !isExporting && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Export Network Design</h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">Choose your export format and options</p>
          </div>
          
          <div className="p-2">
            <button
              onClick={() => handlePDFExport(true)}
              className="w-full flex items-start px-3 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors"
              type="button"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-lg mr-3">
                <FileText className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="font-medium">PDF with Metadata</div>
                <div className="text-xs text-gray-500 leading-relaxed break-words">Complete documentation with network details</div>
              </div>
            </button>
            
            <button
              onClick={() => handlePDFExport(false)}
              className="w-full flex items-start px-3 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors"
              type="button"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg mr-3">
                <Image className="h-4 w-4 text-green-600" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="font-medium">PDF Diagram Only</div>
                <div className="text-xs text-gray-500 leading-relaxed break-words">Just the network topology diagram</div>
              </div>
            </button>
          </div>
          
          <div className="p-3 bg-gray-50 border-t border-gray-100 rounded-b-lg">
            <div className="flex items-start text-xs text-gray-600">
              <Settings className="h-3 w-3 mr-1" />
              <span className="leading-relaxed break-words">High-resolution export with detailed metadata</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Click outside to close */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  );
}