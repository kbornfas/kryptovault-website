import { createContext, useContext, useState } from 'react';

interface PlanContextType {
  selectedPlan: string | null;
  setSelectedPlan: (plan: string | null) => void;
}

const PlanContext = createContext<PlanContextType | null>(null);

export const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
};

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <PlanContext.Provider value={{ selectedPlan, setSelectedPlan }}>
      {children}
    </PlanContext.Provider>
  );
};