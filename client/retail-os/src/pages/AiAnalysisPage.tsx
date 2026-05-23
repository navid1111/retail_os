import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/dashboard/Icon'
import { getStoreById, type Store } from '../services/stores'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

type AiAnalysisPageProps = {
  storeId: string
}

export interface YoloProductDetection {
  name: string
  brand: string
  confidence: number
}

export interface YoloCompetitorDetection {
  brand: string
  count: number
}

export interface YoloPredictResponse {
  provider: string
  modelName: string
  complianceScore: number
  productsDetected: YoloProductDetection[]
  competitorsDetected: YoloCompetitorDetection[]
  posmPresent?: boolean
  missingSkus: string[]
  issues: string[]
  annotatedImage: string
  processingMs: number
}

export interface AnalysisResponse {
  prediction: YoloPredictResponse
  report: string
}

function AnalysisStat({
  label,
  value,
  icon,
  filled = false,
}: {
  label: string
  value: string
  icon: string
  filled?: boolean
}) {
  return (
    <section className="analysis-stat">
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
      <Icon filled={filled} name={icon} />
    </section>
  )
}

function ShelfImagePanel({
  imageUrl,
  loading,
  onFileSelect,
}: {
  imageUrl?: string
  loading: boolean
  onFileSelect: (file: File) => void
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0])
    }
  }

  return (
    <section className="analysis-panel shelf-panel">
      <div className="analysis-panel__header">
        <h2>
          <Icon name="photo_camera" />
          Shelf Image Analysis
        </h2>
        {imageUrl && !loading && (
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)' }}>
              <Icon name="upload" />
              Upload New
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}
      </div>
      <div className="shelf-image" style={{ minHeight: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-container-low)' }}>
        {loading ? (
          <div className="analysis-loading" style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" style={{ border: '4px solid rgba(0,0,0,0.1)', borderLeftColor: 'var(--primary)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Running YOLO detection & Gemini analysis...</p>
          </div>
        ) : imageUrl ? (
          <img
            alt="Retail shelf analysis result"
            src={imageUrl}
            style={{ width: '100%', height: '500px', objectFit: 'contain', filter: 'none' }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', color: '#888', marginBottom: '16px' }}>
              <Icon name="cloud_upload" />
            </div>
            <p style={{ margin: '0 0 16px', fontWeight: 'bold', color: '#555' }}>No shelf image analyzed yet for this store.</p>
            <label className="button button--primary" style={{ cursor: 'pointer', padding: '8px 16px', display: 'inline-block', background: 'var(--primary)', color: 'var(--primary-text)', fontWeight: 'bold', borderRadius: '4px' }}>
              Select Shelf Image
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}
      </div>
    </section>
  )
}

function ComplianceScore({ score }: { score: number }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  let rating = 'Poor'
  let color = 'var(--error)'
  if (score >= 90) {
    rating = 'Excellent'
    color = '#16a34a'
  } else if (score >= 80) {
    rating = 'Good'
    color = '#16a34a'
  } else if (score >= 60) {
    rating = 'Fair'
    color = '#eab308'
  }

  return (
    <section className="analysis-panel compliance-card">
      <h2>Compliance Score</h2>
      <div className="score-ring">
        <svg viewBox="0 0 160 160">
          <circle cx="80" cy="80" fill="transparent" r={radius} stroke="var(--border)" strokeWidth="12" />
          <circle 
            cx="80" 
            cy="80" 
            fill="transparent" 
            r={radius} 
            stroke={color} 
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div>
          <strong>
            {score}<span>/100</span>
          </strong>
          <em style={{ color }}>{rating}</em>
        </div>
      </div>
      <p>Overall shelf alignment to planogram</p>
    </section>
  )
}

function IssuesFound({ issues }: { issues: string[] }) {
  return (
    <section className="analysis-panel side-report">
      <h2>Issues Found</h2>
      {issues.length === 0 ? (
        <div style={{ color: '#666', fontSize: '13px', padding: '8px 0' }}>No policy violations or compliance issues found.</div>
      ) : (
        issues.map((issue, idx) => {
          const isCritical = issue.toLowerCase().includes('missing') || issue.toLowerCase().includes('critical') || issue.toLowerCase().includes('absent')
          return (
            <div className={`issue-card ${isCritical ? 'issue-card--error' : ''}`} key={idx}>
              <Icon name={isCritical ? 'error' : 'warning'} />
              <div>
                <strong>{isCritical ? 'Critical Issue' : 'Compliance Warning'}</strong>
                <p>{issue}</p>
              </div>
            </div>
          )
        })
      )}
    </section>
  )
}

function PosmStatus({ present }: { present: boolean }) {
  return (
    <section className="analysis-panel side-report">
      <h2>POSM Status</h2>
      <div className={`posm-card ${!present ? 'posm-card--missing' : ''}`} style={!present ? { border: '1px solid rgba(186, 26, 26, 0.3)', background: 'rgba(186, 26, 26, 0.05)' } : undefined}>
        <span style={!present ? { backgroundColor: 'var(--error)' } : undefined}>
          <Icon name={present ? "check" : "close"} />
        </span>
        <div>
          <strong style={!present ? { color: 'var(--error)' } : undefined}>{present ? "Present" : "Visible"}</strong>
          <p style={!present ? { color: '#666' } : undefined}>{present ? "Promotional material visible" : "Promotional material not detected"}</p>
        </div>
      </div>
    </section>
  )
}

function ProductBreakdown({ products }: { products: YoloProductDetection[] }) {
  return (
    <section className="analysis-panel breakdown-panel">
      <div className="analysis-panel__header">
        <h2>Detected Products</h2>
        <span>{String(products.length).padStart(2, '0')} FOUND</span>
      </div>
      <div className="breakdown-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {products.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666', fontSize: '13px' }}>No products detected on shelf.</div>
        ) : (
          products.map((prod, index) => (
            <div className="breakdown-row" key={prod.name + index}>
              <div>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{prod.name}</strong>
              </div>
              <em>{Math.round(prod.confidence * 100)}% CONF.</em>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function MissingSkuPanel({ skus }: { skus: string[] }) {
  return (
    <section className="analysis-panel breakdown-panel">
      <div className="analysis-panel__header">
        <h2>Missing SKUs</h2>
        <span className={skus.length > 0 ? "analysis-critical" : ""}>{skus.length > 0 ? `${String(skus.length).padStart(2, '0')} CRITICAL` : 'NONE'}</span>
      </div>
      <div className="missing-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {skus.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666', fontSize: '13px' }}>All mandatory SKUs are present.</div>
        ) : (
          skus.map((name) => (
            <div className="missing-row" key={name}>
              <span>
                <Icon name="close" />
              </span>
              <div>
                <strong>{name}</strong>
                <p>Mandatory Planogram SKU missing from shelf</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function CompetitorPanel({ competitors }: { competitors: YoloCompetitorDetection[] }) {
  const totalFacings = competitors.reduce((sum, c) => sum + c.count, 0)
  return (
    <section className="analysis-panel breakdown-panel">
      <div className="analysis-panel__header">
        <h2>Competitor Presence</h2>
        <span>{String(totalFacings).padStart(2, '0')} FACINGS</span>
      </div>
      <div className="competitor-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {competitors.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#666', fontSize: '13px' }}>No competitor presence detected.</div>
        ) : (
          competitors.map((comp) => {
            const maxCount = Math.max(...competitors.map(c => c.count), 1)
            const widthPct = `${(comp.count / maxCount) * 100}%`
            return (
              <div key={comp.brand}>
                <p>
                  <strong>{comp.brand}</strong>
                  <span>{comp.count} FACINGS</span>
                </p>
                <i>
                  <b style={{ width: widthPct }} />
                </i>
              </div>
            )
          })
        )}
        {competitors.length > 0 && (
          <blockquote>
            "Competitor shelf share is computed based on detected facings."
          </blockquote>
        )}
      </div>
    </section>
  )
}

export function AiAnalysisPage({ storeId }: AiAnalysisPageProps) {
  const [store, setStore] = useState<Store | null>(null)
  const [error, setError] = useState('')
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const visitId = useMemo(() => new URLSearchParams(window.location.search).get('visitId'), [])

  useEffect(() => {
    let isMounted = true

    getStoreById(storeId)
      .then((item) => {
        if (isMounted) {
          setStore(item)
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(
            requestError instanceof Error ? requestError.message : 'Failed to fetch store'
          )
        }
      })

    return () => {
      isMounted = false
    }
  }, [storeId])

  useEffect(() => {
    if (!visitId) return

    let isMounted = true
    let pollTimeoutId: number | undefined

    const pollAnalysis = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/visits/${visitId}/analysis`, {
          credentials: 'include',
        })

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}))
          throw new Error(errJson.reason || errJson.error || `Failed to fetch analysis (${response.status})`)
        }

        const data = await response.json()
        
        if (data.status === 'processing') {
          if (isMounted) {
            pollTimeoutId = window.setTimeout(pollAnalysis, 2000)
          }
        } else if (data.status === 'completed') {
          if (isMounted) {
            setAnalysisData({
              prediction: data.prediction,
              report: data.report
            })
            setLoading(false)
          }
        } else if (data.status === 'flagged' || data.status === 'failed') {
          throw new Error(data.reason || data.message || 'AI analysis is unavailable for this visit.')
        } else {
          throw new Error(data.message || 'AI analysis failed.')
        }
      } catch (err: any) {
        if (isMounted) {
          setUploadError(err.message || 'Failed to retrieve AI analysis.')
          setLoading(false)
        }
      }
    }

    pollAnalysis()

    return () => {
      isMounted = false
      if (pollTimeoutId) {
        window.clearTimeout(pollTimeoutId)
      }
    }
  }, [visitId])

  const storeName = useMemo(() => store?.storeName ?? 'Store', [store])

  const handleFileSelect = async (file: File) => {
    setLoading(true)
    setUploadError('')
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('storeId', storeId)
    if (visitId) {
      formData.append('visitId', visitId)
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/yolo/analyze`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(errJson.error || `Failed to analyze image (${response.status})`)
      }

      const data = await response.json()
      setAnalysisData(data)
    } catch (err: any) {
      console.error(err)
      setUploadError(err.message || 'An error occurred during analysis.')
    } finally {
      setLoading(false)
    }
  }

  // Derive POSM status: check if any detected product includes a POSM SKU
  const isPosmPresent = useMemo(() => {
    if (!analysisData || !store) return true
    if (typeof analysisData.prediction.posmPresent === 'boolean') {
      return analysisData.prediction.posmPresent
    }
    const posmSkus = store.skus.filter(s => s.isPosm)
    if (posmSkus.length === 0) return true
    return posmSkus.some(posmSku => 
      analysisData.prediction.productsDetected.some(p => 
        p.name.toLowerCase().includes(posmSku.skuName.toLowerCase())
      )
    )
  }, [analysisData, store])

  return (
    <div className="analysis-page">
      <header className="analysis-header">
        <div className="analysis-header__inner">
          <div className="analysis-header__left">
            <a href={`/stores/${storeId}/visit`}>
              <Icon name="arrow_back" />
              Back to Visit
            </a>
            <div />
            <section>
              <h1>Shelf Analysis Report: {storeName}</h1>
              <p>Visit #VIS-221 · Live AI Auditor</p>
            </section>
          </div>
          <span className="analysis-status" style={!analysisData ? { backgroundColor: '#6b7280' } : undefined}>
            <Icon name={analysisData ? "check_circle" : "pending"} />
            {analysisData ? "Analysis Completed" : "Awaiting Shelf Image"}
          </span>
        </div>
      </header>

      <main className="analysis-main">
        {error ? <div className="store-state store-state--error">{error}</div> : null}
        {uploadError ? <div className="store-state store-state--error" style={{ marginBottom: '24px' }}>{uploadError}</div> : null}

        <div className="analysis-stats">
          <AnalysisStat 
            filled={!!analysisData} 
            icon={analysisData ? "task_alt" : "pending"} 
            label="Analysis Status" 
            value={analysisData ? "Completed" : "Awaiting Image"} 
          />
          <AnalysisStat 
            icon="neurology" 
            label="Provider" 
            value={analysisData ? analysisData.prediction.provider || "YOLO + Gemini" : "—"} 
          />
          <AnalysisStat 
            icon="speed" 
            label="Processing Time" 
            value={analysisData ? `${(analysisData.prediction.processingMs / 1000).toFixed(2)}s` : "—"} 
          />
        </div>

        <div className="analysis-grid">
          <div className="analysis-left">
            <ShelfImagePanel 
              imageUrl={analysisData?.prediction.annotatedImage} 
              loading={loading} 
              onFileSelect={handleFileSelect} 
            />
            
            {analysisData && (
              <section className="analysis-summary">
                <h2>AI Executive Summary</h2>
                <p>"{analysisData.report}"</p>
              </section>
            )}
          </div>

          <aside className="analysis-right">
            <ComplianceScore score={analysisData ? analysisData.prediction.complianceScore : 0} />
            <IssuesFound issues={analysisData ? analysisData.prediction.issues : []} />
            <PosmStatus present={isPosmPresent} />
          </aside>
        </div>

        <div className="analysis-breakdown">
          <ProductBreakdown products={analysisData ? analysisData.prediction.productsDetected : []} />
          <MissingSkuPanel skus={analysisData ? analysisData.prediction.missingSkus : []} />
          <CompetitorPanel competitors={analysisData ? analysisData.prediction.competitorsDetected : []} />
        </div>
      </main>

      <footer className="analysis-footer">
        <span>RetailOS Intelligence</span>
        <span>
          {analysisData 
            ? `${analysisData.prediction.modelName} · ${analysisData.prediction.processingMs}ms processing` 
            : 'Ready for analysis'}
        </span>
      </footer>
    </div>
  )
}
