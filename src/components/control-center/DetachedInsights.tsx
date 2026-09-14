import { useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { X, LayoutGrid } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { WidgetGrid } from './WidgetGrid';
import { WidgetDrawer } from './WidgetDrawer';
import { AgenticAssistantDemo } from './AgenticAssistantDemo';
import { WidgetDefinition, WidgetInstance } from './types';
import { AttIcon } from '../icons/AttIcon';

export function DetachedInsights() {
  const connections = useStore(state => state.connections);
  const { widgets, addWidget, updateWidget, removeWidget, reorderWidgets } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [widgetCount, setWidgetCount] = useState(widgets.length);

  // Update tab title to reflect widget count
  useEffect(() => {
    document.title = `Insights — AI-grade network`;
  }, []);

  useEffect(() => {
    setWidgetCount(widgets.length);
  }, [widgets.length]);

  const handleAddWidget = (widget: WidgetDefinition) => {
    const newWidget: WidgetInstance = {
      id: `${widget.id}-${Date.now()}`,
      widgetId: widget.id,
      position: {
        x: 0,
        y: Math.max(...widgets.map(w => w.position.y + w.size.h), 0),
      },
      size: {
        w: widget.defaultW || 1,
        h: widget.defaultH || 1,
      },
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
      const next = [...widgets];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      reorderWidgets(next);
    }
  };

  const handleRemoveWidget = (widgetId: string) => {
    removeWidget(widgetId);
  };

  const handleUpdateWidget = (widgetId: string, updates: Partial<WidgetInstance>) => {
    updateWidget(widgetId, updates);
  };

  return (
    <div className="min-h-screen bg-fw-wash flex flex-col">
      {/* Minimal chrome — 44px tall, no nav, just identity + close */}
      <header className="h-11 px-4 flex items-center justify-between bg-fw-base border-b border-fw-secondary shrink-0 select-none">
        <div className="flex items-center gap-2.5">
          <AttIcon name="hub" className="h-3.5 w-3.5 text-fw-link" />
          <span className="text-figma-sm font-semibold text-fw-heading tracking-[-0.03em]">
            Insights
          </span>
          <span className="text-[11px] text-fw-secondary">|</span>
          <span className="text-[11px] text-fw-bodyLight">AI-grade network</span>
          {widgetCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-fw-bodyLight">
              <LayoutGrid className="h-3 w-3" />
              {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button
          onClick={() => window.close()}
          className="tab-button flex items-center gap-1.5 text-[11px] text-fw-bodyLight hover:text-fw-body transition-colors px-2 py-1 rounded hover:bg-fw-wash"
          title="Close window"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </header>

      {/* Widget canvas — full remaining height */}
      <div className="flex-1 overflow-auto">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="relative min-h-[calc(100vh-2.75rem)]">
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
      </div>
    </div>
  );
}
