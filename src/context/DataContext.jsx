import React, { createContext, useContext, useEffect, useState } from 'react'

const DataContext = createContext()

export function useData(){
  return useContext(DataContext)
}

export function DataProvider({children}){
  const [pyodide, setPyodide] = useState(null)
  const [loadingPyodide, setLoadingPyodide] = useState(true)
  const [csvText, setCsvText] = useState(null)
  const [records, setRecords] = useState([])
  const [columns, setColumns] = useState([])

  useEffect(()=>{
    let mounted = true
    async function init(){
      try{
        setLoadingPyodide(true)
        // loadPyodide is exposed by the script tag in index.html
        const py = await window.loadPyodide({indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'})
        // try installing lightweight packages; scikit-learn can be heavy — this will run in-browser
        try{
          await py.runPythonAsync(`import micropip\nawait micropip.install(['pandas','scikit-learn'])`)
        }catch(e){
          // installation may fail or be slow; keep going — pandas may already be present
          // console.warn('micropip install failed', e)
        }
        if(mounted){
          setPyodide(py)
        }
      }catch(err){
        console.error('Failed to load pyodide', err)
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
    const code = `import pandas as pd, io\ndf = pd.read_csv(io.StringIO(csv_text))\nglobals()['df']=df\nres = df.head().to_json(orient='records')\ncols = list(df.columns)\nres, cols`
    const out = await pyodide.runPythonAsync(code)
    try{
      const js = out.toJs ? out.toJs() : out
      const [jsonStr, cols] = js
      const parsed = JSON.parse(jsonStr)
      setRecords(parsed)
      setColumns(cols)
      return {records: parsed, columns: cols}
    }catch(e){
      console.error('Failed to parse CSV result', e)
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

  const value = {
    pyodide,
    loadingPyodide,
    csvText,
    records,
    columns,
    loadCSVFromText,
    getHead,
    cleanDropNA,
    fillMissing,
    encodeCategoricals,
    trainModels
  }

  return (
    <DataContext.Provider value={value}>{children}</DataContext.Provider>
  )
}
