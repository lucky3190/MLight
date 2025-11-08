import React, { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import PreviewTable from '../components/PreviewTable'
import DataDescription from '../components/DataDescription'

export default function Clean(){
  const { records, columns, cleanDropNA, fillMissing, encodeCategoricals, describeData } = useData()
  const [col, setCol] = useState('')
  const [fillVal, setFillVal] = useState('')
  const [summary, setSummary] = useState(null)

  useEffect(()=>{
    let mounted = true
    async function run(){
      const s = await describeData()
      if(mounted) setSummary(s)
    }
    run()
    return ()=>{mounted=false}
  },[records, columns])

  return (
    <div>
      <h2>Clean</h2>
      <div className="small">Drop missing rows, fill missing values, and encode categoricals. Below is a quick data description to help decide cleaning steps.</div>

      <div style={{marginTop:12}} className="card">
        <h3>Data description</h3>
        <DataDescription summary={summary} />
      </div>

      <div style={{marginTop:12}} className="controls">
        <button onClick={async ()=> { await cleanDropNA(); const s = await describeData(); setSummary(s)} }>Drop NA rows</button>
        <button onClick={async ()=> { await encodeCategoricals(); const s = await describeData(); setSummary(s)} }>Encode Categoricals</button>
      </div>

      <div style={{marginTop:12}} className="controls">
        <select value={col} onChange={e=>setCol(e.target.value)}>
          <option value="">-- column --</option>
          {columns.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <input placeholder="fill value" value={fillVal} onChange={e=>setFillVal(e.target.value)} />
        <button onClick={async ()=>{ if(col) { await fillMissing(col, fillVal); const s = await describeData(); setSummary(s)} }}>Fill Missing</button>
      </div>

      <div style={{marginTop:12}} className="card">
        <h3>Preview</h3>
        <PreviewTable rows={records} />
      </div>
    </div>
  )
}
