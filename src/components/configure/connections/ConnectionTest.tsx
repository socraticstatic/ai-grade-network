import { useState } from 'react';
import { Play, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface ConnectionTestProps {
  connectionId: string | null;
}

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'running' | 'pending';
  message?: string;
  duration?: number;
}

export function ConnectionTest({ connectionId }: ConnectionTestProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([
    { name: 'DNS Resolution', status: 'pending' },
    { name: 'Port Availability', status: 'pending' },
    { name: 'Latency Check', status: 'pending' },
    { name: 'Bandwidth Test', status: 'pending' },
    { name: 'Security Verification', status: 'pending' },
  ]);

  const runTests = async () => {
    setIsRunning(true);

    for (let i = 0; i < results.length; i++) {
      setResults(prev => [
        ...prev.slice(0, i),
        { ...prev[i], status: 'running' },
        ...prev.slice(i + 1),
      ]);

      // Simulate test running
      await new Promise(resolve => setTimeout(resolve, 1500));

      setResults(prev => [
        ...prev.slice(0, i),
        {
          ...prev[i],
          status: Math.random() > 0.2 ? 'success' : 'error',
          duration: Math.floor(Math.random() * 1000),
          message: Math.random() > 0.2
            ? 'Test completed successfully'
            : 'Failed to complete test',
        },
        ...prev.slice(i + 1),
      ]);
    }

    setIsRunning(false);
  };

  if (!connectionId) {
    return (
      <div className="text-center py-12 text-figma-base font-medium text-fw-bodyLight tracking-[-0.03em]">
        Select a connection to run tests
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`
            inline-flex items-center px-4 py-2 h-9 border border-transparent rounded-full text-figma-base font-medium tracking-[-0.03em] text-white transition-colors
            ${isRunning
              ? 'bg-fw-neutral cursor-not-allowed'
              : 'bg-fw-cobalt-600 hover:bg-fw-cobalt-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fw-active'
            }
          `}
        >
          {isRunning ? (
            <RefreshCw className="animate-spin h-5 w-5 mr-2" />
          ) : (
            <Play className="h-5 w-5 mr-2" />
          )}
          {isRunning ? 'Running Tests...' : 'Run Tests'}
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div
            key={index}
            className={`
              p-4 rounded-xl border
              ${result.status === 'success' ? 'border-fw-success bg-fw-successLight' :
                result.status === 'error' ? 'border-fw-error bg-fw-errorLight' :
                result.status === 'running' ? 'border-fw-active bg-fw-accent' :
                'border-fw-secondary bg-fw-wash'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {result.status === 'success' && <CheckCircle className="h-5 w-5 text-fw-success mr-2" />}
                {result.status === 'error' && <XCircle className="h-5 w-5 text-fw-error mr-2" />}
                {result.status === 'running' && <RefreshCw className="h-5 w-5 text-fw-link mr-2 animate-spin" />}
                {result.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-fw-secondary mr-2" />}
                <span className="text-figma-base font-bold text-fw-heading tracking-[-0.03em]">{result.name}</span>
              </div>
              {result.duration && (
                <span className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em]">
                  {result.duration}ms
                </span>
              )}
            </div>
            {result.message && (
              <p className="mt-1 text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] ml-7">
                {result.message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
