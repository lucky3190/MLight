import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Upload from './pages/Upload'
import Clean from './pages/Clean'
import Visualize from './pages/Visualize'
import Engineer from './pages/Engineer'
import Model from './pages/Model'
import Compare from './pages/Compare'

export default function App(){
  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="brand">
          <div style={{width:42,height:42,background:'#111827',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>ML</div>
          <div>
            <h1>MLight <span className="small">— An ML Playground</span></h1>
            <div className="small">Interactive canvas for ML workflows—lightweight, serverless, entirely in-browser.</div>
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end className={({isActive})=>isActive? 'active':''}>Upload</NavLink>
          <NavLink to="/clean" className={({isActive})=>isActive? 'active':''}>Clean</NavLink>
          <NavLink to="/visualize" className={({isActive})=>isActive? 'active':''}>Visualize</NavLink>
          <NavLink to="/engineer" className={({isActive})=>isActive? 'active':''}>Engineer</NavLink>
          <NavLink to="/model" className={({isActive})=>isActive? 'active':''}>Model</NavLink>
          <NavLink to="/compare" className={({isActive})=>isActive? 'active':''}>Compare</NavLink>
        </nav>
      </div>

      <div className="card">
        <Routes>
          <Route path="/" element={<Upload/>} />
          <Route path="/clean" element={<Clean/>} />
          <Route path="/visualize" element={<Visualize/>} />
          <Route path="/engineer" element={<Engineer/>} />
          <Route path="/model" element={<Model/>} />
          <Route path="/compare" element={<Compare/>} />
        </Routes>
      </div>
    </div>
  )
}
