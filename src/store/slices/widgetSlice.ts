import { StateCreator } from 'zustand';
import { WidgetInstance } from '../../components/control-center/types';

export interface WidgetSlice {
  widgets: WidgetInstance[];
  addWidget: (widget: WidgetInstance) => void;
  updateWidget: (id: string, updates: Partial<WidgetInstance>) => void;
  removeWidget: (id: string) => void;
  reorderWidgets: (widgets: WidgetInstance[]) => void;
}

export const createWidgetSlice: StateCreator<WidgetSlice> = (set) => ({
  widgets: [],
  addWidget: (widget) => 
    set((state) => ({ widgets: [...state.widgets, widget] })),
  updateWidget: (id, updates) =>
    set((state) => ({
      widgets: state.widgets.map((widget) =>
        widget.id === id ? { ...widget, ...updates } : widget
      ),
    })),
  removeWidget: (id) =>
    set((state) => ({
      widgets: state.widgets.filter((widget) => widget.id !== id),
    })),
  reorderWidgets: (widgets) => set({ widgets }),
});