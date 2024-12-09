import { useState } from 'react'
import FileUpload from './components/FileUpload'
import XMLTable from './components/XMLTable'
import './App.css'

function App() {
  const [xmlData, setXmlData] = useState(null)

  return (
    <div className="container">
      <h1>Processador de XML</h1>
      <FileUpload onDataReceived={setXmlData} />
      <XMLTable data={xmlData} />
    </div>
  )
}

export default App
