import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import PreviewTable from '../components/PreviewTable'

export default function Upload(){
  const { loadCSVFromText, records, columns, loadingPyodide } = useData()
  const [localPreview, setLocalPreview] = useState(null)

  function handleFile(e){
    const f = e.target.files[0]
    if(!f) return
    const reader = new FileReader()
    reader.onload = async (ev)=>{
      const text = ev.target.result
      await loadCSVFromText(text)
      setLocalPreview(true)
    }
    reader.readAsText(f)
  }

  return (
    <div>
      <h2>Upload CSV</h2>
      <div className="small">Upload a CSV file and preview the first rows. All processing runs in your browser via Pyodide.</div>
      <div style={{marginTop:12}} className="controls">
        <input type="file" accept=".csv,text/csv" onChange={handleFile} />
        {loadingPyodide && <div className="small">Pyodide loading… (packages may install in-browser)</div>}
      </div>

      <div style={{marginTop:12}}>
        <div className="card">
          <h3>Preview</h3>
          <PreviewTable rows={records} />
        </div>
        <div className="card small">
          <strong>Columns:</strong> {columns.join(', ')}
        </div>
      </div>
    </div>
  )
}
