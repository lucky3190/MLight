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

  // Column-level operations
  async function dropColumn(col){
    if(pyodide){
      try{
        pyodide.globals.set('colname', col)
        const code = `df.drop(columns=[colname], inplace=True)\nres = df.head().to_json(orient='records')\ncols = list(df.columns)\nres, cols`
        const out = await pyodide.runPythonAsync(code)
        const js = out.toJs ? out.toJs() : out
        const [jsonStr, cols] = js
        const parsed = JSON.parse(jsonStr)
        setRecords(parsed); setColumns(cols)
        return true
      }catch(e){ setError(e); return false }
    }
    // JS fallback: modify records array snapshot
    try{
      const newRecords = records.map(r=>{ const nr = {...r}; delete nr[col]; return nr })
      const newCols = columns.filter(c=> c!==col)
      setRecords(newRecords); setColumns(newCols)
      return true
    }catch(e){ setError(e); return false }
  }

  async function imputeColumn(col, method, value=null){
    // method: 'mean','median','mode','constant','ffill','bfill'
    if(pyodide){
      try{
        pyodide.globals.set('colname', col)
        if(method==='constant'){
          pyodide.globals.set('fillval', value)
          await pyodide.runPythonAsync(`df[colname] = df[colname].fillna(fillval)`)
        }else if(method==='mean'){
          await pyodide.runPythonAsync(`df[colname] = df[colname].astype(float).fillna(df[colname].astype(float).mean())`)
        }else if(method==='median'){
          await pyodide.runPythonAsync('df[colname] = df[colname].astype(float).fillna(df[colname].astype(float).median())')
        }else if(method==='mode'){
          await pyodide.runPythonAsync(`df[colname] = df[colname].fillna(df[colname].mode().iloc[0] if not df[colname].mode().empty else df[colname].iloc[0])`)
        }else if(method==='ffill' || method==='bfill'){
          const dir = method==='ffill' ? 'ffill' : 'bfill'
          await pyodide.runPythonAsync(`df[colname] = df[colname].fillna(method='${dir}')`)
        }
        // update preview
        const out = await pyodide.runPythonAsync(`res = df.head().to_json(orient='records')\nres`)
        const parsed = JSON.parse(out.toString())
        setRecords(parsed)
        return true
      }catch(e){ setError(e); return false }
    }
    // JS fallback operate on records snapshot
    try{
      const newRecords = records.map(r=> ({...r}))
      const colVals = newRecords.map(r=> r[col]).filter(v=> v!==null && v!==undefined && v!=="")
      if(method==='mean'){
        const nums = colVals.map(Number).filter(n=> Number.isFinite(n))
        const mean = nums.reduce((a,b)=>a+b,0)/ (nums.length||1)
        newRecords.forEach(r=>{ if(r[col]===null||r[col]===''||r[col]===undefined) r[col]=mean })
      }else if(method==='median'){
        const nums = colVals.map(Number).filter(n=> Number.isFinite(n)).sort((a,b)=>a-b)
        const mid = Math.floor(nums.length/2)
        const median = nums.length? (nums.length%2? nums[mid] : (nums[mid-1]+nums[mid])/2) : null
        newRecords.forEach(r=>{ if(r[col]===null||r[col]===''||r[col]===undefined) r[col]=median })
      }else if(method==='mode'){
        const freq = {}
        colVals.forEach(v=>{ freq[v]= (freq[v]||0)+1 })
        const mode = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0] || null
        newRecords.forEach(r=>{ if(r[col]===null||r[col]===''||r[col]===undefined) r[col]=mode })
      }else if(method==='constant'){
        newRecords.forEach(r=>{ if(r[col]===null||r[col]===''||r[col]===undefined) r[col]=value })
      }
      setRecords(newRecords)
      return true
    }catch(e){ setError(e); return false }
  }

  async function normalizeColumn(col){
    if(pyodide){
      try{
        pyodide.globals.set('colname', col)
        const code = `s = df[colname].astype(float)\nminv = s.min()\nmaxv = s.max()\ndf[colname] = (s - minv) / (maxv - minv)\nres = df.head().to_json(orient='records')\nres`
        const out = await pyodide.runPythonAsync(code)
        const parsed = JSON.parse(out.toString())
        setRecords(parsed)
        return true
      }catch(e){ setError(e); return false }
    }
    try{
      const nums = records.map(r=> Number(r[col])).filter(n=> Number.isFinite(n))
      const minv = Math.min(...nums); const maxv = Math.max(...nums)
      const newRecords = records.map(r=> ({...r, [col]: Number.isFinite(Number(r[col])) ? (Number(r[col]) - minv)/(maxv-minv||1) : r[col]}))
      setRecords(newRecords)
      return true
    }catch(e){ setError(e); return false }
  }

  async function encodeColumn(col){
    if(pyodide){
      try{
        pyodide.globals.set('colname', col)
        const code = `df[colname] = df[colname].astype('category').cat.codes\nres = df.head().to_json(orient='records')\nres, list(df[colname].dtype.categories) if hasattr(df[colname].dtype, 'categories') else (res, [])`
        const out = await pyodide.runPythonAsync(code)
        const js = out.toJs ? out.toJs() : out
        const [jsonStr, cats] = js
        const parsed = JSON.parse(jsonStr)
        setRecords(parsed)
        return {categories: cats}
      }catch(e){ setError(e); return null }
    }
    // JS fallback: map unique values to codes
    try{
      const vals = Array.from(new Set(records.map(r=> r[col])))
      const map = Object.fromEntries(vals.map((v,i)=>[v,i]))
      const newRecords = records.map(r=> ({...r, [col]: map[r[col]]}))
      setRecords(newRecords)
      return {categories: vals}
    }catch(e){ setError(e); return null }
  }

  async function previewImputation(col, method, value=null){
    // Return an array of before/after sample values for the column
    if(pyodide){
      try{
        pyodide.globals.set('colname', col)
        if(method==='constant') pyodide.globals.set('fillval', value)
        const code = `s = df[colname].copy()\nif '${method}' == 'constant':\n    s = s.fillna(fillval)\nelif '${method}' == 'mean':\n    s = s.astype(float).fillna(s.astype(float).mean())\nelif '${method}' == 'median':\n    s = s.astype(float).fillna(s.astype(float).median())\nelif '${method}' == 'mode':\n    s = s.fillna(s.mode().iloc[0] if not s.mode().empty else None)\nres = [{'before': str(v_before), 'after': str(v_after)} for v_before, v_after in zip(df[colname].head(10).tolist(), s.head(10).tolist())]\nimport json\njson.dumps(res)`
        const out = await pyodide.runPythonAsync(code)
        return JSON.parse(out.toString())
      }catch(e){ setError(e); return null }
    }
    // JS fallback
    try{
      const sample = records.slice(0,10).map(r=> r[col])
      const after = []
      if(method==='mean'){
        const nums = records.map(r=> Number(r[col])).filter(n=> Number.isFinite(n))
        const mean = nums.reduce((a,b)=>a+b,0)/(nums.length||1)
        after.push(...sample.map(v=> (v===null||v===''||v===undefined)? mean : v))
      }else if(method==='median'){
        const nums = records.map(r=> Number(r[col])).filter(n=> Number.isFinite(n)).sort((a,b)=>a-b)
        const mid = Math.floor(nums.length/2); const median = nums.length? (nums.length%2? nums[mid] : (nums[mid-1]+nums[mid])/2) : null
        after.push(...sample.map(v=> (v===null||v===''||v===undefined)? median : v))
      }else if(method==='mode'){
        const freq = {}; records.forEach(r=>{ const v=r[col]; if(v!==null&&v!==undefined&&v!=='') freq[v]=(freq[v]||0)+1 })
        const mode = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0]||null
        after.push(...sample.map(v=> (v===null||v===''||v===undefined)? mode : v))
      }else if(method==='constant'){
        after.push(...sample.map(v=> (v===null||v===''||v===undefined)? value : v))
      }else{
        after.push(...sample)
      }
      return sample.map((before,i)=> ({before, after: after[i]}))
    }catch(e){ setError(e); return null }
  }

  // Describe data (dtypes, missing counts, uniques, numeric stats) — Pyodide preferred, JS fallback
  async function describeData(){
    // Prefer Pyodide + pandas if available
    if(pyodide){
      try{
        const code = `import json\nfrom pandas.api.types import is_numeric_dtype\nout = {}\nfor c in df.columns:\n    s = df[c]\n    info = {'dtype': str(s.dtype), 'missing': int(s.isnull().sum()), 'unique': int(s.nunique())}\n    # numeric stats\n    if is_numeric_dtype(s):\n        nonnull = s.dropna()\n        if len(nonnull):\n            q = nonnull.quantile([0.25,0.5,0.75])\n            info.update({'mean': float(nonnull.mean()), 'std': float(nonnull.std()), 'min': float(nonnull.min()), 'max': float(nonnull.max()), 'q1': float(q.loc[0.25]), 'median': float(q.loc[0.5]), 'q3': float(q.loc[0.75])})\n        else:\n            info.update({'mean': None, 'std': None, 'min': None, 'max': None, 'q1': None, 'median': None, 'q3': None})\n    else:\n        # top categories for non-numeric\n        top = s.value_counts().head(5).to_dict()\n        info.update({'top_categories': list(top.items())})\n    # mode (may be NaN)\n    try:\n        m = s.mode()\n        info['mode'] = str(m.iloc[0]) if len(m) else None\n    except Exception:\n        info['mode'] = None\n    out[c]=info\njson.dumps(out)`
        const out = await pyodide.runPythonAsync(code)
        const jsonStr = out.toString()
        return JSON.parse(jsonStr)
      }catch(e){
        console.warn('describeData via Pyodide failed', e)
        setError(e)
        // fall through to JS fallback
      }
    }

    // JS fallback using current `records` snapshot
    if(!records || records.length===0) return null
    try{
      const cols = columns && columns.length? columns : Object.keys(records[0] || {})
      const summary = {}
      for(const c of cols){
        const vals = records.map(r=> r[c])
        const total = vals.length
        const missing = vals.filter(v=> v===null || v===undefined || v==='').length
        const nonMissing = vals.filter(v=> v!==null && v!==undefined && v!=='')
        const uniqSet = new Set(nonMissing)
        const uniq = uniqSet.size
        // type inference: numeric if most values coerce to finite numbers
        const numericVals = nonMissing.map(v=> Number(v)).filter(n=> Number.isFinite(n))
        const numeric = numericVals.length >= Math.max(1, Math.floor(nonMissing.length * 0.6))
        const info = {dtype: numeric? 'number' : 'string', missing, unique: uniq, total}
        if(numeric && numericVals.length){
          const sorted = numericVals.slice().sort((a,b)=>a-b)
          const sum = numericVals.reduce((a,b)=>a+b,0)
          const mean = sum / numericVals.length
          const median = sorted.length ? (sorted.length%2? sorted[Math.floor(sorted.length/2)] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2) : null
          const q1 = sorted.length ? sorted[Math.floor(sorted.length*0.25)] : null
          const q3 = sorted.length ? sorted[Math.floor(sorted.length*0.75)] : null
          const sq = numericVals.reduce((a,b)=>a + (b-mean)*(b-mean),0)
          const std = Math.sqrt(sq / (numericVals.length-1 || 1))
          info.mean = mean; info.std = std; info.min = Math.min(...numericVals); info.max = Math.max(...numericVals); info.median = median; info.q1 = q1; info.q3 = q3
          // mode for numeric
          const freq = {}
          numericVals.forEach(v=> freq[v] = (freq[v]||0)+1)
          info.mode = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? null
        }else{
          // categorical top categories
          const freq = {}
          nonMissing.forEach(v=> freq[v] = (freq[v]||0)+1)
          const top = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,5)
          info.top_categories = top
          info.mode = top.length? top[0][0] : null
          info.mean = null; info.std = null; info.min = null; info.max = null; info.median = null; info.q1 = null; info.q3 = null
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

  // Run a full column-level summary using pandas if available (heavy) — returns object for that column
  async function runFullColumnSummary(col){
    if(!col) return null
    if(pyodide){
      try{
        pyodide.globals.set('colname', col)
        const code = `import json\ns = df[colname]\ninfo = {'dtype': str(s.dtype), 'missing': int(s.isnull().sum()), 'unique': int(s.nunique())}\ntry:\n    desc = s.describe()\n    info.update({'count': int(desc.get('count', 0)), 'mean': float(desc.get('mean', None)) if not desc.get('mean') is None else None, 'std': float(desc.get('std', None)) if not desc.get('std') is None else None, 'min': float(desc.get('min', None)) if not desc.get('min') is None else None, '25%': float(desc.get('25%', None)) if not desc.get('25%') is None else None, '50%': float(desc.get('50%', None)) if not desc.get('50%') is None else None, '75%': float(desc.get('75%', None)) if not desc.get('75%') is None else None, 'max': float(desc.get('max', None)) if not desc.get('max') is None else None})\nexcept Exception:\n    pass\ntry:\n    top = s.value_counts().head(10).to_dict()\n    info['top_categories'] = list(top.items())\nexcept Exception:\n    info['top_categories'] = []\njson.dumps(info)`
        const out = await pyodide.runPythonAsync(code)
        return JSON.parse(out.toString())
      }catch(e){ setError(e); return null }
    }
    // JS fallback: return describeData()[col]
    const s = await describeData()
    return s ? s[col] : null
  }

  // Save current data snapshot (CSV) into IDB under a key. Uses Pyodide if available for accurate CSV, otherwise JS build.
  async function saveCurrentDataToIDB(key){
    try{
      let csvText = null
      if(pyodide){
        try{
          const out = await pyodide.runPythonAsync(`import io\nbuf = io.StringIO()\ndf.to_csv(buf, index=False)\nbuf.getvalue()`)
          csvText = out.toString()
        }catch(e){
          console.warn('Failed to export CSV from pyodide df, falling back to JS:', e)
        }
      }
      if(!csvText){
        // build CSV from records snapshot
        if(!records || records.length===0) return false
        const cols = columns && columns.length? columns : Object.keys(records[0])
        const lines = [cols.join(',')]
        for(const r of records){
          const row = cols.map(c=> {
            const v = r[c]
            if(v===null || v===undefined) return ''
            const s = String(v).replace(/"/g,'""')
            return s.includes(',') || s.includes('\n') ? `"${s}"` : s
          })
          lines.push(row.join(','))
        }
        csvText = lines.join('\n')
      }
      const blob = new Blob([csvText], {type:'text/csv'})
      return await saveFileToIDB(key, blob)
    }catch(e){ setError(e); return false }
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
    ,saveFileToIDB,getFileFromIDB, describeData, saveCurrentDataToIDB, runFullColumnSummary,
    dropColumn, imputeColumn, normalizeColumn, encodeColumn, previewImputation
  }

  return (
    <DataContext.Provider value={value}>{children}</DataContext.Provider>
  )
}
