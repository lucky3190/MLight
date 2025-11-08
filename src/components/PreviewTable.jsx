import React from 'react'

export default function PreviewTable({rows}){
  if(!rows || rows.length===0) return <div className="small">No preview available</div>
  const cols = Object.keys(rows[0])
  return (
    <div style={{overflowX:'auto'}}>
      <table>
        <thead>
          <tr>{cols.map(c=> <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i)=> (
            <tr key={i}>{cols.map(c=> <td key={c}>{String(r[c])}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
