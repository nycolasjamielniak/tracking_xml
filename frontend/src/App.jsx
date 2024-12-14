import { useState } from 'react'
import FileUpload from './components/FileUpload'
import TripManager from './components/TripManager'
import './App.css'

function App() {
  const [xmlData, setXmlData] = useState(null)

  return (
    <div className="container" style={{ width: '99%', margin: '0 auto', minHeight: '99vh' }}>
      <div className="upload-section">
        <h1>Processador de XML</h1>
        <FileUpload onDataReceived={setXmlData} />
      </div>
      
      {xmlData && xmlData.processed_data && (
        <div className="main-content">
          <div className="content-wrapper">
            <div className="content-header">
              <div className="left-section">
                <h2>Notas Fiscais Disponíveis</h2>
                <span className="count-badge">{xmlData.processed_data.length} notas</span>
              </div>
              <div className="right-section">
                <h2>Frete</h2>
                <div className="freight-info">
                  <div className="freight-field">
                    <label>Transportadora</label>
                    <input type="text" placeholder="Buscar a transportadora" />
                  </div>
                  <div className="freight-field">
                    <label>Cliente</label>
                    <input type="text" placeholder="Buscar o cliente" />
                  </div>
                  <div className="freight-field">
                    <label>Workspace</label>
                    <input type="text" placeholder="Buscar o workspace" />
                  </div>
                  <div className="freight-field">
                    <label>ID Externo</label>
                    <input type="text" placeholder="00000" />
                  </div>
                </div>
              </div>
            </div>
            <div className="content-body">
              <TripManager processedData={xmlData.processed_data} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
