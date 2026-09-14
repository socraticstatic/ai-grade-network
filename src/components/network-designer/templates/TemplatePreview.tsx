import { DivideIcon as LucideIcon } from 'lucide-react';
import { PreviewColumn } from './types';

interface TemplatePreviewProps {
  icons: PreviewColumn[];
}

export function TemplatePreview({ icons }: TemplatePreviewProps) {
  return (
    <div className="h-12 flex items-center justify-center mb-2 bg-fw-wash rounded">
      <div className="flex items-center space-x-3 scale-75">
        {icons.map((col, colIndex) => (
          <div key={colIndex} className="flex flex-col space-y-2">
            {col.icons.map((icon, iconIndex) => {
              const Icon = icon.icon;
              return (
                <div key={iconIndex} className="flex items-center justify-center">
                  <Icon className={`h-5 w-5 ${icon.color}`} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}