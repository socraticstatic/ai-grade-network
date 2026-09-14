import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { WidgetDefinition } from './types';
import { AVAILABLE_WIDGETS } from './widgets';

interface WidgetDrawerProps {
  onAddWidget: (widget: WidgetDefinition) => void;
}

export function WidgetDrawer({ onAddWidget }: WidgetDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddWidget = (widget: WidgetDefinition) => {
    onAddWidget(widget);
    setIsOpen(false); // Close drawer immediately after adding widget

    window.addToast({
      type: 'success',
      title: 'Widget Added',
      message: `${widget.title} widget has been added to your dashboard`,
      duration: 3000
    });
  };

  return (
    <div
      className={`
        absolute top-0 bottom-0 right-0 bg-fw-base border-l border-fw-secondary shadow-lg
        transition-all duration-300 ease-in-out z-10
        ${isOpen ? 'w-80' : 'w-10'}
      `}
    >
      {/* Collapsed State */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-full w-full flex flex-col items-center pt-4 text-fw-bodyLight hover:text-fw-heading hover:bg-fw-wash transition-colors"
          aria-label="Open widget drawer"
        >
          <div className="w-6 h-6 rounded-full bg-fw-neutral flex items-center justify-center mb-12">
            <ChevronLeft className="h-4 w-4" />
          </div>
          <div className="rotate-90 origin-center whitespace-nowrap">
            <span className="text-figma-sm font-medium">Add Widgets</span>
          </div>
        </button>
      )}

      {/* Expanded State */}
      {isOpen && (
        <>
          {/* Header */}
          <div className="p-4 border-b border-fw-secondary">
            <div className="flex items-center justify-between">
              <h3 className="text-figma-lg font-bold text-fw-heading tracking-[-0.03em]">Add Widgets</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-fw-bodyLight hover:text-fw-bodyLight rounded-full hover:bg-fw-neutral"
                aria-label="Close widget drawer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Widget Categories */}
          <div className="p-4 space-y-6 overflow-y-auto" style={{ height: 'calc(100% - 65px)' }}>
            {Object.entries(AVAILABLE_WIDGETS).map(([category, widgets]) => (
              <div key={category}>
                <h4 className="text-figma-sm font-medium text-fw-heading mb-3 tracking-[-0.03em]">{category}</h4>
                <div className="space-y-2">
                  {widgets.map((widget) => (
                    <button
                      key={widget.id}
                      onClick={() => handleAddWidget(widget)}
                      className="widget-card w-full p-3 bg-fw-base border border-fw-secondary rounded-lg hover:border-fw-active hover:shadow-sm transition-all duration-200 text-left group"
                      style={{ borderRadius: '0.5rem !important' }}
                    >
                      <div className="flex items-center">
                        <div className={`
                          p-2 rounded-lg
                          ${widget.color === 'blue' ? 'bg-fw-accent' :
                            widget.color === 'green' ? 'bg-fw-successLight' :
                            widget.color === 'gray' ? 'bg-fw-wash' :
                            
                            'bg-fw-wash'}
                        `}>
                          <widget.icon className={`
                            h-4 w-4
                            ${widget.color === 'blue' ? 'text-fw-link' :
                              widget.color === 'green' ? 'text-fw-success' :
                              widget.color === 'gray' ? 'text-fw-bodyLight' :
                              
                              'text-fw-bodyLight'}
                          `} />
                        </div>
                        <div className="ml-3 flex-1">
                          <h5 className="text-figma-sm font-medium text-fw-heading group-hover:text-fw-link">
                            {widget.title}
                          </h5>
                          <p className="text-figma-sm text-fw-bodyLight mt-0.5 line-clamp-2">
                            {widget.description}
                          </p>
                        </div>
                        <Plus className="h-4 w-4 text-fw-bodyLight group-hover:text-fw-link" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
