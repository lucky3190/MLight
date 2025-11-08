import React, { useState } from 'react'

export default function ColumnActions({col, onDrop, onImpute, onNormalize, onEncode, onPreview}){
  const [method, setMethod] = useState('mean')
  const [value, setValue] = useState('')
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
          <button onClick={async ()=> await onImpute(col, method, value)}>Apply</button>
          <button onClick={async ()=> { const preview = await onPreview(col, method, value); alert(JSON.stringify(preview, null, 2)) }}>Preview</button>
        </div>
      </div>

      <div style={{marginTop:8}} className="controls">
        <button onClick={async ()=> await onNormalize(col)}>Normalize (0-1)</button>
        <button onClick={async ()=> { const cats = await onEncode(col); alert('Encoded — categories: '+ JSON.stringify(cats)) }}>Encode categorical</button>
      </div>
    </div>
  )
}
