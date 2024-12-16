import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Note {
  numeroNF: string;
  chaveAcesso: string;
}

interface Stop {
  type: string;
  companyName: string;
  notes: Note[];
}

interface TripData {
  driver: {
    name: string;
  };
  vehicle: {
    plate: string;
  };
  stops: Stop[];
}

interface IntegratedTrip {
  id: number;
  external_id: string;
  status: string;
  created_at: string;
  error_message?: string;
  trip_data: TripData;
  matrix_cargo_response?: any;
}

interface PaginatedResponse {
  items: IntegratedTrip[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export function IntegrationHistory() {
  const [trips, setTrips] = useState<IntegratedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadHistory();
  }, [currentPage]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get<PaginatedResponse>('/trips/integration-history', {
        params: {
          page: currentPage,
          size: pageSize
        }
      });
      
      setTrips(response.data.items);
      setTotalPages(response.data.pages);
      setTotalItems(response.data.total);
    } catch (err) {
      setError('Erro ao carregar histórico de integrações');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Renderiza os botões de paginação
  const renderPagination = () => {
    const pages: JSX.Element[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Adiciona primeira página e reticências se necessário
    if (startPage > 1) {
      pages.push(
        <button key={1} onClick={() => handlePageChange(1)} className="page-button">
          1
        </button>
      );
      if (startPage > 2) {
        pages.push(<span key="start-ellipsis" className="ellipsis">...</span>);
      }
    }

    // Adiciona páginas numeradas
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`page-button ${currentPage === i ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }

    // Adiciona última página e reticências se necessário
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(<span key="end-ellipsis" className="ellipsis">...</span>);
      }
      pages.push(
        <button
          key={totalPages}
          onClick={() => handlePageChange(totalPages)}
          className="page-button"
        >
          {totalPages}
        </button>
      );
    }

    return pages;
  };

  // Função auxiliar para extrair todas as notas da viagem
  const getAllNotes = (tripData: TripData) => {
    return tripData.stops.flatMap(stop => stop.notes);
  };

  if (loading && trips.length === 0) {
    return <div className="loading">Carregando histórico...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="integration-history">
      <h2>Histórico de Integrações</h2>
      <div className="history-header">
        <span className="total-items">Total: {totalItems} integrações</span>
      </div>
      
      <div className="history-list">
        {trips.map((trip) => (
          <div key={trip.id} className={`history-item ${trip.status}`}>
            <div className="history-item-header">
              <span className="external-id">ID Externo: {trip.external_id}</span>
              <span className={`status-badge ${trip.status}`}>
                {trip.status === 'success' ? 'Sucesso' : 'Erro'}
              </span>
            </div>
            <div className="history-item-details">
              <p className="created-at">
                Data: {new Date(trip.created_at).toLocaleString()}
              </p>
              {trip.error_message && (
                <p className="error-details">Erro: {trip.error_message}</p>
              )}
              <div className="trip-details">
                <h4>Detalhes da Viagem:</h4>
                <p>Motorista: {trip.trip_data.driver.name}</p>
                <p>Veículo: {trip.trip_data.vehicle.plate}</p>
                <p>Paradas: {trip.trip_data.stops.length}</p>
                
                {/* Seção de Notas Fiscais */}
                <div className="notes-section">
                  <h5>Notas Fiscais:</h5>
                  <div className="notes-grid">
                    {trip.trip_data.stops.map((stop, stopIndex) => (
                      <div key={stopIndex} className="stop-notes">
                        <p className="stop-type">
                          {stop.type === 'COLETA' ? 'Coleta' : 'Entrega'} - {stop.companyName}
                        </p>
                        <div className="notes-list">
                          {stop.notes.map((note, noteIndex) => (
                            <span key={noteIndex} className="note-badge">
                              NF {note.numeroNF}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="page-button nav-button"
          >
            Anterior
          </button>
          
          <div className="page-numbers">
            {renderPagination()}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="page-button nav-button"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
} 