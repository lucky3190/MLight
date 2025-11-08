import React from 'react'

export default function Modal({title, children, onClose, actions}){
  return (
    <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(2,6,23,0.6)',zIndex:10000}}>
      <div style={{width:'min(820px,95%)',background:'var(--surface)',padding:18,borderRadius:10,color:'var(--text)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3 style={{margin:0}}>{title}</h3>
          <div><button onClick={onClose}>Close</button></div>
        </div>
        <div style={{marginTop:12}}>{children}</div>
        {actions && <div style={{marginTop:12,display:'flex',gap:8,justifyContent:'flex-end'}}>{actions}</div>}
      </div>
    </div>
  )
}
