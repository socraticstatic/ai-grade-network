/**
 * Utility function to download CSV data
 */
export function downloadCSV(data: string, filename: string = 'data.csv'): void {
  // Create blob with CSV data
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Add to DOM and click
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download the icon inventory CSV
 */
export function downloadIconInventory(): void {
  const csvData = `Category,Term/Word,Current Icon,Usage Context,Priority,Notes,File Location
Navigation,Create,PlusCircle,Main navigation,High,Primary action button,src/components/navigation/MainNav.tsx
Navigation,Manage,Settings,Main navigation,High,Primary navigation item,src/components/navigation/MainNav.tsx
Navigation,Monitor,BarChart2,Main navigation,High,Primary navigation item,src/components/navigation/MainNav.tsx
Navigation,Configure,SlidersHorizontal,Main navigation,High,Primary navigation item,src/components/navigation/MainNav.tsx
Navigation,Search,Search,Search functionality,High,Used throughout app,src/components/navigation/SearchBar.tsx
Navigation,Menu,Menu,Mobile menu toggle,High,Mobile navigation,src/components/navigation/MainNav.tsx
Navigation,Back,ArrowLeft,Navigation back button,High,Used in details pages,src/components/navigation/SubNav.tsx
Navigation,Notifications,Bell,Notification button,High,Header notifications,src/components/navigation/NotificationsButton.tsx
Navigation,Help,HelpCircle,Help and support,High,Help resources,src/components/navigation/HelpButton.tsx
Navigation,User Profile,User,User menu,High,User account access,src/components/navigation/UserMenu.tsx

Connection Types,Internet to Cloud,Globe,Connection type selection,High,Primary connection type,src/components/wizard/screens/ConnectionTypeSelection.tsx
Connection Types,Cloud to Cloud,Lock,Connection type selection,Medium,Future connection type,src/components/wizard/screens/ConnectionTypeSelection.tsx
Connection Types,VPN to Cloud,Lock,Connection type selection,Medium,Future connection type,src/components/wizard/screens/ConnectionTypeSelection.tsx
Connection Types,DataCenter to Cloud,Network,Connection type selection,Medium,Future connection type,src/components/wizard/screens/ConnectionTypeSelection.tsx
Connection Types,Site to Cloud,Network,Connection type selection,Medium,Future connection type,src/components/wizard/screens/ConnectionTypeSelection.tsx
Connection Types,Direct Connect,Network,Connection visualization,High,Connection edge type,src/components/network-designer/Edge.tsx
Connection Types,Hub,Router,Connection visualization,High,Connection edge type,src/components/network-designer/Edge.tsx
Connection Types,Ultra-Low Latency,Zap,Connection visualization,Medium,Premium connection type,src/components/network-designer/Edge.tsx
Connection Types,Quantum Secure,Shield,Connection visualization,Medium,Secure connection type,src/components/network-designer/Edge.tsx
Connection Types,Backbone,Network,Connection visualization,Medium,Infrastructure connection,src/components/network-designer/Edge.tsx
Connection Types,AVPN,Network,Connection visualization,Medium,VPN connection type,src/components/network-designer/Edge.tsx

Cloud Providers,AWS,Cloud,Provider selection,High,Major cloud provider,src/components/wizard/screens/ProviderSelection.tsx
Cloud Providers,Azure,Cloud,Provider selection,High,Major cloud provider,src/components/wizard/screens/ProviderSelection.tsx
Cloud Providers,Google Cloud,Cloud,Provider selection,High,Major cloud provider,src/components/wizard/screens/ProviderSelection.tsx
Cloud Providers,Oracle Cloud,Cloud,Provider selection,Medium,Future cloud provider,src/components/wizard/screens/ProviderSelection.tsx
Cloud Providers,IBM Cloud,Cloud,Provider selection,Medium,Future cloud provider,src/components/wizard/screens/ProviderSelection.tsx
Cloud Providers,Equinix,Server,Colocation provider,Medium,Infrastructure provider,src/components/wizard/screens/ProviderSelection.tsx
Cloud Providers,Digital Realty,Building,Data center provider,Medium,Infrastructure provider,src/components/wizard/screens/ProviderSelection.tsx

Status Indicators,Active,CheckCircle,Status display,High,Connection status,src/components/connection/ConnectionCard.tsx
Status Indicators,Inactive,XCircle,Status display,High,Connection status,src/components/connection/ConnectionCard.tsx
Status Indicators,Pending,Clock,Status display,High,Processing status,src/components/connection/ConnectionCard.tsx
Status Indicators,Provisioning,Settings,Status display,Medium,Setup status,src/components/connection/vnf/VNFCard.tsx
Status Indicators,Error,AlertTriangle,Error states,High,Error indication,src/components/connection/vnf/VNFCard.tsx
Status Indicators,Healthy,CheckCircle,Health status,High,System health,src/components/group/card/GroupCardMetrics.tsx
Status Indicators,Warning,AlertTriangle,Warning status,High,Warning indication,src/components/group/card/GroupCardMetrics.tsx
Status Indicators,Critical,AlertCircle,Critical status,High,Critical alerts,src/components/group/card/GroupCardMetrics.tsx

Actions,Edit,Edit2,Edit functionality,High,Edit actions throughout,src/components/common/OverflowMenu.tsx
Actions,Delete,Trash2,Delete functionality,High,Delete actions throughout,src/components/common/OverflowMenu.tsx
Actions,Download,Download,Export functionality,High,Data export,src/components/ConnectionGrid.tsx
Actions,Upload,Upload,Import functionality,Medium,Data import,src/components/wizard/screens/AdvancedSettings.tsx
Actions,Save,Save,Save functionality,High,Save operations,src/components/network-designer/Toolbar.tsx
Actions,Cancel,X,Cancel operations,High,Cancel dialogs,src/components/common/Modal.tsx
Actions,Refresh,RefreshCw,Data refresh,High,Refresh data,src/components/monitoring/tabs/RefreshControls.tsx
Actions,Filter,Filter,Filter controls,High,Data filtering,src/components/common/FilterButton.tsx
Actions,Export,Download,Data export,High,Export functionality,src/components/GroupGrid.tsx
Actions,Import,Upload,Data import,Medium,Import functionality,src/components/wizard/screens/AdvancedSettings.tsx`;

  downloadCSV(csvData, 'icon-inventory.csv');
}