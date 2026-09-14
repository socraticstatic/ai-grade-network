import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';

export function NoInternetPage() {
  return (
    <div className="min-h-screen bg-fw-wash flex items-center justify-center p-4">
      <div className="flex flex-col items-center text-center max-w-[420px]">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-fw-secondary/50 flex items-center justify-center mb-8">
          <WifiOff className="w-12 h-12 text-fw-bodyLight" />
        </div>

        {/* Heading */}
        <h1 className="text-[32px] font-bold text-fw-heading tracking-[-0.04em] mb-3">
          No Internet Connection
        </h1>

        {/* Description */}
        <p className="text-figma-base text-fw-body tracking-[-0.03em] leading-relaxed mb-2">
          It looks like you are not connected to the internet. Please check your network settings and try again.
        </p>

        <p className="text-figma-sm text-fw-bodyLight tracking-[-0.03em] mb-8">
          Make sure Wi-Fi or ethernet is enabled and your router is working properly.
        </p>

        {/* Try Again Button */}
        <Button
          variant="primary"
          size="lg"
          icon={RefreshCw}
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    </div>
  );
}