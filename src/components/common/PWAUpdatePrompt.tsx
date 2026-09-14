import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

interface PWAUpdatePromptProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export function PWAUpdatePrompt({ onUpdate, onDismiss }: PWAUpdatePromptProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-md animate-slide-up">
      <div className="bg-fw-base rounded-2xl border border-fw-secondary p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-fw-accent flex items-center justify-center">
            <Download className="w-5 h-5 text-fw-link" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-figma-base font-semibold text-fw-heading mb-1">
              Update Available
            </h3>
            <p className="text-figma-base font-medium text-fw-body mb-3">
              A new version is ready. Update now for the latest features.
            </p>

            <div className="flex gap-2">
              <button
                onClick={onUpdate}
                className="px-4 py-2 bg-fw-active text-white text-figma-base font-medium rounded-full hover:bg-fw-linkHover transition-colors"
              >
                Update Now
              </button>
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-fw-neutral text-fw-body text-figma-base font-medium rounded-full hover:bg-fw-wash transition-colors"
              >
                Later
              </button>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-fw-bodyLight hover:text-fw-body transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function usePWAUpdate() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Check for updates periodically
        const interval = setInterval(() => {
          reg.update();
        }, 60 * 60 * 1000); // Every hour

        return () => clearInterval(interval);
      });

      // Listen for update available
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowPrompt(true);
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  return {
    showPrompt,
    handleUpdate,
    handleDismiss
  };
}
