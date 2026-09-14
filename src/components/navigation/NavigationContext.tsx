import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Settings, Bell, User, HelpCircle } from 'lucide-react';
import { AttIcon } from '../icons/AttIcon';
import { NAV_DISCOVER, NAV_LAYERS, type CuratedNavItem } from './navItems';

interface NavigationSection {
  id: string;
  title: string;
  icon: ReactNode;
  items: Array<{
    id: string;
    label: string;
    icon: ReactNode;
    path: string;
    disabled?: boolean;
  }>;
}

interface NavigationContextType {
  isVerticalNav: boolean;
  toggleNavMode: () => void;
  expandedSections: Record<string, boolean>;
  toggleSection: (sectionId: string) => void;
  navigationSections: NavigationSection[];
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [isVerticalNav, setIsVerticalNav] = useState(() => {
    const saved = localStorage.getItem('isVerticalNav');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('expandedNavSections');
    return saved ? JSON.parse(saved) : {
      main: true,
      naas: true,
      ai: true,
      settings: false,
      help: false,
    };
  });

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('isVerticalNav', JSON.stringify(isVerticalNav));
  }, [isVerticalNav]);

  useEffect(() => {
    localStorage.setItem('expandedNavSections', JSON.stringify(expandedSections));
  }, [expandedSections]);

  const toggleNavMode = () => {
    setIsVerticalNav(prev => !prev);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  /* Item ids are derived from the path, not the label: NaaS and the AI Fabric
     carry the same four verb labels, so a label-derived id would collide. The
     path is what is unique. */
  const toSectionItem = (navItem: CuratedNavItem) => ({
    id: navItem.to.replace(/^\//, '').replace(/\//g, '-'),
    label: navItem.label,
    icon: <AttIcon name={navItem.icon} className="h-5 w-5" />,
    path: navItem.to
  });

  // Define navigation sections with their items. Discover sits alone above
  // both domains; each domain is its own collapsible section, mirroring
  // NAV_LAYERS rather than re-flattening it.
  const navigationSections: NavigationSection[] = [
    {
      id: 'main',
      title: 'Main Navigation',
      icon: <Settings className="h-5 w-5" />,
      items: [toSectionItem(NAV_DISCOVER)]
    },
    ...NAV_LAYERS.map(domain => ({
      id: domain.key,
      title: domain.label,
      icon: <AttIcon name={domain.items[0].icon} className="h-5 w-5" />,
      items: domain.items.map(toSectionItem)
    })),
    {
      id: 'settings',
      title: 'User Settings',
      icon: <User className="h-5 w-5" />,
      items: [
        { 
          id: 'profile', 
          label: 'Profile', 
          icon: <User className="h-5 w-5" />, 
          path: '/profile' 
        },
        { 
          id: 'notifications', 
          label: 'Notifications', 
          icon: <Bell className="h-5 w-5" />, 
          path: '/notifications' 
        }
      ]
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: <HelpCircle className="h-5 w-5" />,
      items: [
        { 
          id: 'support', 
          label: 'Help & Resources', 
          icon: <HelpCircle className="h-5 w-5" />, 
          path: '/support' 
        }
      ]
    }
  ];

  return (
    <NavigationContext.Provider
      value={{
        isVerticalNav,
        toggleNavMode,
        expandedSections,
        toggleSection,
        navigationSections
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}