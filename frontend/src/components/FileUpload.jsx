import { useState } from 'react'
import PropTypes from 'prop-types'

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
      const response = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Erro no upload: ${response.statusText}`)
      }

      const data = await response.json()
      onDataReceived(data)
      setFiles([]) // Limpa os arquivos após upload bem-sucedido
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
        <input
          type="file"
          multiple
          accept=".xml"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <span className="selected-files">
          {files.length ? `${files.length} arquivo(s) selecionado(s)` : 'Nenhum arquivo selecionado'}
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