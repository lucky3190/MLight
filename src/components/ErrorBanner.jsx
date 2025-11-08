import React from 'react'

export default function ErrorBanner({error, onClose}){
  if(!error) return null
  return (
    <div style={{background:'linear-gradient(90deg,#ff4d4f00,#ff4d4f14)',border:'1px solid rgba(255,77,79,0.2)',padding:12,borderRadius:8,marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <div>
          <strong style={{color:'#ff7b7b'}}>Error</strong>
          <div className="small" style={{marginTop:6,whiteSpace:'pre-wrap'}}>{String(error)}</div>
        </div>
        <div>
          <button onClick={onClose}>Dismiss</button>
        </div>
      </div>
    </div>
  )
}
