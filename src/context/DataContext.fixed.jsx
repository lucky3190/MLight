// DataContext.jsx with numpy boolean operation fixes
import React, { createContext, useContext, useState, useEffect } from 'react'

const DataContext = createContext()

export function useData(){
  return useContext(DataContext)
}

export function DataProvider({children}){
  // ... other state variables remain the same ...

  async function loadCSVFromText(text){
    if(!pyodide) throw new Error('Pyodide not ready')
    setCsvText(text)
    pyodide.globals.set('csv_text', text)
    const code = `
import pandas as pd, numpy as np, io
try:
    df = pd.read_csv(io.StringIO(csv_text))
    # trim whitespace for string/object columns to normalize values
    try:
        for c in df.select_dtypes(include=['object','string']).columns:
            df[c] = df[c].astype(str).str.strip()
    except Exception:
        pass
    globals()['df']=df
    res = df.head().to_json(orient='records')
    cols = list(df.columns)
    out = (res, cols)
except Exception as e:
    out = ('__ERROR__' + str(e), [])
out
`
    const out = await pyodide.runPythonAsync(code)
    // ... rest remains the same ...
  }

  async function normalizeColumn(col){
    if(pyodide){
      try{
        pyodide.globals.set('colname', col)
        const code = `
import pandas as pd, numpy as np
# coerce numeric values after trimming whitespace
s = pd.to_numeric(df[colname].astype(str).str.strip(), errors='coerce')
# handle NaN safely
nonnull = s.dropna()
if len(nonnull):
    minv = nonnull.min()
    maxv = nonnull.max()
    # use numpy where to handle NaN values correctly
    df[colname] = np.where(s.notna(), (s - minv) / (maxv - minv), np.nan)
res = df.head().to_json(orient='records')
res
`
        const out = await pyodide.runPythonAsync(code)
        const parsed = JSON.parse(out.toString())
        setRecords(parsed)
        return true
      }catch(e){ setError(e); return false }
    }
    // ... JS fallback remains the same ...
  }

  async function describeData(){
    if(pyodide){
      try{
        const code = `
import json, numpy as np
from pandas.api.types import is_numeric_dtype
out = {}
for c in df.columns:
    s = df[c]
    info = {
        'dtype': str(s.dtype),
        'missing': int(s.isnull().sum()),
        'unique': int(s.nunique())
    }
    # try to coerce numeric and get coercion stats
    try:
        numeric_s = pd.to_numeric(s.astype(str).str.strip(), errors='coerce')
        total = len(numeric_s)
        coerced = numeric_s.notna().sum()
        nan_count = numeric_s.isna().sum()
        info['numeric_coercion'] = {
            'total': total,
            'coerced': int(coerced),
            'would_be_nan': int(nan_count)
        }
    except Exception:
        info['numeric_coercion'] = {
            'total': len(s),
            'coerced': 0,
            'would_be_nan': len(s)
        }
    
    # numeric stats using numpy's nan-aware operations
    if is_numeric_dtype(s):
        nonnull = s.dropna()
        if len(nonnull):
            q = nonnull.quantile([0.25,0.5,0.75])
            info.update({
                'mean': float(nonnull.mean()),
                'std': float(nonnull.std()),
                'min': float(nonnull.min()),
                'max': float(nonnull.max()),
                'q1': float(q.loc[0.25]),
                'median': float(q.loc[0.5]),
                'q3': float(q.loc[0.75])
            })
        else:
            info.update({
                'mean': None, 'std': None,
                'min': None, 'max': None,
                'q1': None, 'median': None, 'q3': None
            })
    else:
        # top categories for non-numeric
        top = s.value_counts().head(5).to_dict()
        info.update({'top_categories': list(top.items())})

    # mode (handle NaN safely)
    try:
        m = s.dropna().mode()
        info['mode'] = str(m.iloc[0]) if len(m) else None
    except Exception:
        info['mode'] = None

    out[c] = info

json.dumps(out)
`
        const out = await pyodide.runPythonAsync(code)
        const jsonStr = out.toString()
        return JSON.parse(jsonStr)
      }catch(e){
        console.warn('describeData via Pyodide failed', e)
        setError(e)
      }
    }
    // ... JS fallback remains the same ...
  }

  // ... rest of the DataContext remains the same ...
}