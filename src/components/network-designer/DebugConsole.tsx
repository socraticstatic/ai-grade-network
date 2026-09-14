import { useState, useEffect } from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';

interface DebugLog {
  timestamp: number;
  message: string;
  data?: any;
  type: 'info' | 'warn' | 'error';
}

interface DebugConsoleProps {
  logs: DebugLog[];
  onClear: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ logs, onClear }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(log => log.type === filter);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed bg-gray-900 text-gray-100 font-mono text-xs shadow-2xl border border-gray-700 transition-all ${
        isMinimized ? 'bottom-4 right-4 w-80 h-12' : 'bottom-4 right-4 w-96 h-96'
      }`}
      style={{ zIndex: 9999 }}
    >
      {/* Header */}
      <div className="bg-gray-800 px-3 py-2 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="font-semibold">Network Designer Debug Console</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-400 hover:text-white transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Controls */}
          <div className="bg-gray-800 px-3 py-2 flex items-center justify-between border-b border-gray-700">
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-2 py-1 rounded text-xs ${
                  filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All ({logs.length})
              </button>
              <button
                onClick={() => setFilter('info')}
                className={`px-2 py-1 rounded text-xs ${
                  filter === 'info' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Info
              </button>
              <button
                onClick={() => setFilter('warn')}
                className={`px-2 py-1 rounded text-xs ${
                  filter === 'warn' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Warn
              </button>
              <button
                onClick={() => setFilter('error')}
                className={`px-2 py-1 rounded text-xs ${
                  filter === 'error' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Error
              </button>
            </div>
            <button
              onClick={onClear}
              className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs hover:bg-gray-600"
            >
              Clear
            </button>
          </div>

          {/* Logs */}
          <div className="overflow-y-auto p-2 space-y-1" style={{ height: 'calc(100% - 80px)' }}>
            {filteredLogs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No logs to display</div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border ${
                    log.type === 'error'
                      ? 'bg-red-900/20 border-red-700'
                      : log.type === 'warn'
                      ? 'bg-yellow-900/20 border-yellow-700'
                      : 'bg-gray-800 border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-gray-400 text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}.
                        {String(log.timestamp % 1000).padStart(3, '0')}
                      </div>
                      <div className="mt-1 font-medium">{log.message}</div>
                      {log.data && (
                        <pre className="mt-1 text-xs text-gray-300 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div
                      className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
                        log.type === 'error'
                          ? 'bg-red-600 text-white'
                          : log.type === 'warn'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {log.type.toUpperCase()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Hook to use the debug console
export const useDebugConsole = () => {
  const [logs, setLogs] = useState<DebugLog[]>([]);

  const log = (message: string, data?: any, type: 'info' | 'warn' | 'error' = 'info') => {
    setLogs(prev => [...prev, {
      timestamp: Date.now(),
      message,
      data,
      type
    }]);
  };

  const clear = () => setLogs([]);

  return {
    logs,
    log,
    clear,
    info: (message: string, data?: any) => log(message, data, 'info'),
    warn: (message: string, data?: any) => log(message, data, 'warn'),
    error: (message: string, data?: any) => log(message, data, 'error')
  };
};
