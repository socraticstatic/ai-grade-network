import { Divide as LucideIcon } from 'lucide-react';
import { NetworkNode, NetworkEdge } from '../../../types';

interface PreviewIcon {
  icon: LucideIcon;
  color: string;
}

interface PreviewColumn {
  type: 'col';
  icons: PreviewIcon[];
}

export interface Template {
  name: string;
  description: string;
  preview: {
    icons: PreviewColumn[];
  };
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}