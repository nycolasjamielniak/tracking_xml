import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { authService } from './services/auth';
import './App.css';
import { OrganizationSelector } from './components/OrganizationSelector';
import { OrganizationProvider } from './contexts/OrganizationContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <OrganizationProvider>
      <div className="app">
        <nav className="nav-main">
          <div className="nav-left">
            <a href="/trips/create">Criar Viagem</a>
            <a href="/orders/create">Criar Pedidos</a>
            <a href="/integrations/history">Histórico de Integrações</a>
          </div>
          <OrganizationSelector />
        </nav>
        {/* resto do conteúdo */}
      </div>
    </OrganizationProvider>
  );
}

export default App; 