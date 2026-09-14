import { X, History, Clock, Network } from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../types';
import { formatters } from '../../utils/formatters';

interface HistoryItem {
  id: string;
  timestamp: number;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  preview: string;
}

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onRestoreTopology: (nodes: NetworkNode[], edges: NetworkEdge[]) => void;
}

export function HistoryDrawer({ isOpen, onClose, history, onRestoreTopology }: HistoryDrawerProps) {
  if (!isOpen) return null;

  const handleRestore = (item: HistoryItem) => {
    onRestoreTopology(item.nodes, item.edges);
    onClose();
  };

  const getTopologyStats = (nodes: NetworkNode[], edges: NetworkEdge[]) => {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const types = new Set(nodes.map(n => n.type));

    return { nodeCount, edgeCount, types: types.size };
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-50"
        onClick={onClose}
      />

      <div className="fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <History className="h-5 w-5 text-gray-700 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Topology History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <History className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600">
                No topology history yet. Create a network design to save it here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase font-medium">
                {history.length === 1 ? 'Saved Topology' : `Last ${history.length} Topologies`}
              </p>
              {history.map((item, index) => {
                const stats = getTopologyStats(item.nodes, item.edges);
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleRestore(item)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center mr-2">
                          <Network className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Topology #{history.length - index}
                          </div>
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatTimeAgo(item.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center">
                        <span className="font-medium">{stats.nodeCount}</span>
                        <span className="ml-1">nodes</span>
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center">
                        <span className="font-medium">{stats.edgeCount}</span>
                        <span className="ml-1">edges</span>
                      </div>
                      <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                      <div className="flex items-center">
                        <span className="font-medium">{stats.types}</span>
                        <span className="ml-1">types</span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {item.preview}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(item);
                      }}
                      className="mt-3 w-full px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      Restore Topology
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            Automatically saves your last 3 topology states
          </p>
        </div>
      </div>
    </>
  );
}
