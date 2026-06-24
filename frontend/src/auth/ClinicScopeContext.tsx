import { createContext, useContext, useState, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getActiveClinic, setActiveClinic } from '../lib/api';

interface ClinicScopeState {
  /** The clinic a super admin has scoped the whole app to ('' = all/none). */
  activeClinicId: string;
  setActiveClinicId: (id: string) => void;
}

const ClinicScopeContext = createContext<ClinicScopeState | undefined>(undefined);

export function ClinicScopeProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [activeClinicId, setId] = useState<string>(() => getActiveClinic());

  const setActiveClinicId = (id: string) => {
    setActiveClinic(id); // persist + drive the X-Clinic-Id request header
    setId(id);
    // Every cached query was fetched under the previous scope — refetch all.
    qc.invalidateQueries();
  };

  return (
    <ClinicScopeContext.Provider value={{ activeClinicId, setActiveClinicId }}>
      {children}
    </ClinicScopeContext.Provider>
  );
}

export function useClinicScope() {
  const ctx = useContext(ClinicScopeContext);
  if (!ctx)
    throw new Error('useClinicScope must be used within ClinicScopeProvider');
  return ctx;
}
