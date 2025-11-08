import React, { useState, useEffect } from 'react'

export default function ColumnSummary({col, summary, records}){
  if(!col) return <div className="small">Select a column to see details.</div>
  if(!summary || !summary[col]) return <div className="small">No summary available for {col}</div>
  const s = summary[col]

  return (
    <div>
      <h3>Column: {col}</h3>
      <div className="small">Type: {s.dtype}</div>
      <div style={{marginTop:8}}>
        <table>
          <tbody>
            <tr><td className="small">Missing</td><td className="small">{s.missing} ({((s.missing / (records? records.length:1))*100).toFixed(2)}%)</td></tr>
            <tr><td className="small">Unique</td><td className="small">{s.unique}</td></tr>
            <tr><td className="small">Mode</td><td className="small">{s.mode ?? '—'}</td></tr>
            <tr><td className="small">Mean</td><td className="small">{s.mean !== null ? Number(s.mean).toFixed(4) : '—'}</td></tr>
            <tr><td className="small">Median</td><td className="small">{s.median !== null ? Number(s.median).toFixed(4) : '—'}</td></tr>
            <tr><td className="small">Std</td><td className="small">{s.std !== null ? Number(s.std).toFixed(4) : '—'}</td></tr>
            <tr><td className="small">Min</td><td className="small">{s.min !== null ? s.min : '—'}</td></tr>
            <tr><td className="small">25%</td><td className="small">{s.q1 !== null ? s.q1 : '—'}</td></tr>
            <tr><td className="small">50%</td><td className="small">{s.median !== null ? s.median : '—'}</td></tr>
            <tr><td className="small">75%</td><td className="small">{s.q3 !== null ? s.q3 : '—'}</td></tr>
          </tbody>
        </table>
      </div>

      {s.top_categories && s.top_categories.length>0 && (
        <div style={{marginTop:8}}>
          <div className="small">Top categories</div>
          <table>
            <tbody>
              {s.top_categories.slice(0,5).map(([k,v])=> (
                <tr key={k}><td className="small">{k}</td><td className="small">{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
