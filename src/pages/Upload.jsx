import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import PreviewTable from '../components/PreviewTable'

// Small CSV parser for quick client-side previews (handles quoted fields)
function parseCSV(text, maxRows = 50){
  const rows = []
  const lines = []
  let cur = ''
  let inQuotes = false
  for(let i=0;i<text.length;i++){
    const ch = text[i]
    cur += ch
    if(ch === '"'){
      // toggle unless escaped
      const prev = text[i-1]
      if(prev !== '\\') inQuotes = !inQuotes
    }
    if(ch === '\n' && !inQuotes){
      lines.push(cur.trim())
      cur = ''
      if(lines.length >= maxRows) break
    }
  }
  if(cur && lines.length < maxRows) lines.push(cur.trim())

  for(const line of lines){
    // simple split respecting quotes
    const cols = []
    let cell = ''
    let quoted = false
    for(let i=0;i<line.length;i++){
      const ch = line[i]
      if(ch === '"'){
        quoted = !quoted
        continue
      }
      if(ch === ',' && !quoted){
        cols.push(cell)
        cell = ''
        continue
      }
      cell += ch
    }
    cols.push(cell)
    rows.push(cols)
  }

  if(rows.length === 0) return {columns: [], records: []}
  const headers = rows[0]
  const records = rows.slice(1).map(r=>{
    const obj = {}
    for(let i=0;i<headers.length;i++) obj[headers[i] || `col_${i}`] = r[i] || ''
    return obj
  })
  return {columns: headers, records}
}

export default function Upload(){
  const { loadCSVFromText, records, columns, loadingPyodide, saveFileToIDB } = useData()
  const [localRecords, setLocalRecords] = useState(null)
  const [localColumns, setLocalColumns] = useState([])
  const [status, setStatus] = useState('')

  function handleFile(e){
    const f = e.target.files[0]
    if(!f) return
    setStatus(`Selected ${f.name} — ${(f.size/1024).toFixed(1)} KB`)
    const reader = new FileReader()
    reader.onload = async (ev)=>{
      const text = ev.target.result
      // Quick client-side preview fallback for large files or when Pyodide isn't ready
      try{
        setStatus('Parsing preview with Pyodide/pandas...')
        await loadCSVFromText(text)
        setLocalRecords(null)
        setLocalColumns([])
        setStatus('Preview loaded via Pyodide')
        // persist the uploaded file blob for reuse across pages
        try{ await saveFileToIDB('uploaded.csv', f) }catch(_){ /* non-critical */ }
      }catch(err){
        // fallback to JS parser for quick preview
        console.warn('Pyodide preview failed, falling back to JS parser', err)
        const parsed = parseCSV(text, 100)
        setLocalColumns(parsed.columns)
        setLocalRecords(parsed.records)
        setStatus('Preview parsed in-browser (JS fallback)')
        try{ await saveFileToIDB('uploaded.csv', f) }catch(_){ /* non-critical */ }
      }
    }
    reader.readAsText(f)
  }

  const previewRows = localRecords || records
  const previewCols = (localColumns && localColumns.length>0) ? localColumns : columns

  return (
    <div>
      <h2>Upload CSV</h2>
      <div className="small">Upload a CSV file and preview the first rows. All processing runs in your browser via Pyodide (pandas) — a JS fallback preview is used for large files or while Pyodide initializes.</div>
      <div style={{marginTop:12}} className="controls">
        <input type="file" accept=".csv,text/csv" onChange={handleFile} />
        {loadingPyodide && <div className="small">Pyodide loading… (packages may install in-browser)</div>}
      </div>

      <div style={{marginTop:12}}>
        <div className="card">
          <h3>Preview</h3>
          <div className="small">{status}</div>
          <PreviewTable rows={previewRows} />
        </div>
        <div className="card small">
          <strong>Columns:</strong> {previewCols ? previewCols.join(', ') : ''}
        </div>
      </div>
    </div>
  )
}
