import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import Plotly from 'plotly.js-dist-min'

export default function Visualize(){
  const { records, columns } = useData()
  const [x, setX] = useState('')
  const [y, setY] = useState('')

  function drawHistogram(col){
    const vals = records.map(r=> r[col]).filter(v=> v!==null && v!==undefined && v!=="")
    const data = [{ x: vals, type: 'histogram' }]
    Plotly.newPlot('viz', data, {title:`Histogram — ${col}`})
  }

  function drawScatter(xcol,ycol){
    const xvals = records.map(r=> r[xcol])
    const yvals = records.map(r=> r[ycol])
    const data = [{ x: xvals, y: yvals, mode:'markers', type:'scatter' }]
    Plotly.newPlot('viz', data, {title:`Scatter — ${xcol} vs ${ycol}`})
  }

  return (
    <div>
      <h2>Visualize</h2>
      <div className="small">Create histograms and scatter plots. Data transforms (correlation) can be added similarly.</div>

      <div style={{marginTop:12}} className="controls">
        <select value={x} onChange={e=>setX(e.target.value)}>
          <option value="">-- select column --</option>
          {columns.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={()=> x && drawHistogram(x)}>Histogram</button>

        <select value={y} onChange={e=>setY(e.target.value)}>
          <option value="">-- select column Y --</option>
          {columns.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={()=> x && y && drawScatter(x,y)}>Scatter</button>
      </div>

      <div id="viz" style={{height:420, marginTop:16}}>Select columns and render a plot.</div>
    </div>
  )
}
