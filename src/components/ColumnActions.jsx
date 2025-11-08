import React, { useState } from 'react'
import { useToast } from '../context/ToastContext'

export default function ColumnActions({col, onDrop, onImpute, onNormalize, onEncode, onPreview}){
  const [method, setMethod] = useState('mean')
  const [value, setValue] = useState('')
  const toast = useToast()
  return (
    <div>
      <h3>Actions</h3>
      <div className="controls">
        <button onClick={()=> onDrop(col)}>Drop column</button>
      </div>

      <div style={{marginTop:8}}>
        <div className="small">Impute missing</div>
        <select value={method} onChange={e=>setMethod(e.target.value)}>
          <option value="mean">Mean (numeric)</option>
          <option value="median">Median (numeric)</option>
          <option value="mode">Mode</option>
          <option value="constant">Constant</option>
        </select>
        {method==='constant' && <input placeholder="value" value={value} onChange={e=>setValue(e.target.value)} />}
        <div className="controls">
          <button onClick={async ()=> { const ok = await onImpute(col, method, value); toast.showToast(ok? 'Imputation applied':'Imputation failed', ok? 'success':'error') }}>Apply</button>
          <button onClick={async ()=> { const preview = await onPreview(col, method, value); if(preview) toast.showToast('Preview ready — check console for details','info'); console.log('Imputation preview', preview) }}>Preview</button>
        </div>
      </div>

      <div style={{marginTop:8}} className="controls">
        <button onClick={async ()=> { const ok = await onNormalize(col); toast.showToast(ok? 'Normalized column':'Normalization failed', ok? 'success':'error') }}>Normalize (0-1)</button>
        <button onClick={async ()=> { const cats = await onEncode(col); if(cats) toast.showToast('Encoded column — categories in console','success'); else toast.showToast('Encoding failed','error'); console.log('Encoded categories', cats) }}>Encode categorical</button>
      </div>
    </div>
  )
}
