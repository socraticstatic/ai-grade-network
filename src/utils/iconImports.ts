// Optimized icon imports - only import what's actually used
// This file now serves as a single point of icon management

// Most frequently used icons - these will be in the main bundle
export { 
  Activity,
  Settings,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';

// Navigation icons - loaded with navigation
export { 
  Menu,
  Search,
  Bell,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';

// Connection and network icons - loaded with connection features
export {
  Network,
  Cloud,
  Server,
  Share2,
  Globe
} from 'lucide-react';

// Monitoring icons - loaded with monitoring features
export {
  BarChart2,
  TrendingUp,
  ArrowUpDown,
  Shield
} from 'lucide-react';

// Create a dynamic icon loader for less common icons
export const loadIcon = async (iconName: string) => {
  const iconModule = await import('lucide-react');
  return iconModule[iconName as keyof typeof iconModule];
};

// Pre-defined icon sets for bulk loading
export const loadMonitoringIcons = () => import('lucide-react').then(module => ({
  AlertTriangle: module.AlertTriangle,
  Clock: module.Clock,
  RefreshCw: module.RefreshCw,
  Download: module.Download,
  Filter: module.Filter
}));

export const loadWizardIcons = () => import('lucide-react').then(module => ({
  Check: module.Check,
  ArrowRight: module.ArrowRight,
  Info: module.Info,
  Upload: module.Upload
}));