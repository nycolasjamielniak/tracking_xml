import React, { createContext, useContext, useState } from 'react';

interface OrganizationContextType {
  selectedOrganization: string;
  selectedWorkspace: string;
  setSelectedOrganization: (id: string) => void;
  setSelectedWorkspace: (id: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState('');

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        selectedWorkspace,
        setSelectedOrganization,
        setSelectedWorkspace,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within a OrganizationProvider');
  }
  return context;
} 