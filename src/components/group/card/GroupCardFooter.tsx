import { ChevronRight } from 'lucide-react';

interface GroupCardFooterProps {
  onManageClick: (e: React.MouseEvent) => void;
}

export function GroupCardFooter({ onManageClick }: GroupCardFooterProps) {
  return (
    <div className="px-6 pb-6 pt-2 mt-auto flex items-center justify-center">
      <button
        onClick={onManageClick}
        className="w-full flex items-center justify-center h-9 px-4 rounded-full text-figma-base font-medium text-fw-link hover:text-fw-linkHover hover:bg-fw-wash transition-colors"
        style={{ maxWidth: '320px' }}
      >
        <ChevronRight className="mr-1.5 h-5 w-5" />
        Manage Pool
      </button>
    </div>
  );
}
