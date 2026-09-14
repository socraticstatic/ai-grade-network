import { createContext, useContext, useState, ReactNode } from 'react';

export interface BusinessOutcomes {
  latency: number;
  bandwidth: number;
  availability: number;
  security: 'basic' | 'enhanced' | 'enterprise';
  redundancy: boolean;
  multiRegion: boolean;
  costPriority: 'low' | 'medium' | 'high';
  complianceRequired: boolean;
  sustainabilityPriority: 'low' | 'medium' | 'high';
  renewableEnergyPreferred: boolean;
  carbonNeutralGoal: boolean;
}

interface OutcomesContextType {
  outcomes: BusinessOutcomes;
  updateOutcomes: (outcomes: Partial<BusinessOutcomes>) => void;
  hasOutcomes: boolean;
}

const defaultOutcomes: BusinessOutcomes = {
  latency: 50,
  bandwidth: 1000,
  availability: 99.9,
  security: 'basic',
  redundancy: false,
  multiRegion: false,
  costPriority: 'medium',
  complianceRequired: false,
  sustainabilityPriority: 'medium',
  renewableEnergyPreferred: false,
  carbonNeutralGoal: false,
};

const OutcomesContext = createContext<OutcomesContextType | undefined>(undefined);

export function OutcomesProvider({ children }: { children: ReactNode }) {
  const [outcomes, setOutcomes] = useState<BusinessOutcomes>(defaultOutcomes);
  const [hasOutcomes, setHasOutcomes] = useState(false);

  const updateOutcomes = (newOutcomes: Partial<BusinessOutcomes>) => {
    setOutcomes(prev => ({ ...prev, ...newOutcomes }));
    setHasOutcomes(true);
  };

  return (
    <OutcomesContext.Provider value={{ outcomes, updateOutcomes, hasOutcomes }}>
      {children}
    </OutcomesContext.Provider>
  );
}

export function useOutcomes() {
  const context = useContext(OutcomesContext);
  if (context === undefined) {
    throw new Error('useOutcomes must be used within an OutcomesProvider');
  }
  return context;
}
