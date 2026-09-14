import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Shield, CheckCircle, Loader2, Activity } from 'lucide-react';

interface FailoverTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionName: string;
}

interface TestResult {
  failoverTime: string;
  packetLoss: string;
  bgpReconvergence: string;
  pathsSurvived: string;
  status: 'PASSED' | 'FAILED';
}

export function FailoverTestModal({ isOpen, onClose, connectionName }: FailoverTestModalProps) {
  const [phase, setPhase] = useState<'idle' | 'testing' | 'done'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<TestResult | null>(null);

  useEffect(() => {
    if (phase !== 'testing') return;
    const duration = 2500;
    const interval = 50;
    const increment = (interval / duration) * 100;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      setProgress(Math.min(current, 100));
      if (current >= 100) {
        clearInterval(timer);
        setResult({
          failoverTime: '0.8s',
          packetLoss: '0 packets',
          bgpReconvergence: '1.2s',
          pathsSurvived: '2/4',
          status: 'PASSED',
        });
        setPhase('done');
      }
    }, interval);

    return () => clearInterval(timer);
  }, [phase]);

  const handleStart = () => {
    setPhase('testing');
    setProgress(0);
    setResult(null);
  };

  const handleClose = () => {
    setPhase('idle');
    setProgress(0);
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-fw-base rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-fw-secondary">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-fw-link" />
            <h3 className="text-figma-lg font-bold text-fw-heading">Failover Test</h3>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-fw-wash text-fw-bodyLight">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          {phase === 'idle' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-fw-link/10 flex items-center justify-center mx-auto">
                <Activity className="h-8 w-8 text-fw-link" />
              </div>
              <div>
                <p className="text-figma-base font-medium text-fw-heading">Simulate site failure for</p>
                <p className="text-figma-lg font-bold text-fw-heading mt-1">{connectionName}</p>
              </div>
              <p className="text-figma-sm text-fw-bodyLight">
                This test simulates a datacenter failure and measures failover time, packet loss, and BGP reconvergence. No actual traffic is affected.
              </p>
              <button
                onClick={handleStart}
                className="px-6 h-10 rounded-full bg-fw-primary text-white text-figma-base font-medium hover:bg-fw-primaryHover transition-colors"
              >
                Run Failover Test
              </button>
            </div>
          )}

          {phase === 'testing' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 text-fw-link animate-spin mx-auto" />
              <p className="text-figma-base font-medium text-fw-heading">Simulating site failure...</p>
              <div className="h-2 bg-fw-neutral rounded-full overflow-hidden">
                <div className="h-full bg-fw-link rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-figma-xs text-fw-bodyLight">
                {progress < 30 ? 'Initiating failover sequence...' :
                 progress < 60 ? 'BFD detecting path failure...' :
                 progress < 85 ? 'BGP reconverging routes...' :
                 'Verifying traffic flow...'}
              </p>
            </div>
          )}

          {phase === 'done' && result && (
            <div className="space-y-5">
              <div className="text-center">
                <CheckCircle className="h-14 w-14 text-fw-success mx-auto" />
                <p className="text-figma-lg font-bold text-fw-success mt-3">Test {result.status}</p>
                <p className="text-figma-sm text-fw-bodyLight mt-1">Your connection survived the simulated failure</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-fw-wash rounded-xl p-3 text-center">
                  <p className="text-figma-xl font-bold text-fw-heading">{result.failoverTime}</p>
                  <p className="text-figma-xs text-fw-bodyLight mt-0.5">Failover Time</p>
                </div>
                <div className="bg-fw-wash rounded-xl p-3 text-center">
                  <p className="text-figma-xl font-bold text-fw-heading">{result.packetLoss}</p>
                  <p className="text-figma-xs text-fw-bodyLight mt-0.5">Packet Loss</p>
                </div>
                <div className="bg-fw-wash rounded-xl p-3 text-center">
                  <p className="text-figma-xl font-bold text-fw-heading">{result.bgpReconvergence}</p>
                  <p className="text-figma-xs text-fw-bodyLight mt-0.5">BGP Reconvergence</p>
                </div>
                <div className="bg-fw-wash rounded-xl p-3 text-center">
                  <p className="text-figma-xl font-bold text-fw-heading">{result.pathsSurvived}</p>
                  <p className="text-figma-xs text-fw-bodyLight mt-0.5">Paths Survived</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === 'done' && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-fw-secondary">
            <button
              onClick={handleClose}
              className="px-5 h-9 rounded-full bg-fw-primary text-white text-figma-base font-medium hover:bg-fw-primaryHover transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
