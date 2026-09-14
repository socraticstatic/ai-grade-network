import { useNavigate } from 'react-router-dom';
import { Wrench, Clock, ExternalLink } from 'lucide-react';
import { Button } from '../common/Button';

export function MaintenancePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-8 py-6 bg-fw-wash">
      <div className="flex flex-col items-center text-center max-w-[480px] w-full">

        {/* Branding */}
        <div className="mb-10">
          <h2 className="text-[20px] font-bold text-fw-heading tracking-[-0.03em]">
            AT&T AI-grade network
          </h2>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-fw-warnLight flex items-center justify-center mb-8">
          <Wrench className="w-10 h-10 text-fw-warn" />
        </div>

        {/* Heading */}
        <h1 className="text-[24px] font-bold text-fw-heading tracking-[-0.04em] mb-3">
          Scheduled Maintenance
        </h1>

        {/* Description */}
        <p className="text-figma-base text-fw-body tracking-[-0.03em] leading-relaxed mb-6">
          We're performing scheduled maintenance to improve system reliability.
        </p>

        {/* Maintenance window card */}
        <div className="w-full bg-white rounded-2xl border border-fw-secondary p-5 mb-8 text-left">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-fw-bodyLight shrink-0" />
            <span className="text-figma-sm font-medium text-fw-bodyLight tracking-[-0.03em] uppercase">
              Maintenance Window
            </span>
          </div>
          <p className="text-figma-base font-semibold text-fw-heading tracking-[-0.03em]">
            March 22, 2026
          </p>
          <p className="text-figma-sm text-fw-body tracking-[-0.03em] mt-1">
            02:00 AM - 06:00 AM EST
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full">
          <Button
            variant="primary"
            size="lg"
            icon={ExternalLink}
            fullWidth
            onClick={() => window.open('https://status.att.com', '_blank', 'noopener,noreferrer')}
          >
            Check Status
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onClick={() => navigate('/login')}
          >
            Return to Login
          </Button>
        </div>

      </div>
    </div>
  );
}
