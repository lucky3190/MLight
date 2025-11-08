import React, { useState } from 'react'
import { useData } from '../context/DataContext'

export default function Model(){
  const { columns, trainModels } = useData()
  const [target, setTarget] = useState('')
  const [results, setResults] = useState(null)

  async function run(){
    if(!target) return alert('Select a target column')
    setResults({status:'running'})
    const res = await trainModels(target)
    setResults(res)
  }

  return (
    <div>
      <h2>Train Models</h2>
      <div className="small">Train Logistic Regression, Decision Tree, and Naive Bayes in-browser using Pyodide + scikit-learn (packages may install at first run).</div>

      <div style={{marginTop:12}} className="controls">
        <select value={target} onChange={e=>setTarget(e.target.value)}>
          <option value="">-- select target column --</option>
          {columns.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={run}>Train</button>
      </div>

      <div style={{marginTop:12}} className="card">
        <h3>Results</h3>
        {results ? (
          <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(results, null, 2)}</pre>
        ) : <div className="small">No results yet</div>}
      </div>
    </div>
  )
}
