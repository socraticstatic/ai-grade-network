import { Users, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function ImpersonationBanner() {
  const { impersonation, exitImpersonation } = useStore();

  if (!impersonation.isImpersonating || !impersonation.targetUser) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
      <div className="flex items-center gap-4 px-6 py-3 bg-fw-base rounded-full border border-fw-secondary shadow-lg">
        <Users className="h-5 w-5 text-fw-bodyLight shrink-0" />
        <span className="text-figma-base font-medium text-fw-body tracking-[-0.03em] whitespace-nowrap">
          You are currently impersonating the user{' '}
          <span className="font-bold text-fw-heading">{impersonation.targetUser.name}</span>.
        </span>
        <button
          onClick={exitImpersonation}
          className="text-figma-base font-medium text-fw-link tracking-[-0.03em] underline hover:text-fw-linkHover transition-colors whitespace-nowrap"
        >
          Stop impersonation
        </button>
      </div>
    </div>
  );
}
