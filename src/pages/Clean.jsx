import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import PreviewTable from '../components/PreviewTable'

export default function Clean(){
  const { records, columns, cleanDropNA, fillMissing, encodeCategoricals } = useData()
  const [col, setCol] = useState('')
  const [fillVal, setFillVal] = useState('')

  return (
    <div>
      <h2>Clean</h2>
      <div className="small">Drop missing rows, fill missing values, and encode categoricals.</div>

      <div style={{marginTop:12}} className="controls">
        <button onClick={async ()=> await cleanDropNA()}>Drop NA rows</button>
        <button onClick={async ()=> await encodeCategoricals()}>Encode Categoricals</button>
      </div>

      <div style={{marginTop:12}} className="controls">
        <select value={col} onChange={e=>setCol(e.target.value)}>
          <option value="">-- column --</option>
          {columns.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="fill value" value={fillVal} onChange={e=>setFillVal(e.target.value)} />
        <button onClick={async ()=>{ if(col) await fillMissing(col, fillVal) }}>Fill Missing</button>
      </div>

      <div style={{marginTop:12}} className="card">
        <h3>Preview</h3>
        <PreviewTable rows={records} />
      </div>
    </div>
  )
}
