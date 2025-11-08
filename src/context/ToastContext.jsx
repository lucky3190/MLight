import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext()

export function useToast(){
  return useContext(ToastContext)
}

export function ToastProvider({children}){
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type='info', timeout=4000)=>{
    const id = Math.random().toString(36).slice(2,9)
    setToasts(t => [...t, {id, message, type}])
    setTimeout(()=> setToasts(t => t.filter(x=> x.id!==id)), timeout)
  },[])

  const removeToast = useCallback((id)=> setToasts(t => t.filter(x=> x.id!==id)), [])

  return (
    <ToastContext.Provider value={{showToast}}>
      {children}
      <div style={{position:'fixed',right:16,top:16,zIndex:9999,display:'flex',flexDirection:'column',gap:8}}>
        {toasts.map(t=> (
          <div key={t.id} style={{background: t.type==='error'? '#3b0b0b' : '#071a2a', color:'#fff', padding:10, borderRadius:8, minWidth:260, boxShadow:'0 6px 18px rgba(0,0,0,0.4)'}}>
            <div style={{fontWeight:600}}>{t.type === 'error' ? 'Error' : t.type === 'success' ? 'Success' : 'Info'}</div>
            <div style={{fontSize:13, marginTop:6}}>{t.message}</div>
            <div style={{textAlign:'right', marginTop:6}}><button onClick={()=> removeToast(t.id)}>Dismiss</button></div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
