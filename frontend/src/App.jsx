import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import TripManager from './components/TripManager'
import { Login } from './components/Login'
import { IntegrationHistory } from './components/IntegrationHistory'
import { authService } from './services/auth'
import './App.css'

function App() {
  const [xmlData, setXmlData] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentView, setCurrentView] = useState('upload') // 'upload' ou 'history'

  useEffect(() => {
    setIsAuthenticated(authService.isAuthenticated())
  }, [])

  const handleLoginSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleXmlDataReceived = (data) => {
    // Quando receber novos dados XML, inicializa todas as notas como não utilizadas
    const processedDataWithUsageStatus = {
      ...data,
      processed_data: data.processed_data.map(note => ({
        ...note,
        isUsed: false
      }))
    };
    setXmlData(processedDataWithUsageStatus);
  };

  const handleTripGenerated = (usedNoteIds) => {
    if (xmlData && xmlData.processed_data) {
      // Atualiza o estado das notas, marcando as utilizadas
      const updatedProcessedData = {
        ...xmlData,
        processed_data: xmlData.processed_data.map(note => ({
          ...note,
          isUsed: usedNoteIds.includes(note.id) || note.isUsed
        }))
      };
      setXmlData(updatedProcessedData);
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="container">
      {/* Navigation */}
      <nav className="main-nav">
        <button 
          className={`nav-button ${currentView === 'upload' ? 'active' : ''}`}
          onClick={() => setCurrentView('upload')}
        >
          Upload XML
        </button>
        <button 
          className={`nav-button ${currentView === 'history' ? 'active' : ''}`}
          onClick={() => setCurrentView('history')}
        >
          Histórico de Integrações
        </button>
      </nav>

      {currentView === 'upload' ? (
        <>
          <div className="upload-section">
            <h1>Criação de viagem a partir de XML</h1>
            <FileUpload onDataReceived={handleXmlDataReceived} />
          </div>
          
          {xmlData && xmlData.processed_data && (
            <div className="main-content">
              <div className="content-wrapper">
                <div className="content-body">
                  <TripManager 
                    processedData={xmlData.processed_data}
                    onTripGenerated={handleTripGenerated}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <IntegrationHistory />
      )}
    </div>
  )
}

export default App
