import { Suspense, ReactNode, useEffect, useState } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertCircle } from 'lucide-react';

interface AsyncBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  loadingText?: string;
  minDelay?: number; // Minimum loading display time to prevent flashes
  retryOnError?: boolean;
}

export function AsyncBoundary({
  children,
  fallback,
  errorFallback,
  loadingText,
  minDelay = 0,
  retryOnError = true
}: AsyncBoundaryProps) {
  const [delayElapsed, setDelayElapsed] = useState(minDelay === 0);
  const [errorRetries, setErrorRetries] = useState(0);
  
  // If a min delay is specified, set a timer
  useEffect(() => {
    if (minDelay > 0) {
      const timer = setTimeout(() => {
        setDelayElapsed(true);
      }, minDelay);
      
      return () => clearTimeout(timer);
    }
  }, [minDelay]);
  
  const defaultFallback = (
    <div className="flex items-center justify-center p-8 min-h-[300px]">
      <LoadingSpinner size="md" text={loadingText || "Loading..."} />
    </div>
  );

  const defaultErrorFallback = (
    <div className="flex flex-col items-center justify-center p-8 min-h-[300px] bg-fw-errorLight rounded-lg border border-fw-errorLight">
      <AlertCircle className="h-12 w-12 text-fw-error mb-4" />
      <h3 className="text-lg font-medium text-fw-error mb-2">
        Unable to load content
      </h3>
      <p className="text-figma-base text-fw-error text-center max-w-md mb-4">
        We encountered a problem loading this content. Please try again later.
      </p>
    </div>
  );

  // Reset error retries when the component is remounted
  useEffect(() => {
    setErrorRetries(0);
  }, [children]);

  return (
    <ErrorBoundary 
      fallback={errorFallback || defaultErrorFallback}
      onReset={() => {
        setErrorRetries(prev => prev + 1);
      }}
    >
      <Suspense fallback={delayElapsed ? (fallback || defaultFallback) : null}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}