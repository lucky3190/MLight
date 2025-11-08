import React, { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import PreviewTable from '../components/PreviewTable'
import DataDescription from '../components/DataDescription'
import ColumnSummary from '../components/ColumnSummary'
import ColumnActions from '../components/ColumnActions'
import { useToast } from '../context/ToastContext'

export default function Clean(){
  const { records, columns, cleanDropNA, fillMissing, encodeCategoricals, describeData, dropColumn, imputeColumn, normalizeColumn, encodeColumn, previewImputation, saveCurrentDataToIDB, runFullColumnSummary } = useData()
  const [col, setCol] = useState('')
  const [fillVal, setFillVal] = useState('')
  const [summary, setSummary] = useState(null)
  const [persist, setPersist] = useState(false)
  const toast = useToast()

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
            <label style={{marginRight:12}} className="small">Persist changes:</label>
            <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={persist} onChange={e=> setPersist(e.target.checked)} /> Apply changes to stored dataset</label>
          </div>
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
              <div style={{marginTop:8}}>
                <button onClick={async ()=>{
                  if(!col) return toast.showToast('Select a column first','info')
                  if(!window.confirm('Run full column summary using pandas (may be slow)?')) return
                  try{
                    const res = await runFullColumnSummary(col)
                    if(res){
                      // merge into summary
                      setSummary(prev=> ({...prev, [col]: res}))
                      toast.showToast('Full column summary computed','success')
                    }else{
                      toast.showToast('Full summary not available (Pyodide may not be ready)','error')
                    }
                  }catch(e){
                    toast.showToast(String(e),'error')
                  }
                }}>Run full column summary (pandas)</button>
              </div>
          </div>
          <div className="card" style={{marginTop:8}}>
            <ColumnActions col={col}
              onDrop={async (c)=>{
                if(!c) return;
                if(!window.confirm(`Drop column ${c}? This cannot be undone.`)) return;
                const ok = await dropColumn(c);
                if(ok){
                  const s = await describeData();
                  setSummary(s);
                  setCol('');
                  if(persist){ await saveCurrentDataToIDB('uploaded.csv'); toast.showToast('Column dropped and dataset persisted','success') }
                  else { toast.showToast('Column dropped (preview only)','success') }
                }
              }}
              onImpute={async (c,m,v)=>{
                const ok = await imputeColumn(c,m,v);
                if(ok){ const s = await describeData(); setSummary(s); if(persist){ await saveCurrentDataToIDB('uploaded.csv'); toast.showToast('Imputation applied and persisted','success') } else toast.showToast('Imputation applied (preview only)','success') } else toast.showToast('Imputation failed','error')
              }}
              onNormalize={async (c)=>{
                const ok = await normalizeColumn(c);
                if(ok){ const s = await describeData(); setSummary(s); if(persist){ await saveCurrentDataToIDB('uploaded.csv'); toast.showToast('Normalization applied and persisted','success') } else toast.showToast('Normalization applied (preview only)','success') } else toast.showToast('Normalization failed','error')
              }}
              onEncode={async (c)=>{
                const res = await encodeColumn(c);
                const s = await describeData(); setSummary(s);
                if(res){ if(persist){ await saveCurrentDataToIDB('uploaded.csv'); toast.showToast('Encoding applied and persisted','success') } else toast.showToast('Encoding applied (preview only)','success') } else toast.showToast('Encoding failed','error');
                return res?.categories
              }}
              onPreview={async (c,m,v)=> {
                const preview = await previewImputation(c,m,v);
                if(preview) toast.showToast('Preview ready','info');
                return preview
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
