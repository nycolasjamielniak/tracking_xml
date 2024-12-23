import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useOrganization } from '../contexts/OrganizationContext';

interface Workspace {
  id: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
  workspaces: Workspace[];
}

export function OrganizationSelector() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    selectedOrganization,
    selectedWorkspace,
    setSelectedOrganization,
    setSelectedWorkspace
  } = useOrganization();

  const fetchOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const response = await api.get('/organizations');
      setOrganizations(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao buscar organizações');
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    setSelectedWorkspace('');
  }, [selectedOrganization]);

  const getSelectedOrgWorkspaces = () => {
    const org = organizations.find(org => org.id === selectedOrganization);
    return org?.workspaces || [];
  };

  return (
    <div className="organization-nav">
      <div className="select-container">
        <select
          value={selectedOrganization}
          onChange={(e) => setSelectedOrganization(e.target.value)}
          className="nav-select"
          disabled={isLoadingOrgs}
        >
          <option value="">Organização</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        {error && <span className="nav-error">{error}</span>}
      </div>

      <div className="select-container">
        <select
          value={selectedWorkspace}
          onChange={(e) => setSelectedWorkspace(e.target.value)}
          className="nav-select"
          disabled={!selectedOrganization}
        >
          <option value="">Workspace</option>
          {getSelectedOrgWorkspaces().map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
} 