import { useState } from 'react'
import PropTypes from 'prop-types'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

function TripManager({ processedData }) {
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
      const response = await fetch('http://localhost:8000/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentTrip),
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar viagem')
      }

      const savedTrip = await response.json()
      setTrips(prev => prev.map(trip => 
        trip.id === currentTrip.id ? savedTrip : trip
      ))
      setCurrentTrip(savedTrip)
      alert('Viagem salva com sucesso!')
    } catch (error) {
      alert(`Erro ao salvar viagem: ${error.message}`)
    }
  }

  const handleNoteSelection = (noteId, isChecked) => {
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

  const handleEditStop = (stopIndex) => {
    const stop = currentTrip.stops[stopIndex]
    // Aqui você pode implementar a lógica de edição
    // Por exemplo, abrir um modal com os campos editáveis
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
    
    // Mostra apenas notas que não estão em nenhum ponto
    const availableNotesFiltered = processedData.filter(note => 
      !notesInStops.has(note.id)
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

  return (
    <div className="trip-manager">
      {/* Header com informações da viagem */}
      <div className="trip-info-header">
        <div className="trip-info-section">
          <h2>Informações da Viagem</h2>
          <div className="trip-info-grid">
            <div className="trip-field">
              <label>Cliente</label>
              <input
                type="text"
                placeholder="Buscar o cliente"
                value={currentTrip.client}
                onChange={(e) => handleUpdateTripInfo('client', e.target.value)}
              />
            </div>
            <div className="trip-field">
              <label>ID Externo</label>
              <input
                type="text"
                placeholder="00000"
                value={currentTrip.externalId}
                onChange={(e) => handleUpdateTripInfo('externalId', e.target.value)}
              />
            </div>
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

      {/* Container para o conteúdo abaixo do header */}
      <div className="trip-content">
        {/* Seção de notas (Esquerda) */}
        <div className="notes-section">
          <div className="notes-header">
            <h2>Notas Fiscais Disponíveis</h2>
            <span className="count-badge">{processedData.length} notas</span>
          </div>
          <div className="xml-list">
            {processedData.map(note => {
              const isInUse = currentTrip.stops.some(stop => 
                stop.notes.some(n => n.id === note.id)
              )
              
              return (
                <div key={note.id} className={`xml-item ${isInUse ? 'note-in-use' : ''}`}>
                  <div className="xml-item-header">
                    <span className="nf-number">NF {note.numeroNF}</span>
                    <input
                      type="checkbox"
                      checked={selectedNotes.has(note.id)}
                      onChange={(e) => handleNoteSelection(note.id, e.target.checked)}
                      disabled={isInUse}
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
                  </div>
                </div>
              )
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
                              <h3>{stop.type === 'COLETA' ? 'Coleta' : 'Entrega'}</h3>
                              <div className="stop-info">
                                <p className="company-cnpj">CNPJ: {stop.cnpj}</p>
                                <p className="note-count">Notas: {stop.notes.length}</p>
                              </div>
                              <div className="stop-actions">
                                <button onClick={() => handleOpenNotesModal(index)}>
                                  Adicionar Nota
                                </button>
                                <button onClick={() => handleEditStop(index)}>Editar</button>
                                <button onClick={() => handleRemoveStop(index)}>Remover</button>
                              </div>
                            </div>
                            <div className="stop-content">
                              <div className="stop-info">
                                <input
                                  type="text"
                                  value={stop.companyName}
                                  onChange={(e) => {
                                    const updatedStops = [...currentTrip.stops]
                                    updatedStops[index] = {
                                      ...stop,
                                      companyName: e.target.value
                                    }
                                    setCurrentTrip(prev => ({
                                      ...prev,
                                      stops: updatedStops
                                    }))
                                  }}
                                  className="company-name-input"
                                />
                                <p className="address">
                                  {stop.address.logradouro}, {stop.address.numero}
                                </p>
                                <p className="address">
                                  {stop.address.bairro}, {stop.address.municipio} - {stop.address.uf}
                                </p>
                              </div>
                              <div className="stop-notes">
                                <p>Notas Fiscais:</p>
                                <ul>
                                  {stop.notes.map(note => (
                                    <li key={note.id}>NF {note.numeroNF}</li>
                                  ))}
                                </ul>
                              </div>
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
    </div>
  )
}

TripManager.propTypes = {
  processedData: PropTypes.array.isRequired
}

export default TripManager 