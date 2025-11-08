import React, { useState } from 'react'
import { useToast } from '../context/ToastContext'
import { useData } from '../context/DataContext'
import '../styles/ColumnActions.css'

export default function ColumnActions({col, onDrop, onImpute, onNormalize, onEncode, onPreview}){
  const [method, setMethod] = useState('mean')
  const [value, setValue] = useState('')
  const [showMissingModal, setShowMissingModal] = useState(false)
  const [showCoerceModal, setShowCoerceModal] = useState(false)
  const [missingData, setMissingData] = useState(null)
  const [coercePreview, setCoercePreview] = useState(null)
  const toast = useToast()
  const { getMissingRows, previewCoerceNumeric, coerceColumnToNumeric } = useData()

  const handlePreviewMissing = async () => {
    const data = await getMissingRows(col)
    if (data) {
      setMissingData(data)
      setShowMissingModal(true)
    } else {
      toast.showToast('Failed to get missing rows', 'error')
    }
  }

  const handlePreviewCoerce = async () => {
    const preview = await previewCoerceNumeric(col)
    if (preview) {
      setCoercePreview(preview)
      setShowCoerceModal(true)
    } else {
      toast.showToast('Failed to preview numeric coercion', 'error')
    }
  }

  const handleCoerceToNumeric = async () => {
    const ok = await coerceColumnToNumeric(col)
    toast.showToast(
      ok ? 'Column converted to numeric' : 'Conversion failed',
      ok ? 'success' : 'error'
    )
    setShowCoerceModal(false)
  }

  return (
    <div className="column-actions">
      <h3 className="title">Column Actions</h3>
      
      <div className="action-group">
        <h4 className="group-title">Basic Actions</h4>
        <button className="btn btn-danger" onClick={()=> onDrop(col)}>
          <i className="fas fa-trash"></i> Drop Column
        </button>
      </div>

      <div className="action-group">
        <h4 className="group-title">Missing Values</h4>
        <button className="btn btn-info" onClick={handlePreviewMissing}>
          <i className="fas fa-eye"></i> View Missing Rows
        </button>
        
        <div className="impute-controls">
          <div className="control-row">
            <select 
              className="select-input"
              value={method} 
              onChange={e=>setMethod(e.target.value)}
            >
              <option value="mean">Mean (numeric)</option>
              <option value="median">Median (numeric)</option>
              <option value="mode">Mode</option>
              <option value="constant">Constant</option>
            </select>
            {method==='constant' && (
              <input 
                className="text-input"
                placeholder="Enter value" 
                value={value} 
                onChange={e=>setValue(e.target.value)}
              />
            )}
          </div>
          <div className="button-row">
            <button 
              className="btn btn-primary"
              onClick={async ()=> {
                const ok = await onImpute(col, method, value)
                toast.showToast(
                  ok ? 'Imputation applied' : 'Imputation failed',
                  ok ? 'success' : 'error'
                )
              }}
            >
              <i className="fas fa-check"></i> Apply
            </button>
            <button 
              className="btn btn-secondary"
              onClick={async ()=> {
                const preview = await onPreview(col, method, value)
                if (preview && typeof onPreview.show === 'function') {
                  onPreview.show(preview)
                } else {
                  if (preview) toast.showToast('Preview ready', 'info')
                }
              }}
            >
              <i className="fas fa-eye"></i> Preview
            </button>
          </div>
        </div>
      </div>

      <div className="action-group">
        <h4 className="group-title">Transformations</h4>
        <button 
          className="btn btn-primary"
          onClick={handlePreviewCoerce}
        >
          <i className="fas fa-calculator"></i> Preview Numeric Coercion
        </button>
        <button 
          className="btn btn-primary"
          onClick={async ()=> {
            const ok = await onNormalize(col)
            toast.showToast(
              ok ? 'Normalized column' : 'Normalization failed',
              ok ? 'success' : 'error'
            )
          }}
        >
          <i className="fas fa-compress-arrows-alt"></i> Normalize (0-1)
        </button>
        <button 
          className="btn btn-primary"
          onClick={async ()=> {
            const cats = await onEncode(col)
            if (cats) {
              toast.showToast('Encoded column successfully', 'success')
            } else {
              toast.showToast('Encoding failed', 'error')
            }
          }}
        >
          <i className="fas fa-tag"></i> Encode Categorical
        </button>
      </div>

      {/* Missing Values Modal */}
      {showMissingModal && missingData && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h4>Missing Values in {col}</h4>
              <button className="close-btn" onClick={() => setShowMissingModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="stats-banner">
                <div className="stat-item">
                  <div className="stat-label">Total Missing</div>
                  <div className="stat-value">{missingData.total}</div>
                </div>
              </div>
              <div className="preview-table">
                <table>
                  <thead>
                    <tr>
                      {Object.keys(missingData.preview[0] || {}).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {missingData.preview.map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((value, j) => (
                          <td key={j}>{value === null ? '(missing)' : value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Numeric Coercion Modal */}
      {showCoerceModal && coercePreview && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h4>Numeric Coercion Preview for {col}</h4>
              <button className="close-btn" onClick={() => setShowCoerceModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="stats-banner">
                <div className="stat-item">
                  <div className="stat-label">Total Values</div>
                  <div className="stat-value">{coercePreview.total}</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Success Rate</div>
                  <div className="stat-value">{coercePreview.success_rate.toFixed(1)}%</div>
                </div>
                <div className="stat-item">
                  <div className="stat-label">Would Become NaN</div>
                  <div className="stat-value">{coercePreview.failed}</div>
                </div>
              </div>
              <div className="preview-section">
                <h5>Sample Conversions</h5>
                <div className="conversion-samples">
                  <div className="sample-group">
                    <h6>Successful Conversions</h6>
                    {Object.entries(coercePreview.success_samples).map(([i, val]) => (
                      <div key={i} className="sample-row success">
                        <span className="before">{val}</span>
                        <span className="arrow">→</span>
                        <span className="after">{Number(val)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="sample-group">
                    <h6>Failed Conversions</h6>
                    {Object.entries(coercePreview.failed_samples).map(([i, val]) => (
                      <div key={i} className="sample-row failed">
                        <span className="before">{val}</span>
                        <span className="arrow">→</span>
                        <span className="after">NaN</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-primary"
                  onClick={handleCoerceToNumeric}
                >
                  Convert to Numeric
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowCoerceModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
