import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface CSVOrder {
  id: string;
  uniqueId: string;
  customerCNPJ: string;
  customerName: string;
  originCNPJ: string;
  originName: string;
  pickupDate: string;
  destinationCNPJ: string;
  destinationName: string;
  deliveryDate: string;
  itemCode: string;
  itemDescription: string;
  itemVolume: number;
  itemWeight: number;
  itemQuantity: number;
  itemUnit: string;
  itemUnitPrice: number;
  merchandiseType: string;
  isDangerous: boolean;
  needsEscort: boolean;
  integrationStatus?: 'pending' | 'success' | 'error';
  integrationCode?: string;
  integrationError?: string;
}

interface OrderValidation {
  id: string;
  errors: string[];
}

interface Workspace {
  id: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
  workspaces: Workspace[];
}

function InstructionsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content instructions-modal">
        <div className="modal-header">
          <h2>Instruções de Preenchimento</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="instructions-grid">
            <div className="instruction-group">
              <h3>Informações do Cliente</h3>
              <ul>
                <li><strong>id:</strong> Identificador único do pedido</li>
                <li><strong>customer_cnpj:</strong> CNPJ do cliente (somente números)</li>
                <li><strong>customer_name:</strong> Nome do cliente</li>
              </ul>
            </div>
            <div className="instruction-group">
              <h3>Origem</h3>
              <ul>
                <li><strong>origin_cnpj:</strong> CNPJ do ponto de origem (somente números)</li>
                <li><strong>origin_name:</strong> Nome do ponto de origem</li>
                <li><strong>pickup_date:</strong> Data de coleta (formato: DD/MM/YYYY HH:MM)</li>
              </ul>
            </div>
            <div className="instruction-group">
              <h3>Destino</h3>
              <ul>
                <li><strong>destination_cnpj:</strong> CNPJ do ponto de destino (somente números)</li>
                <li><strong>destination_name:</strong> Nome do ponto de destino</li>
                <li><strong>delivery_date:</strong> Data de entrega (formato: DD/MM/YYYY HH:MM)</li>
              </ul>
            </div>
            <div className="instruction-group">
              <h3>Informações do Item</h3>
              <ul>
                <li><strong>item_code:</strong> Código do item</li>
                <li><strong>item_description:</strong> Descrição do item</li>
                <li><strong>item_volume:</strong> Volume em m³</li>
                <li><strong>item_weight:</strong> Peso em kg</li>
                <li><strong>item_quantity:</strong> Quantidade</li>
                <li><strong>item_unit:</strong> Unidade de medida</li>
                <li><strong>item_unit_price:</strong> Valor unitário</li>
              </ul>
            </div>
            <div className="instruction-group">
              <h3>Características do Pedido</h3>
              <ul>
                <li><strong>merchandise_type:</strong> Tipo de mercadoria</li>
                <li><strong>is_dangerous:</strong> Mercadoria perigosa (true/false)</li>
                <li><strong>needs_escort:</strong> Necessita escolta (true/false)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function validateCNPJ(cnpj: string): string {
  // Converte para string caso seja número
  const cnpjString = String(cnpj);
  
  // Remove todos os caracteres não numéricos e espaços
  const cleanCNPJ = cnpjString.trim().replace(/[^\d]/g, '');
  
  // Log para debug
  console.log({
    original: cnpj,
    originalType: typeof cnpj,
    originalLength: cnpj.length,
    cleaned: cleanCNPJ,
    cleanedLength: cleanCNPJ.length
  });
  
  if (cleanCNPJ.length !== 14) {
    if (cleanCNPJ.length < 14) {
      return `CNPJ incompleto (faltam ${14 - cleanCNPJ.length} dígitos)`;
    } else {
      return `CNPJ inválido (${cleanCNPJ.length - 14} dígitos excedentes)`;
    }
  }
  return '';
}

function validateOrder(order: CSVOrder): string[] {
  const errors: string[] = [];
  
  // Validação de CNPJ
  const customerCNPJError = validateCNPJ(order.customerCNPJ);
  if (customerCNPJError) {
    errors.push(`CNPJ do cliente ${customerCNPJError}`);
  }

  const originCNPJError = validateCNPJ(order.originCNPJ);
  if (originCNPJError) {
    errors.push(`CNPJ de origem ${originCNPJError}`);
  }

  const destinationCNPJError = validateCNPJ(order.destinationCNPJ);
  if (destinationCNPJError) {
    errors.push(`CNPJ de destino ${destinationCNPJError}`);
  }

  // Validação de valores zerados
  if (order.itemQuantity <= 0) {
    errors.push('Quantidade inválida');
  }
  if (order.itemWeight <= 0) {
    errors.push('Peso inválido');
  }
  if (order.itemVolume <= 0) {
    errors.push('Volume inválido');
  }

  return errors;
}

function getOrdersStats(orders: CSVOrder[]) {
  const total = orders.length;
  const validOrders = orders.filter(order => validateOrder(order).length === 0).length;
  const problemLines = orders
    .map((order, index) => validateOrder(order).length > 0 ? index + 1 : null)
    .filter((line): line is number => line !== null);
  return { total, validOrders, problemLines };
}

export function OrdersImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedOrders, setProcessedOrders] = useState<CSVOrder[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Por favor, selecione um arquivo CSV válido');
      setFile(null);
    }
  };

  const generateUniqueId = (index: number, orderId: string): string => {
    const timestamp = Date.now();
    return `${index}-${orderId}-${timestamp}`;
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor, selecione um arquivo CSV');
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/orders/upload', formData);
      
      if (response.data.validation_errors && Object.keys(response.data.validation_errors).length > 0) {
        const errorMessages = Object.entries(response.data.validation_errors)
          .map(([id, errors]) => `Pedido ${id}: ${(errors as string[]).join(', ')}`)
          .join('\n');
        setError(`Erros de validação:\n${errorMessages}`);
        return;
      }
      
      const ordersWithUniqueIds = response.data.orders.map((order: CSVOrder, index: number) => ({
        ...order,
        uniqueId: generateUniqueId(index, order.id)
      }));
      
      setProcessedOrders(ordersWithUniqueIds);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao processar arquivo');
      console.error('Erro:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleIntegrateOrders = async () => {
    if (!processedOrders.length) return;
    if (!selectedOrganization) {
      setError('Por favor, selecione uma organização');
      return;
    }
    if (!selectedWorkspace) {
      setError('Por favor, selecione um workspace');
      return;
    }

    // Verifica erros em todas as ordens
    const ordersWithErrors = processedOrders.filter(order => validateOrder(order).length > 0);
    
    if (ordersWithErrors.length > 0) {
      const confirm = window.confirm(
        `Existem ${ordersWithErrors.length} pedido(s) com inconformidades. Deseja continuar mesmo assim?`
      );
      if (!confirm) return;
    }

    setIsIntegrating(true);
    setError(null);

    // Marca todos os pedidos como pendentes
    setProcessedOrders(orders => 
      orders.map(order => ({
        ...order,
        integrationStatus: 'pending',
        integrationCode: undefined,
        integrationError: undefined
      }))
    );

    try {
      const response = await api.post('/orders/matrix-cargo', 
        processedOrders,
        {
          headers: {
            'Organization-Id': selectedOrganization,
            'Workspace-Id': selectedWorkspace
          }
        }
      );

      // Atualiza o status de cada pedido com base na resposta usando uniqueId
      setProcessedOrders(orders => 
        orders.map(order => {
          // Procura o resultado correspondente pelo uniqueId
          const successResult = response.data.results.find(r => r.uniqueId === order.uniqueId);
          const errorResult = response.data.errors.find(e => e.uniqueId === order.uniqueId);
          
          if (successResult) {
            return {
              ...order,
              integrationStatus: 'success',
              integrationCode: successResult.result.code
            };
          }
          
          if (errorResult) {
            return {
              ...order,
              integrationStatus: 'error',
              integrationError: errorResult.error || 'Erro na integração'
            };
          }
          
          // Se não encontrou nenhum resultado, mantém como erro
          return {
            ...order,
            integrationStatus: 'error',
            integrationError: 'Não foi possível determinar o status da integração'
          };
        })
      );

      // Atualiza mensagem baseada no total de sucessos/falhas
      const totalSuccess = response.data.success;
      const totalFailed = response.data.failed;
      
      if (totalFailed === 0) {
        alert('Todos os pedidos foram integrados com sucesso!');
        setFile(null);
      } else {
        setError(`${totalFailed} pedido(s) falharam na integração. Verifique os detalhes na tabela.`);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao integrar pedidos');
      // Marca todos os pedidos como erro em caso de falha geral
      setProcessedOrders(orders => 
        orders.map(order => ({
          ...order,
          integrationStatus: 'error',
          integrationError: 'Falha na integração'
        }))
      );
    } finally {
      setIsIntegrating(false);
    }
  };

  const generateExampleCSV = () => {
    const headers = [
      'id',
      'customer_cnpj',
      'customer_name',
      'origin_cnpj',
      'origin_name',
      'pickup_date',
      'destination_cnpj',
      'destination_name',
      'delivery_date',
      'item_code',
      'item_description',
      'item_volume',
      'item_weight',
      'item_quantity',
      'item_unit',
      'item_unit_price',
      'merchandise_type',
      'is_dangerous',
      'needs_escort'
    ];

    const exampleData = [
      'ABC30201',
      '10000000000001',
      'EFGC',
      '21042870000000',
      'FOFORNFORM',
      '31/05/2025 08:30',
      '10000000000001',
      'EFGC',
      '31/05/2025 14:30',
      '1',
      'MP',
      '8.346',
      '2503.8',
      '1',
      'un',
      '1000',
      'MP',
      'false',
      'false'
    ];

    const csvContent = [
      headers.join(','),
      exampleData.join(',')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'exemplo_pedidos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="orders-import">
      <div className="upload-section">
        <h1>Importação de Pedidos via CSV</h1>
        <div className="csv-instructions-compact">
          <div className="instructions-header">
            <p>
              Para importar pedidos, faça o download do arquivo CSV de exemplo e preencha com seus dados.
            </p>
            <div className="instructions-actions">
              <button 
                onClick={() => setShowInstructions(true)}
                className="view-instructions-button"
              >
                📋 Ver Instruções de Preenchimento
              </button>
              <button 
                onClick={generateExampleCSV}
                className="download-example-button"
              >
                📥 Baixar CSV de Exemplo
              </button>
            </div>
          </div>
        </div>

        <div className="upload-container">
          <div className="file-input-wrapper">
            <label className="select-file-button" htmlFor="csv-input">
              Selecionar Arquivo CSV
            </label>
            <input
              id="csv-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <span className="selected-files">
              {file ? file.name : 'Nenhum arquivo selecionado'}
            </span>
          </div>
          
          <button 
            onClick={handleUpload}
            disabled={isLoading || !file}
            className="upload-button"
          >
            {isLoading ? 'Processando...' : 'Processar CSV'}
          </button>
        </div>
        
        {error && <p className="error">{error}</p>}
      </div>

      <div className="organization-selection">
        {organizations.length > 0 && (
          <>
            <div className="select-container">
              <label htmlFor="organization-select">Organização </label>
              <select
                id="organization-select"
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="organization-select2"
                disabled={isLoadingOrgs}
              >
                <option value="">Selecione uma organização</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedOrganization && (
              <div className="select-container">
                <label htmlFor="workspace-select">Workspace </label>
                <select
                  id="workspace-select"
                  value={selectedWorkspace}
                  onChange={(e) => setSelectedWorkspace(e.target.value)}
                  className="workspace-select"
                >
                  <option value="">Selecione um workspace</option>
                  {getSelectedOrgWorkspaces().map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {processedOrders.length > 0 && (
        <div className="orders-table-container">
          <div className="orders-table-header">
            <div className="header-content">
              <h2>Pedidos Processados</h2>
              <div className="orders-stats">
                <span className="stats-count">
                  {getOrdersStats(processedOrders).validOrders}/{getOrdersStats(processedOrders).total}
                </span>
                {getOrdersStats(processedOrders).validOrders !== getOrdersStats(processedOrders).total && (
                  <span className="stats-warning">
                    ({getOrdersStats(processedOrders).total - getOrdersStats(processedOrders).validOrders} com inconformidade - 
                    Linhas: {getOrdersStats(processedOrders).problemLines.join(', ')})
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleIntegrateOrders}
              disabled={isIntegrating}
              className="integrate-button"
            >
              {isIntegrating ? 'Integrando...' : 'Integrar Pedidos'}
            </button>
          </div>

          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Coleta</th>
                  <th>Entrega</th>
                  <th>Item</th>
                  <th>Qtd</th>
                  <th>Peso</th>
                  <th>Volume</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {processedOrders.map((order) => {
                  const orderErrors = validateOrder(order);
                  const hasErrors = orderErrors.length > 0;
                  
                  return (
                    <tr key={order.uniqueId} className={hasErrors ? 'invalid-order' : ''}>
                      <td className="row-number">{processedOrders.indexOf(order) + 1}</td>
                      <td>
                        {order.id}
                        {hasErrors && (
                          <div className="validation-errors">
                            {orderErrors.map((error, index) => (
                              <span key={index} className="validation-error-tag">{error}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className={`cell-content ${validateCNPJ(order.customerCNPJ) ? 'invalid-field' : ''}`}>
                          <span>{order.customerName}</span>
                          <small>{order.customerCNPJ}</small>
                        </div>
                      </td>
                      <td>
                        <div className={`cell-content ${validateCNPJ(order.originCNPJ) ? 'invalid-field' : ''}`}>
                          <span>{order.originName}</span>
                          <small>{order.originCNPJ}</small>
                        </div>
                      </td>
                      <td>
                        <div className={`cell-content ${validateCNPJ(order.destinationCNPJ) ? 'invalid-field' : ''}`}>
                          <span>{order.destinationName}</span>
                          <small>{order.destinationCNPJ}</small>
                        </div>
                      </td>
                      <td>{formatDateTime(order.pickupDate)}</td>
                      <td>{formatDateTime(order.deliveryDate)}</td>
                      <td>
                        <div className="cell-content">
                          <span>{order.itemDescription}</span>
                          <small>Código: {order.itemCode}</small>
                        </div>
                      </td>
                      <td>{`${order.itemQuantity} ${order.itemUnit}`}</td>
                      <td className={order.itemWeight <= 0 ? 'invalid-field' : ''}>{`${order.itemWeight} kg`}</td>
                      <td className={order.itemVolume <= 0 ? 'invalid-field' : ''}>{`${order.itemVolume} m³`}</td>
                      <td>
                        <div className="status-flags">
                          {order.isDangerous && (
                            <span className="status-flag dangerous">Perigoso</span>
                          )}
                          {order.needsEscort && (
                            <span className="status-flag escort">Escolta</span>
                          )}
                          {hasErrors && (
                            <span className="status-flag invalid">Inconformidade</span>
                          )}
                          {order.integrationStatus === 'pending' && (
                            <span className="status-flag pending">
                              <span className="loading-spinner"></span>
                              Integrando...
                            </span>
                          )}
                          {order.integrationStatus === 'success' && (
                            <span className="status-flag success">
                              ✓ {order.integrationCode}
                            </span>
                          )}
                          {order.integrationStatus === 'error' && (
                            <span className="status-flag error" title={order.integrationError}>
                              ✕ Falha na integração
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InstructionsModal 
        isOpen={showInstructions} 
        onClose={() => setShowInstructions(false)} 
      />
    </div>
  );
}

export default OrdersImport; 