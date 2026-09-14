import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationState {
  isVertical: boolean;
  expandedSections: Record<string, boolean>;
  setIsVertical: (isVertical: boolean) => void;
  toggleSection: (sectionId: string) => void;
  expandSection: (sectionId: string) => void;
  collapseSection: (sectionId: string) => void;
}

const NavigationContext = createContext<NavigationState | undefined>(undefined);

function useNavigationState() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationState must be used within a NavigationProvider');
  }
  return context;
}

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationStateProvider({ children }: NavigationProviderProps) {
  const [isVertical, setIsVertical] = useState<boolean>(() => {
    // Try to get from local storage
    const stored = localStorage.getItem('navIsVertical');
    return stored ? JSON.parse(stored) : false;
  });
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Try to get from local storage
    const stored = localStorage.getItem('navExpandedSections');
    return stored ? JSON.parse(stored) : {};
  });
  
  const location = useLocation();
  
  // Persist state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('navIsVertical', JSON.stringify(isVertical));
  }, [isVertical]);
  
  useEffect(() => {
    localStorage.setItem('navExpandedSections', JSON.stringify(expandedSections));
  }, [expandedSections]);
  
  // Auto-expand section containing active route
  useEffect(() => {
    // This would need the mapping of routes to section IDs
    // For now, this is a placeholder implementation
    const path = location.pathname.split('/')[1];
    if (path && isVertical) {
      // Ideally, we'd have a map of paths to section IDs
      const sectionId = 'main'; // Default to main for now
      setExpandedSections(prev => ({
        ...prev,
        [sectionId]: true
      }));
    }
  }, [location, isVertical]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const expandSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: true
    }));
  };

  const collapseSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: false
    }));
  };

  return (
    <NavigationContext.Provider
      value={{
        isVertical,
        expandedSections,
        setIsVertical,
        toggleSection,
        expandSection,
        collapseSection
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}