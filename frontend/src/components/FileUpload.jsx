import { useState } from 'react'
import PropTypes from 'prop-types'
import api from '../services/api'

function FileUpload({ onDataReceived }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [files, setFiles] = useState([])

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files)
    const xmlFiles = selectedFiles.filter(file => file.type === 'text/xml' || file.name.endsWith('.xml'))
    setFiles(xmlFiles)
    setError(null)
  }

  const handleUpload = async () => {
    if (!files.length) {
      setError('Por favor, selecione arquivos XML')
      return
    }

    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    try {
      const response = await api.post('/upload', formData)
      onDataReceived(response.data)
      setFiles([])
    } catch (err) {
      setError(err.message)
      console.error('Erro:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="upload-container">
      <div className="file-input-wrapper">
        <label className="select-file-button" htmlFor="file-input">
          Selecionar Arquivos
        </label>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".xml"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <span className="selected-files">
          {files.length 
            ? `${files.length} arquivo${files.length > 1 ? 's' : ''} XML selecionado${files.length > 1 ? 's' : ''}`
            : 'Nenhum arquivo selecionado'}
        </span>
      </div>
      
      <button 
        onClick={handleUpload}
        disabled={isLoading || !files.length}
        className="upload-button"
      >
        {isLoading ? 'Processando...' : 'Processar XMLs'}
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  )
}

FileUpload.propTypes = {
  onDataReceived: PropTypes.func.isRequired
}

export default FileUpload 