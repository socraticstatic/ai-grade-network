import { useSortable, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';
import { Connection } from '../../types';
import { WidgetInstance } from './types';
import { AVAILABLE_WIDGETS } from './widgets';

interface WidgetGridProps {
  widgets: WidgetInstance[];
  activeId: string | null;
  onRemoveWidget: (id: string) => void;
  onUpdateWidget: (id: string, updates: Partial<WidgetInstance>) => void;
  connections: Connection[];
}

function SortableWidget({
  widget,
  widgetDef,
  connections,
  onRemove,
  onUpdate
}: {
  widget: WidgetInstance;
  widgetDef: any;
  connections: Connection[];
  onRemove: () => void;
  onUpdate: (updates: Partial<WidgetInstance>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    gridColumn: `span ${widget.size.w}`,
    gridRow: `span ${widget.size.h}`
  };

  const Component = widgetDef.component;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`
        bg-fw-base rounded-xl border border-fw-secondary group
        transition-all duration-200 hover:shadow-sm
        ${isDragging ? 'opacity-40 shadow-lg scale-[0.98]' : ''}
      `}
    >
      {/* Widget Header — controls appear on hover */}
      <div className="px-4 pt-3.5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <widgetDef.icon className="h-3.5 w-3.5 text-fw-bodyLight flex-shrink-0" />
          <h3 className="text-figma-sm font-semibold text-fw-heading tracking-[-0.03em] truncate">
            {widgetDef.title}
          </h3>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-2 flex-shrink-0">
          <button
            {...listeners}
            className="p-1 text-fw-disabled hover:text-fw-body rounded cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-fw-disabled hover:text-fw-error rounded transition-colors"
            title="Remove widget"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Hairline separator */}
      <div className="h-px bg-fw-secondary mx-4" />

      {/* Widget Content */}
      <div className="p-4">
        <Component
          connections={connections}
          config={widget.config}
          onConfigChange={(config: any) => onUpdate({ config })}
        />
      </div>
    </div>
  );
}

export function WidgetGrid({
  widgets,
  activeId,
  onRemoveWidget,
  onUpdateWidget,
  connections
}: WidgetGridProps) {
  const allWidgets = Object.values(AVAILABLE_WIDGETS).flat();
  const items = widgets.map(w => w.id);

  return (
    <SortableContext items={items} strategy={rectSortingStrategy}>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-16">
        {widgets.map((widget) => {
          const widgetDef = allWidgets.find(w => w.id === widget.widgetId);
          if (!widgetDef) return null;

          return (
            <SortableWidget
              key={widget.id}
              widget={widget}
              widgetDef={widgetDef}
              connections={connections}
              onRemove={() => onRemoveWidget(widget.id)}
              onUpdate={(updates) => onUpdateWidget(widget.id, updates)}
            />
          );
        })}

        {/* Empty State */}
        {widgets.length === 0 && (
          <div className="col-span-full flex flex-col items-start justify-center py-16 px-2">
            <p className="text-figma-2xl font-bold text-fw-heading tracking-[-0.03em] mb-2">
              Your Insights dashboard is empty
            </p>
            <p className="text-figma-base text-fw-bodyLight max-w-md">
              Add widgets from the panel on the right. Drag to rearrange once you've built your layout.
            </p>
          </div>
        )}
      </div>
    </SortableContext>
  );
}
