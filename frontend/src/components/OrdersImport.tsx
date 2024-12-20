import React, { useState } from 'react';
import api from '../services/api';

interface CSVOrder {
  id: string;
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
}

interface OrderValidation {
  id: string;
  errors: string[];
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

export function OrdersImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedOrders, setProcessedOrders] = useState<CSVOrder[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIntegrating, setIsIntegrating] = useState(false);

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
      
      setProcessedOrders(response.data.orders);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao processar arquivo');
      console.error('Erro:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntegrateOrders = async () => {
    if (!processedOrders.length) return;

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

    try {
      const response = await api.post('/orders/matrix-cargo', processedOrders);
      alert('Pedidos integrados com sucesso!');
      setProcessedOrders([]);
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao integrar pedidos');
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

      {processedOrders.length > 0 && (
        <div className="orders-table-container">
          <div className="orders-table-header">
            <h2>Pedidos Processados ({processedOrders.length})</h2>
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
                    <tr key={order.id} className={hasErrors ? 'invalid-order' : ''}>
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