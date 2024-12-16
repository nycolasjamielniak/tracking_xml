import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import api from '../services/api';

// Adicione o componente do modal
function NotesModal({ isOpen, onClose, availableNotes, onConfirm }) {
  const [selectedNotes, setSelectedNotes] = useState(new Set())

  const handleNoteSelection = (noteId) => {
    const newSelected = new Set(selectedNotes)
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId)
    } else {
      newSelected.add(noteId)
    }
    setSelectedNotes(newSelected)
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Adicionar Notas</h2>
        <div className="modal-notes-list">
          {availableNotes.map(note => (
            <div key={note.id} className="modal-note-item">
              <input
                type="checkbox"
                checked={selectedNotes.has(note.id)}
                onChange={() => handleNoteSelection(note.id)}
              />
              <span>NF {note.numeroNF}</span>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button 
            onClick={() => {
              onConfirm(Array.from(selectedNotes))
              setSelectedNotes(new Set())
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// Adicione o componente do modal de edição
function EditStopModal({ isOpen, onClose, stop, onConfirm }) {
  // Inicializa o estado apenas quando o modal é aberto e tem um stop válido
  const [editedStop, setEditedStop] = useState(null)

  // Atualiza o editedStop quando o stop muda
  useEffect(() => {
    if (stop) {
      setEditedStop(stop)
    }
  }, [stop])

  const handleChange = (field, value) => {
    if (!editedStop) return

    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setEditedStop(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setEditedStop(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  if (!isOpen || !editedStop) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Editar Ponto de Parada</h2>
        <div className="edit-stop-form">
          <div className="form-field">
            <label>Tipo</label>
            <select 
              value={editedStop.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              <option value="COLETA">Coleta</option>
              <option value="ENTREGA">Entrega</option>
            </select>
          </div>
          <div className="form-field">
            <label>Nome da Empresa</label>
            <input
              type="text"
              value={editedStop.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>CNPJ</label>
            <input
              type="text"
              value={editedStop.cnpj}
              onChange={(e) => handleChange('cnpj', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Logradouro</label>
            <input
              type="text"
              value={editedStop.address.logradouro}
              onChange={(e) => handleChange('address.logradouro', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Número</label>
            <input
              type="text"
              value={editedStop.address.numero}
              onChange={(e) => handleChange('address.numero', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Bairro</label>
            <input
              type="text"
              value={editedStop.address.bairro}
              onChange={(e) => handleChange('address.bairro', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Município</label>
            <input
              type="text"
              value={editedStop.address.municipio}
              onChange={(e) => handleChange('address.municipio', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>UF</label>
            <input
              type="text"
              value={editedStop.address.uf}
              onChange={(e) => handleChange('address.uf', e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>CEP</label>
            <input
              type="text"
              value={editedStop.address.cep}
              onChange={(e) => handleChange('address.cep', e.target.value)}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Cancelar</button>
          <button onClick={() => onConfirm(editedStop)}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

function TripManager({ processedData, onTripGenerated }) {
  const [trips, setTrips] = useState([])
  const [currentTrip, setCurrentTrip] = useState({
    id: '',
    externalId: '',
    carrier: '',
    client: '',
    workspace: '',
    driver: {
      name: '',
      document: ''
    },
    vehicle: {
      plate: ''
    },
    stops: []
  })
  const [selectedNotes, setSelectedNotes] = useState(new Set())
  const [showNewStopForm, setShowNewStopForm] = useState(false)
  const [newStop, setNewStop] = useState({
    type: 'COLETA',
    companyName: '',
    cnpj: '',
    address: {
      logradouro: '',
      numero: '',
      bairro: '',
      municipio: '',
      uf: '',
      cep: ''
    },
    notes: []
  })
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [selectedStopIndex, setSelectedStopIndex] = useState(null)
  const [availableNotes, setAvailableNotes] = useState([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingStop, setEditingStop] = useState(null)

  const handleCreateTrip = () => {
    const newTrip = {
      id: Date.now().toString(),
      externalId: '',
      carrier: '',
      client: '',
      workspace: '',
      driver: {
        name: '',
        document: ''
      },
      vehicle: {
        plate: ''
      },
      stops: []
    }
    setTrips([...trips, newTrip])
    setCurrentTrip(newTrip)
  }

  const handleUpdateTripInfo = (field, value) => {
    if (typeof value === 'object') {
      setCurrentTrip(prev => ({
        ...prev,
        [field]: { ...prev[field], ...value }
      }))
    } else {
      setCurrentTrip(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleAddStop = (type) => {
    if (selectedNotes.size === 0) return

    const firstNote = processedData.find(note => note.id === Array.from(selectedNotes)[0])
    const address = type === 'COLETA' ? firstNote.remetente : firstNote.destinatario

    const newStop = {
      type,
      notes: Array.from(selectedNotes).map(id => processedData.find(note => note.id === id)),
      address: address.endereco,
      companyName: address.nome,
      sequence: currentTrip.stops.length
    }

    setCurrentTrip(prev => ({
      ...prev,
      stops: [...prev.stops, newStop]
    }))
    setSelectedNotes(new Set())
  }

  const handleRemoveStop = (index) => {
    setCurrentTrip(prev => ({
      ...prev,
      stops: prev.stops.filter((_, i) => i !== index)
    }))
  }

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const stops = Array.from(currentTrip.stops)
    const [reorderedStop] = stops.splice(result.source.index, 1)
    stops.splice(result.destination.index, 0, reorderedStop)

    // Update sequences
    const updatedStops = stops.map((stop, index) => ({
      ...stop,
      sequence: index
    }))

    setCurrentTrip(prev => ({
      ...prev,
      stops: updatedStops
    }))
  }

  const handleSaveTrip = async () => {
    try {
      const response = await api.post('/trips', currentTrip);
      
      setTrips(prev => prev.map(trip => 
        trip.id === currentTrip.id ? response.data : trip
      ));
      setCurrentTrip(response.data);
      alert('Viagem salva com sucesso!');
    } catch (error) {
      alert(`Erro ao salvar viagem: ${error.message}`);
    }
  };

  const handleNoteSelection = (noteId, isChecked) => {
    // Verifica se a nota já foi usada em uma viagem anterior
    const isNoteUsedInPreviousTrip = processedData.find(note => 
      note.id === noteId && note.isUsed
    );

    if (isNoteUsedInPreviousTrip) {
      alert('Esta nota já foi utilizada em uma viagem anterior.');
      return;
    }

    const newSelected = new Set(selectedNotes)
    if (isChecked) {
      newSelected.add(noteId)
      const selectedNote = processedData.find(note => note.id === noteId)
      
      // Verifica se já existe um ponto de coleta com o mesmo CNPJ do remetente
      const existingColetaIndex = currentTrip.stops.findIndex(stop => 
        stop.type === 'COLETA' && 
        stop.cnpj === selectedNote.remetente.cnpj
      )

      // Verifica se já existe um ponto de entrega com o mesmo CNPJ do destinatário
      const existingEntregaIndex = currentTrip.stops.findIndex(stop => 
        stop.type === 'ENTREGA' && 
        stop.cnpj === selectedNote.destinatario.cnpj
      )

      const updatedStops = [...currentTrip.stops]

      if (existingColetaIndex >= 0) {
        // Adiciona a nota ao ponto de coleta existente
        updatedStops[existingColetaIndex] = {
          ...updatedStops[existingColetaIndex],
          notes: [...updatedStops[existingColetaIndex].notes, selectedNote]
        }
      } else {
        // Cria novo ponto de coleta
        const coletaStop = {
          type: 'COLETA',
          notes: [selectedNote],
          address: selectedNote.remetente.endereco,
          companyName: selectedNote.remetente.nome,
          cnpj: selectedNote.remetente.cnpj,
          sequence: currentTrip.stops.length
        }
        updatedStops.push(coletaStop)
      }

      if (existingEntregaIndex >= 0) {
        // Adiciona a nota ao ponto de entrega existente
        updatedStops[existingEntregaIndex] = {
          ...updatedStops[existingEntregaIndex],
          notes: [...updatedStops[existingEntregaIndex].notes, selectedNote]
        }
      } else {
        // Cria novo ponto de entrega
        const entregaStop = {
          type: 'ENTREGA',
          notes: [selectedNote],
          address: selectedNote.destinatario.endereco,
          companyName: selectedNote.destinatario.nome,
          cnpj: selectedNote.destinatario.cnpj,
          sequence: updatedStops.length
        }
        updatedStops.push(entregaStop)
      }

      setCurrentTrip(prev => ({
        ...prev,
        stops: updatedStops
      }))
    } else {
      newSelected.delete(noteId)
      // Remove a nota dos pontos existentes e remove pontos vazios
      setCurrentTrip(prev => {
        const updatedStops = prev.stops.map(stop => ({
          ...stop,
          notes: stop.notes.filter(note => note.id !== noteId)
        })).filter(stop => stop.notes.length > 0)

        return {
          ...prev,
          stops: updatedStops
        }
      })
    }
    setSelectedNotes(newSelected)
  }

  const handleEditStop = (index) => {
    // Cria uma cópia profunda do stop para edição
    const stopToEdit = JSON.parse(JSON.stringify(currentTrip.stops[index]))
    setEditingStop(stopToEdit)
    setSelectedStopIndex(index)
    setShowEditModal(true)
  }

  const handleConfirmEdit = (editedStop) => {
    setCurrentTrip(prev => {
      const updatedStops = [...prev.stops]
      updatedStops[selectedStopIndex] = {
        ...editedStop,
        notes: prev.stops[selectedStopIndex].notes // Mantém as notas originais
      }
      return {
        ...prev,
        stops: updatedStops
      }
    })
    setShowEditModal(false)
    setSelectedStopIndex(null)
    setEditingStop(null)
  }

  const handleAddManualStop = () => {
    const manualStop = {
      ...newStop,
      sequence: currentTrip.stops.length
    }

    setCurrentTrip(prev => ({
      ...prev,
      stops: [...prev.stops, manualStop]
    }))

    // Reseta o formulário
    setNewStop({
      type: 'COLETA',
      companyName: '',
      cnpj: '',
      address: {
        logradouro: '',
        numero: '',
        bairro: '',
        municipio: '',
        uf: '',
        cep: ''
      },
      notes: []
    })
    setShowNewStopForm(false)
  }

  const handleNewStopChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setNewStop(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setNewStop(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  // Função para abrir o modal de seleção de notas
  const handleOpenNotesModal = (stopIndex) => {
    // Filtra notas que já estão em algum ponto
    const notesInStops = new Set(
      currentTrip.stops.flatMap(stop => stop.notes.map(note => note.id))
    )
    
    // Mostra apenas notas que não estão em nenhum ponto e não foram utilizadas em outras viagens
    const availableNotesFiltered = processedData.filter(note => 
      !notesInStops.has(note.id) && !note.isUsed
    )
    
    setAvailableNotes(availableNotesFiltered)
    setSelectedStopIndex(stopIndex)
    setShowNotesModal(true)
    setSelectedNotes(new Set()) // Limpa seleções anteriores
  }

  // Função para adicionar notas selecionadas ao ponto
  const handleAddNotesToStop = (selectedNoteIds) => {
    const selectedNotes = processedData.filter(note => selectedNoteIds.includes(note.id))
    
    setCurrentTrip(prev => {
      const updatedStops = [...prev.stops]
      // Adiciona apenas as notas selecionadas ao ponto existente
      updatedStops[selectedStopIndex] = {
        ...updatedStops[selectedStopIndex],
        notes: [...updatedStops[selectedStopIndex].notes, ...selectedNotes]
      }
      return {
        ...prev,
        stops: updatedStops
      }
    })
    
    // Limpa a seleção e fecha o modal
    setSelectedNotes(new Set())
    setShowNotesModal(false)
    setSelectedStopIndex(null)
  }

  // Add validation function
  const validateTripData = () => {
    // Validate driver info
    if (!currentTrip.driver.name || !currentTrip.driver.document) {
      return false;
    }

    // Validate vehicle info
    if (!currentTrip.vehicle.plate) {
      return false;
    }

    // Validate stops
    if (currentTrip.stops.length === 0) {
      return false;
    }

    // Validate each stop has required data
    return currentTrip.stops.every(stop => 
      stop.companyName && 
      stop.cnpj && 
      stop.address.logradouro &&
      stop.address.numero &&
      stop.address.bairro &&
      stop.address.municipio &&
      stop.address.uf &&
      stop.address.cep &&
      stop.notes.length > 0
    );
  };

  const handleGenerateMatrixCargoTrip = async () => {
    if (!validateTripData()) {
      return;
    }

    try {
      const response = await api.post('/trips/matrix-cargo', currentTrip);
      
      // Coleta os IDs das notas usadas nesta viagem
      const usedNoteIds = currentTrip.stops.flatMap(stop => 
        stop.notes.map(note => note.id)
      );
      
      // Notifica o componente pai sobre as notas utilizadas
      onTripGenerated(usedNoteIds);
      
      // Reset trip data after successful integration
      setCurrentTrip({
        id: Date.now().toString(),
        externalId: '',
        carrier: '',
        client: '',
        workspace: '',
        driver: {
          name: '',
          document: ''
        },
        vehicle: {
          plate: ''
        },
        stops: []
      });

      // Clear selected notes
      setSelectedNotes(new Set());
      
      alert(`Viagem gerada com sucesso! ID Externo: ${response.data.externalId}`);
    } catch (error) {
      console.error('Erro ao gerar viagem:', error);
      alert(`Erro ao gerar viagem: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div className="trip-manager">
      {/* Header com informações da viagem */}
      <div className="trip-info-header">
        <div className="trip-info-section">
          <h2>Informações da Viagem</h2>
          <div className="trip-info-grid">
            <div className="trip-field">
              <label>Motorista</label>
              <input
                type="text"
                placeholder="Nome do motorista"
                value={currentTrip.driver.name}
                onChange={(e) => handleUpdateTripInfo('driver', { name: e.target.value })}
              />
            </div>
            <div className="trip-field">
              <label>CPF do Motorista</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={currentTrip.driver.document}
                onChange={(e) => handleUpdateTripInfo('driver', { document: e.target.value })}
              />
            </div>
            <div className="trip-field">
              <label>Placa do Veículo</label>
              <input
                type="text"
                placeholder="ABC-1234"
                value={currentTrip.vehicle.plate}
                onChange={(e) => handleUpdateTripInfo('vehicle', { plate: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Matrix Cargo button near the trip info section */}
      <div className="trip-actions">
        <button
          className="matrix-cargo-button"
          onClick={handleGenerateMatrixCargoTrip}
          disabled={!validateTripData()}
        >
          Gerar Viagem Matrix Cargo
        </button>
      </div>

      {/* Container para o conteúdo abaixo do header */}
      <div className="trip-content">
        {/* Seção de notas (Esquerda) */}
        <div className="notes-section">
          <div className="notes-header">
            <h2>Notas Fiscais Disponíveis</h2>
            <span className="count-badge">{processedData.length} notas</span>
          </div>
          <div className="xml-list">
            {[...processedData].sort((a, b) => {
              // Função para determinar a prioridade da nota
              const getPriority = (note) => {
                if (note.isUsed) return 3; // Notas já utilizadas (prioridade mais baixa)
                if (currentTrip.stops.some(stop => 
                  stop.notes.some(n => n.id === note.id)
                )) return 2; // Notas selecionadas para a viagem atual
                return 1; // Notas disponíveis (prioridade mais alta)
              };
              
              return getPriority(a) - getPriority(b);
            }).map(note => {
              const isInUse = currentTrip.stops.some(stop => 
                stop.notes.some(n => n.id === note.id)
              );
              
              return (
                <div 
                  key={note.id} 
                  className={`xml-item ${isInUse ? 'note-in-use' : ''} ${note.isUsed ? 'note-used' : ''}`}
                  title={note.isUsed ? "Nota utilizada em viagem anterior" : ""}
                >
                  <div className="xml-item-header">
                    <span className="nf-number">NF {note.numeroNF}</span>
                    <input
                      type="checkbox"
                      checked={selectedNotes.has(note.id)}
                      onChange={(e) => handleNoteSelection(note.id, e.target.checked)}
                      disabled={isInUse || note.isUsed}
                    />
                  </div>
                  <div className="xml-item-details">
                    <div className="nf-party">
                      <span className="party-label">Remetente:</span>
                      <span className="party-name">{note.remetente.nome}</span>
                      <span className="party-location">
                        {note.remetente.endereco.municipio} - {note.remetente.endereco.uf}
                      </span>
                    </div>
                    {note.isUsed && (
                      <div className="note-status">
                        <span className="status-indicator">✓ Utilizada</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Seção de pontos de parada (Direita) */}
        <div className="form-section-container">
          <div className="form-section">
            <h2>Pontos da Viagem</h2>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="stops">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {currentTrip.stops.map((stop, index) => (
                      <Draggable key={index} draggableId={`stop-${index}`} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="stop-card"
                          >
                            <div className="stop-header">
                              <span className="stop-type">
                                {stop.type === 'COLETA' ? 'Coleta' : 'Entrega'}
                              </span>
                              <div className="stop-info">
                                <div className="stop-company">
                                  <span className="company-cnpj">CNPJ: {stop.cnpj}</span>
                                  <span className="company-name">{stop.companyName}</span>
                                </div>
                                <span className="stop-address">
                                  {stop.address.logradouro}, {stop.address.numero} - {stop.address.bairro}, {stop.address.municipio} - {stop.address.uf}
                                </span>
                              </div>
                              <div className="stop-actions">
                                <button onClick={() => handleOpenNotesModal(index)}>
                                  Adicionar Nota
                                </button>
                                <button onClick={() => handleEditStop(index)}>Editar</button>
                                <button onClick={() => handleRemoveStop(index)}>Remover</button>
                              </div>
                            </div>
                            
                            <div className="stop-notes">
                              <div className="stop-notes-title">Notas Fiscais:</div>
                              <ul className="notes-list">
                                {stop.notes.map(note => (
                                  <li key={note.id} className="note-item">
                                    NF {note.numeroNF}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </div>

      {/* Adicione o modal ao final do componente */}
      <NotesModal
        isOpen={showNotesModal}
        onClose={() => {
          setShowNotesModal(false)
          setSelectedStopIndex(null)
        }}
        availableNotes={availableNotes}
        onConfirm={handleAddNotesToStop}
      />

      {/* Adicione o modal de edição ao final do componente */}
      <EditStopModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedStopIndex(null)
          setEditingStop(null)
        }}
        stop={editingStop}
        onConfirm={handleConfirmEdit}
      />
    </div>
  )
}

TripManager.propTypes = {
  processedData: PropTypes.array.isRequired,
  onTripGenerated: PropTypes.func.isRequired
}

export default TripManager 