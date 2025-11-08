import React from 'react'
import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'

export default function Compare(){
  const { } = useData()
  const [note] = useState('Use the Model page to train models; results will appear there for comparison.')

  useEffect(()=>{
    // placeholder
  },[])

  return (
    <div>
      <h2>Compare Models</h2>
      <div className="small">Model comparison visualizations will appear here. For now, open the Model page to train models and copy results here for comparison.</div>
      <div style={{marginTop:12}} className="card">
        <div className="small">{note}</div>
      </div>
    </div>
  )
}
