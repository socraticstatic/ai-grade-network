import { DivideIcon as LucideIcon } from 'lucide-react';

export interface WidgetDefinition {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'gray';
  minW?: number;
  minH?: number;
  defaultW?: number;
  defaultH?: number;
  component: React.ComponentType<any>;
}

export interface WidgetInstance {
  id: string;
  widgetId: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    w: number;
    h: number;
  };
  config?: any;
}