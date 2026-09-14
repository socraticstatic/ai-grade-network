import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Connection } from '../../types';
import { WidgetDrawer } from './WidgetDrawer';
import { WidgetGrid } from './WidgetGrid';
import { WidgetDefinition, WidgetInstance } from './types';
import { useStore } from '../../store/useStore';
import { AgenticAssistantDemo } from './AgenticAssistantDemo';
import { ExternalLink } from 'lucide-react';

interface ControlCenterProps {
  connections: Connection[];
}

const INSIGHTS_INIT_KEY = 'insights-initialized';

const DEFAULT_WIDGET_IDS: Array<{ id: string; w: number; h: number }> = [
  { id: 'network-status', w: 2, h: 1 },
  { id: 'quick-actions', w: 1, h: 1 },
  { id: 'security-overview', w: 2, h: 1 },
  { id: 'billing-overview', w: 2, h: 1 }
];

export function ControlCenter({ connections }: ControlCenterProps) {
  const { widgets, addWidget, updateWidget, removeWidget, reorderWidgets } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const alreadyInitialized = localStorage.getItem(INSIGHTS_INIT_KEY);
    if (!alreadyInitialized && widgets.length === 0) {
      localStorage.setItem(INSIGHTS_INIT_KEY, 'true');
      let yOffset = 0;
      DEFAULT_WIDGET_IDS.forEach(({ id, w, h }) => {
        const instance: WidgetInstance = {
          id: `${id}-default`,
          widgetId: id,
          position: { x: 0, y: yOffset },
          size: { w, h }
        };
        addWidget(instance);
        yOffset += h;
      });
    }
  }, []);

  const handleAddWidget = (widget: WidgetDefinition) => {
    const newWidget: WidgetInstance = {
      id: `${widget.id}-${Date.now()}`,
      widgetId: widget.id,
      position: {
        x: 0,
        y: Math.max(...widgets.map(w => w.position.y + w.size.h), 0)
      },
      size: {
        w: widget.defaultW || 1,
        h: widget.defaultH || 1
      }
    };

    addWidget(newWidget);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    const oldIndex = widgets.findIndex(w => w.id === active.id);
    const newIndex = widgets.findIndex(w => w.id === over.id);

    if (oldIndex !== newIndex) {
      const newWidgets = [...widgets];
      const [movedWidget] = newWidgets.splice(oldIndex, 1);
      newWidgets.splice(newIndex, 0, movedWidget);
      reorderWidgets(newWidgets);
    }
  };

  const handleDetach = () => {
    const base = window.location.href.split('#')[0];
    window.open(
      `${base}#/detached/insights`,
      '_blank',
      'popup,width=1440,height=900,left=80,top=60'
    );
  };

  const handleRemoveWidget = (widgetId: string) => {
    removeWidget(widgetId);

    window.addToast({
      type: 'success',
      title: 'Widget Removed',
      message: 'Widget has been removed from your dashboard',
      duration: 3000
    });
  };

  const handleUpdateWidget = (widgetId: string, updates: Partial<WidgetInstance>) => {
    updateWidget(widgetId, updates);
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Toolbar — lives above the positioned canvas so the drawer can't eat it */}
      <div className="flex items-center justify-end px-3 pt-2 pb-1">
        <button
          onClick={handleDetach}
          className="tab-button flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-fw-bodyLight hover:text-fw-body bg-fw-base border border-fw-secondary rounded-lg hover:bg-fw-wash transition-colors"
          title="Open Insights in a separate window"
        >
          <ExternalLink className="h-3 w-3" />
          Pop out
        </button>
      </div>

      <div className="relative min-h-[calc(100vh-16rem)] bg-fw-wash rounded-2xl">
        <WidgetGrid
          widgets={widgets}
          activeId={activeId}
          onRemoveWidget={handleRemoveWidget}
          onUpdateWidget={handleUpdateWidget}
          connections={connections}
        />

        <WidgetDrawer onAddWidget={handleAddWidget} />
        <AgenticAssistantDemo />
      </div>
    </DndContext>
  );
}