import React, { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import PreviewTable from '../components/PreviewTable'
import DataDescription from '../components/DataDescription'
import ColumnSummary from '../components/ColumnSummary'
import ColumnActions from '../components/ColumnActions'

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

  // column selection UI with side column list
  return (
    <div>
      <h2>Clean</h2>
      <div className="small">Column-level cleaning and quick insights. Select a column to see detailed statistics and quick actions.</div>

      <div style={{marginTop:12}} className="card">
        <h3>Dataset summary</h3>
        <DataDescription summary={summary} />
      </div>

      <div className="card" style={{display:'grid',gridTemplateColumns:'1fr 420px',gap:12}}>
        <div>
          <h3>Columns</h3>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}} className="small">
            {columns.map(c=> (
              <button key={c} onClick={()=> setCol(c)} style={{padding:'6px 8px'}}>{c}</button>
            ))}
          </div>

          <div style={{marginTop:8}}>
            <h4>Preview (first rows)</h4>
            <PreviewTable rows={records} />
          </div>
        </div>

        <div>
          <div className="card">
            <ColumnSummary col={col} summary={summary} records={records} />
          </div>
          <div className="card" style={{marginTop:8}}>
            <ColumnActions col={col}
              onDrop={async (c)=>{ await dropColumn(c); const s = await describeData(); setSummary(s); setCol('') }}
              onImpute={async (c,m,v)=>{ await imputeColumn(c,m,v); const s = await describeData(); setSummary(s)}}
              onNormalize={async (c)=>{ await normalizeColumn(c); const s = await describeData(); setSummary(s)}}
              onEncode={async (c)=>{ const res = await encodeColumn(c); const s = await describeData(); setSummary(s); return res?.categories }}
              onPreview={async (c,m,v)=> await previewImputation(c,m,v)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
