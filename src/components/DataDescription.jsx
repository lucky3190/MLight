import React from 'react'

function StatCell({v}){
  if(v===null || v===undefined) return <td className="small">—</td>
  return <td className="small">{typeof v === 'number' ? Number(v).toFixed(3) : String(v)}</td>
}

export default function DataDescription({summary}){
  if(!summary) return <div className="small">No data to describe (upload a CSV first)</div>
  const cols = Object.keys(summary)
  return (
    <div style={{overflowX:'auto'}}>
      <table>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Missing</th>
            <th>Unique</th>
            <th>Mean</th>
            <th>Std</th>
            <th>Min</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>
          {cols.map(c=> (
            <tr key={c}>
              <td className="small">{c}</td>
              <td className="small">{summary[c].dtype}</td>
              <td className="small">{summary[c].missing}</td>
              <td className="small">{summary[c].unique}</td>
              <StatCell v={summary[c].mean} />
              <StatCell v={summary[c].std} />
              <StatCell v={summary[c].min} />
              <StatCell v={summary[c].max} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
