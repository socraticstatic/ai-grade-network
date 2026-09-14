import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ConnectionCardActionProps {
  connectionId: string;
}

/**
 * Action component for the connection card
 * Provides a button to navigate to the connection details
 */
export function ConnectionCardAction({
  connectionId
}: ConnectionCardActionProps) {
  const navigate = useNavigate();
  
  return (
    <div className="p-6 border-t border-fw-secondary">
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/connections/${connectionId}`);
        }}
        className="w-full flex items-center justify-center h-9 px-4 rounded-full text-figma-base font-medium text-fw-link hover:text-fw-linkHover hover:bg-fw-wash transition-colors"
      >
        <ChevronRight className="mr-1.5 h-5 w-5" />
        Manage Connection
      </button>
    </div>
  );
}