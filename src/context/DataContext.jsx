import React, { createContext, useContext, useEffect, useState } from 'react'

const DataContext = createContext()

export function useData(){
  return useContext(DataContext)
}

export function DataProvider({children}){
  const [pyodide, setPyodide] = useState(null)
  const [loadingPyodide, setLoadingPyodide] = useState(true)
  const [pyStatus, setPyStatus] = useState('idle') // idle | loading | installing | ready | error
  const [installingPackages, setInstallingPackages] = useState(false)
  const [installMessage, setInstallMessage] = useState('')
  const [error, setError] = useState(null)
  const [csvText, setCsvText] = useState(null)
  const [records, setRecords] = useState([])
  const [columns, setColumns] = useState([])

  useEffect(()=>{
    let mounted = true
    async function init(){
      try{
        setLoadingPyodide(true)
        setPyStatus('loading')
        // loadPyodide is exposed by the script tag in index.html
        const py = await window.loadPyodide({indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'})
        if(!mounted) return
        setPyodide(py)
        // attempt to load lighter packages via pyodide loader first, then use micropip for the rest
        setInstallingPackages(true)
        setPyStatus('installing')
        try{
          setInstallMessage('Loading pandas via pyodide...')
          // pandas is available as a sysimage package in many pyodide builds; prefer loadPackage
          await py.loadPackage('pandas')
        }catch(e){
          console.warn('pyodide.loadPackage pandas failed, will try micropip later', e)
        }

        // Ensure micropip is available before calling micropip.install
        try{
          setInstallMessage('Loading micropip...')
          await py.loadPackage('micropip')
        }catch(e){
          // Some pyodide builds may not expose micropip via loadPackage; we'll still try to import it in Python
          console.warn('pyodide.loadPackage micropip failed (will attempt import in Python):', e)
        }

        // Install heavier packages with micropip (scikit-learn). Use try/catch per package to surface errors.
        const pipPkgs = ['scikit-learn']
        for(const pkg of pipPkgs){
          setInstallMessage(`Installing ${pkg}...`)
          try{
            // import micropip in Python and install the package
            await py.runPythonAsync(`import micropip\nawait micropip.install('${pkg}')`)
          }catch(e){
            console.warn(`Failed installing ${pkg}`, e)
            setError(`Failed installing ${pkg}: ${String(e)}`)
          }
        }
        setInstallMessage('')
        setInstallingPackages(false)
        setPyStatus('ready')
      }catch(err){
        console.error('Failed to load pyodide', err)
        setError(err)
        setPyStatus('error')
      }finally{
        setLoadingPyodide(false)
      }
    }
    init()
    return ()=>{mounted=false}
  },[])

  async function runPython(code){
    if(!pyodide) throw new Error('Pyodide not ready')
    return await pyodide.runPythonAsync(code)
  }

  async function loadCSVFromText(text){
    if(!pyodide) throw new Error('Pyodide not ready')
    setCsvText(text)
    // pass the csv text into the pyodide globals to avoid quoting issues
    pyodide.globals.set('csv_text', text)
    const code = `import pandas as pd, io\ntry:\n    df = pd.read_csv(io.StringIO(csv_text))\n    globals()['df']=df\n    res = df.head().to_json(orient='records')\n    cols = list(df.columns)\n    out = (res, cols)\nexcept Exception as e:\n    out = ('__ERROR__' + str(e), [])\nout`
    const out = await pyodide.runPythonAsync(code)
    try{
      const js = out.toJs ? out.toJs() : out
      const [jsonStr, cols] = js
      if(typeof jsonStr === 'string' && jsonStr.startsWith('__ERROR__')){
        const em = jsonStr.replace('__ERROR__','')
        setError(em)
        return null
      }
      const parsed = JSON.parse(jsonStr)
      setRecords(parsed)
      setColumns(cols)
      return {records: parsed, columns: cols}
    }catch(e){
      console.error('Failed to parse CSV result', e)
      setError(e)
      return null
    }
  }

  async function getHead(){
    if(!pyodide) return []
    const code = `res = df.head().to_json(orient='records')\nres`
    const out = await pyodide.runPythonAsync(code)
    const jsonStr = out.toString()
    return JSON.parse(jsonStr)
  }

  async function cleanDropNA(){
    if(!pyodide) return
    const code = `df.dropna(inplace=True)\nres = df.head().to_json(orient='records')\ncols = list(df.columns)\nres, cols`
    const out = await pyodide.runPythonAsync(code)
    const js = out.toJs ? out.toJs() : out
    const [jsonStr, cols] = js
    const parsed = JSON.parse(jsonStr)
    setRecords(parsed)
    setColumns(cols)
    return {records:parsed, columns:cols}
  }

  async function fillMissing(column, value){
    if(!pyodide) return
    pyodide.globals.set('colname', column)
    pyodide.globals.set('fillval', value)
    const code = `df[colname] = df[colname].fillna(fillval)\nres = df.head().to_json(orient='records')\nres`
    const out = await pyodide.runPythonAsync(code)
    const jsonStr = out.toString()
    const parsed = JSON.parse(jsonStr)
    setRecords(parsed)
    return parsed
  }

  async function encodeCategoricals(){
    if(!pyodide) return
    const code = `for c in df.select_dtypes(include=['object','category']).columns:\n    df[c] = df[c].astype('category').cat.codes\nres = df.head().to_json(orient='records')\ncols = list(df.columns)\nres, cols`
    const out = await pyodide.runPythonAsync(code)
    const js = out.toJs ? out.toJs() : out
    const [jsonStr, cols] = js
    const parsed = JSON.parse(jsonStr)
    setRecords(parsed)
    setColumns(cols)
    return {records:parsed, columns:cols}
  }

  // Describe data (dtypes, missing counts, uniques, numeric stats) — Pyodide preferred, JS fallback
  async function describeData(){
    // Try Pyodide + pandas if available and df exists
    if(pyodide){
      try{
        const code = `import json\nfrom pandas.api.types import is_numeric_dtype\nout = {}\nfor c in df.columns:\n    s = df[c]\n    info = {'dtype': str(s.dtype), 'missing': int(s.isnull().sum()), 'unique': int(s.nunique())}\n    if is_numeric_dtype(s):\n        nonnull = s.dropna()\n        if len(nonnull):\n            info.update({'mean': float(nonnull.mean()), 'std': float(nonnull.std()), 'min': float(nonnull.min()), 'max': float(nonnull.max())})\n        else:\n            info.update({'mean': None, 'std': None, 'min': None, 'max': None})\n    out[c]=info\njson.dumps(out)`
        const out = await pyodide.runPythonAsync(code)
        const jsonStr = out.toString()
        return JSON.parse(jsonStr)
      }catch(e){
        console.warn('describeData via Pyodide failed', e)
        setError(e)
        // fallthrough to JS fallback
      }
    }

    // JS fallback using current `records`
    if(!records || records.length===0) return null
    try{
      const cols = columns && columns.length? columns : Object.keys(records[0] || {})
      const summary = {}
      for(const c of cols){
        const vals = records.map(r=> r[c])
        const missing = vals.filter(v=> v===null || v===undefined || v==='').length
        const uniq = new Set(vals.filter(v=> v!==null && v!==undefined && v!=='')).size
        // type inference: numeric if all non-missing parseFloat ok
        const nonMissing = vals.filter(v=> v!==null && v!==undefined && v!=='')
        let numeric = true
        const numericVals = []
        for(const v of nonMissing){
          const n = Number(v)
          if(Number.isFinite(n)) numericVals.push(n)
          else { numeric = false; break }
        }
        const info = {dtype: numeric? 'number' : 'string', missing, unique: uniq}
        if(numeric && numericVals.length){
          const sum = numericVals.reduce((a,b)=>a+b,0)
          const mean = sum / numericVals.length
          const sq = numericVals.reduce((a,b)=>a + (b-mean)*(b-mean),0)
          const std = Math.sqrt(sq / (numericVals.length-1 || 1))
          info.mean = mean
          info.std = std
          info.min = Math.min(...numericVals)
          info.max = Math.max(...numericVals)
        }else{
          info.mean = null; info.std=null; info.min=null; info.max=null
        }
        summary[c] = info
      }
      return summary
    }catch(e){
      console.error('describeData JS fallback failed', e)
      setError(e)
      return null
    }
  }

  async function trainModels(targetColumn){
    if(!pyodide) throw new Error('Pyodide not ready')
    pyodide.globals.set('target', targetColumn)
    const code = `import json\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.tree import DecisionTreeClassifier\nfrom sklearn.naive_bayes import GaussianNB\nfrom sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score\nX = df.drop(columns=[target])\ny = df[target].copy()\nfor c in X.select_dtypes(include=['object','category']).columns:\n    X[c] = X[c].astype('category').cat.codes\nif y.dtype == 'O' or y.dtype.name == 'category':\n    y = y.astype('category').cat.codes\nX_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)\nmodels = {'LR': LogisticRegression(max_iter=200), 'DT': DecisionTreeClassifier(), 'NB': GaussianNB()}\nresults = {}\nfor name, m in models.items():\n    try:\n        m.fit(X_train, y_train)\n        preds = m.predict(X_test)\n        results[name] = {\n            'accuracy': float(accuracy_score(y_test, preds)),\n            'precision': float(precision_score(y_test, preds, average='weighted', zero_division=0)),\n            'recall': float(recall_score(y_test, preds, average='weighted', zero_division=0)),\n            'f1': float(f1_score(y_test, preds, average='weighted', zero_division=0))\n        }\n    except Exception as e:\n        results[name] = {'error': str(e)}\njson.dumps(results)\n`
    const out = await pyodide.runPythonAsync(code)
    const jsonStr = out.toString()
    try{
      const parsed = JSON.parse(jsonStr)
      return parsed
    }catch(e){
      return {error: jsonStr}
    }
  }

  // Simple IndexedDB helper to persist uploaded file blob
  function idbOpen(){
    return new Promise((resolve, reject)=>{
      const req = window.indexedDB.open('mlight-store', 1)
      req.onupgradeneeded = ()=>{
        const db = req.result
        if(!db.objectStoreNames.contains('files')) db.createObjectStore('files')
      }
      req.onsuccess = ()=> resolve(req.result)
      req.onerror = ()=> reject(req.error)
    })
  }

  async function saveFileToIDB(key, blob){
    try{
      const db = await idbOpen()
      const tx = db.transaction('files','readwrite')
      tx.objectStore('files').put(blob, key)
      return new Promise((res,rej)=>{tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error)})
    }catch(e){
      console.warn('Failed to save file to IDB', e)
      setError(e)
      return false
    }
  }

  async function getFileFromIDB(key){
    try{
      const db = await idbOpen()
      const tx = db.transaction('files','readonly')
      const req = tx.objectStore('files').get(key)
      return await new Promise((res,rej)=>{req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error)})
    }catch(e){
      console.warn('Failed to load file from IDB', e)
      setError(e)
      return null
    }
  }

  const value = {
    pyodide,
    loadingPyodide,
    pyStatus,
    installingPackages,
    installMessage,
    error,
    setError,
    csvText,
    records,
    columns,
    loadCSVFromText,
    getHead,
    cleanDropNA,
    fillMissing,
    encodeCategoricals,
    trainModels
    ,saveFileToIDB,getFileFromIDB
  }

  return (
    <DataContext.Provider value={value}>{children}</DataContext.Provider>
  )
}
