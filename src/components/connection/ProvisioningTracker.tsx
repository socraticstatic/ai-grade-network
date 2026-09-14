import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle, Send, Shield, Server, Radio, Zap } from 'lucide-react';

export type ProvisioningStep = 'submitted' | 'validating' | 'provisioning' | 'bgp-establishing' | 'active';

interface StepConfig {
  id: ProvisioningStep;
  label: string;
  description: string;
  icon: React.ReactNode;
  duration: number; // ms
}

const STEPS: StepConfig[] = [
  { id: 'submitted', label: 'Order Submitted', description: 'Connection order received and queued', icon: <Send className="h-4 w-4" />, duration: 2000 },
  { id: 'validating', label: 'Validating Credentials', description: 'Verifying provider account and permissions', icon: <Shield className="h-4 w-4" />, duration: 3500 },
  { id: 'provisioning', label: 'Provisioning Infrastructure', description: 'Allocating ports and configuring cross-connects', icon: <Server className="h-4 w-4" />, duration: 4000 },
  { id: 'bgp-establishing', label: 'Establishing BGP', description: 'Negotiating BGP sessions and exchanging routes', icon: <Radio className="h-4 w-4" />, duration: 3000 },
  { id: 'active', label: 'Active', description: 'Connection is live and passing traffic', icon: <Zap className="h-4 w-4" />, duration: 0 },
];

interface ProvisioningTrackerProps {
  connectionId: string;
  onComplete: (connectionId: string) => void;
  onFailed?: (connectionId: string) => void;
  compact?: boolean;
}

export function ProvisioningTracker({ connectionId, onComplete, compact = false }: ProvisioningTrackerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepProgress, setStepProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const advanceStep = useCallback(() => {
    setCurrentStepIndex(prev => {
      const next = prev + 1;
      if (next >= STEPS.length - 1) {
        // Final step (active)
        setCompleted(true);
        setTimeout(() => onComplete(connectionId), 800);
        return STEPS.length - 1;
      }
      return next;
    });
    setStepProgress(0);
  }, [connectionId, onComplete]);

  useEffect(() => {
    if (completed) return;

    const step = STEPS[currentStepIndex];
    if (!step || step.duration === 0) return;

    const interval = 50;
    const increment = (interval / step.duration) * 100;

    const timer = setInterval(() => {
      setStepProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setTimeout(advanceStep, 300);
          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentStepIndex, completed, advanceStep]);

  if (compact) {
    const currentStep = STEPS[currentStepIndex];
    const overallProgress = ((currentStepIndex + stepProgress / 100) / (STEPS.length - 1)) * 100;

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-figma-sm">
          <span className="font-medium text-fw-link flex items-center gap-1.5">
            {completed ? (
              <Check className="h-3.5 w-3.5 text-fw-success" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            {completed ? 'Active' : currentStep.label}
          </span>
          <span className="text-fw-disabled">
            {currentStepIndex + 1}/{STEPS.length}
          </span>
        </div>
        <div className="h-1.5 bg-fw-neutral rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-fw-link rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${completed ? 100 : overallProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-fw-base border border-fw-secondary rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-figma-base font-bold text-fw-heading">Provisioning Status</h3>
        {!completed && (
          <span className="text-figma-sm text-fw-disabled">
            Step {Math.min(currentStepIndex + 1, STEPS.length)} of {STEPS.length}
          </span>
        )}
      </div>

      <div className="space-y-1">
        {STEPS.map((step, index) => {
          const isActive = index === currentStepIndex && !completed;
          const isDone = index < currentStepIndex || completed;
          const isFuture = index > currentStepIndex && !completed;

          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isDone
                    ? 'bg-fw-success border-fw-success text-white'
                    : isActive
                      ? 'bg-fw-link border-fw-link text-white'
                      : 'bg-fw-base border-fw-secondary text-fw-disabled'
                  }
                `}>
                  <AnimatePresence mode="wait">
                    {isDone ? (
                      <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                        <Check className="h-4 w-4" />
                      </motion.div>
                    ) : isActive ? (
                      <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </motion.div>
                    ) : (
                      <span className="text-figma-sm font-medium">{index + 1}</span>
                    )}
                  </AnimatePresence>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`w-0.5 h-8 transition-colors duration-300 ${
                    isDone ? 'bg-fw-success' : 'bg-fw-secondary'
                  }`} />
                )}
              </div>

              {/* Step content */}
              <div className="pt-1 flex-1 min-w-0">
                <div className={`text-figma-base font-medium transition-colors duration-300 ${
                  isDone ? 'text-fw-success' : isActive ? 'text-fw-heading' : 'text-fw-disabled'
                }`}>
                  {step.label}
                </div>
                {(isActive || isDone) && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="text-figma-sm text-fw-body mt-0.5"
                  >
                    {step.description}
                  </motion.p>
                )}
                {isActive && (
                  <div className="mt-2 h-1 bg-fw-neutral rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-fw-link rounded-full"
                      style={{ width: `${stepProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
