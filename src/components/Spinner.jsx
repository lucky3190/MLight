import React from 'react'

export default function Spinner({message}){
  return (
    <div style={{display:'flex',alignItems:'center',gap:10}}>
      <div style={{width:18,height:18,border:'3px solid rgba(255,255,255,0.12)',borderTop:'3px solid var(--accent)',borderRadius:12,animation:'spin 1s linear infinite'}} />
      <div className="small">{message}</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
