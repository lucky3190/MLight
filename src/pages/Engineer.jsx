import React from 'react'
import { useData } from '../context/DataContext'

export default function Engineer(){
  const { columns, encodeCategoricals } = useData()

  return (
    <div>
      <h2>Feature Engineering</h2>
      <div className="small">Lightweight tools: encode categoricals and simple transforms. Scaling and binning can be added similarly.</div>
      <div style={{marginTop:12}} className="controls">
        <button onClick={async ()=> await encodeCategoricals()}>Encode categorical columns</button>
      </div>

      <div style={{marginTop:12}} className="card">
        <div className="small">Columns: {columns.join(', ')}</div>
      </div>
    </div>
  )
}
