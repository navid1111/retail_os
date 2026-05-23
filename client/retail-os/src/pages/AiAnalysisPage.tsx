import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/dashboard/Icon'
import { getStoreById, type Store } from '../services/stores'

type AiAnalysisPageProps = {
  storeId: string
}

const detectedProducts = [
  ['Coca Cola 500ml', '94% CONF.'],
  ['Sprite 1L', '88% CONF.'],
  ['Fanta Orange', '91% CONF.'],
  ['Coca Cola Zero', '82% CONF.'],
]

const missingSkus = [
  ['Diet Coke', 'Mandatory Core SKU'],
  ['Coke Vanilla', 'Seasonal Campaign SKU'],
]

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

function ShelfImagePanel() {
  return (
    <section className="analysis-panel shelf-panel">
      <div className="analysis-panel__header">
        <h2>
          <Icon name="photo_camera" />
          Shelf Image Analysis
        </h2>
        <div>
          <button type="button">
            <Icon name="zoom_in" />
          </button>
          <button type="button">
            <Icon name="layers" />
          </button>
        </div>
      </div>
      <div className="shelf-image">
        <img
          alt="Retail shelf with soda bottles"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhKpAc8QSiFqAiwSjAyVO0NObrwI-RcAuwSlihyS9XEJIpr4Vdk3Lw4QoMwjqkDh-eUrDYK-lq6QhwbVEOCEIL2KVCGPSC6x1EV8I_w9PHPUAaroNMVR_qOEFnuKZkmWafLO9VWXsXoi3YW7Exdj_WV5Q6S5vcC7yZ7H1TDzkPB6hlcefG18-mphz4GWJtL90i_lyQCz-miM56ypB4SaiKc8sW7lKKbDKq0OQSRsfJnzOJyo6Oagohzou161O2lYDJ2YKmltmGt1ec"
        />
        <div className="ai-box ai-box--one">
          <span>COKE_500ML 94%</span>
        </div>
        <div className="ai-box ai-box--two">
          <span>COKE_500ML 92%</span>
        </div>
        <div className="ai-box ai-box--three">
          <span>COMPETITOR_PEPSI</span>
        </div>
        <div className="ai-box ai-box--four">
          <span>SPRITE_1L 88%</span>
        </div>
      </div>
    </section>
  )
}

function ComplianceScore() {
  return (
    <section className="analysis-panel compliance-card">
      <h2>Compliance Score</h2>
      <div className="score-ring">
        <svg viewBox="0 0 160 160">
          <circle cx="80" cy="80" fill="transparent" r="70" />
          <circle cx="80" cy="80" fill="transparent" r="70" />
        </svg>
        <div>
          <strong>
            82<span>/100</span>
          </strong>
          <em>Good</em>
        </div>
      </div>
      <p>Overall shelf alignment to planogram</p>
    </section>
  )
}

function IssuesFound() {
  return (
    <section className="analysis-panel side-report">
      <h2>Issues Found</h2>
      <div className="issue-card">
        <Icon name="warning" />
        <div>
          <strong>Competitor shelf dominance</strong>
          <p>Pepsi occupies 15% share of shelf</p>
        </div>
      </div>
      <div className="issue-card issue-card--error">
        <Icon name="error" />
        <div>
          <strong>Missing mandatory SKUs</strong>
          <p>Diet Coke, Coke Vanilla absent</p>
        </div>
      </div>
    </section>
  )
}

function PosmStatus() {
  return (
    <section className="analysis-panel side-report">
      <h2>POSM Status</h2>
      <div className="posm-card">
        <span>
          <Icon name="check" />
        </span>
        <div>
          <strong>Present</strong>
          <p>Promotional material visible</p>
        </div>
      </div>
    </section>
  )
}

function ProductBreakdown() {
  return (
    <section className="analysis-panel breakdown-panel">
      <div className="analysis-panel__header">
        <h2>Detected Products</h2>
        <span>04 FOUND</span>
      </div>
      <div className="breakdown-list">
        {detectedProducts.map(([name, confidence], index) => (
          <div className="breakdown-row" key={name}>
            <div>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{name}</strong>
            </div>
            <em>{confidence}</em>
          </div>
        ))}
      </div>
    </section>
  )
}

function MissingSkuPanel() {
  return (
    <section className="analysis-panel breakdown-panel">
      <div className="analysis-panel__header">
        <h2>Missing SKUs</h2>
        <span className="analysis-critical">CRITICAL</span>
      </div>
      <div className="missing-list">
        {missingSkus.map(([name, detail]) => (
          <div className="missing-row" key={name}>
            <span>
              <Icon name="close" />
            </span>
            <div>
              <strong>{name}</strong>
              <p>{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CompetitorPanel() {
  return (
    <section className="analysis-panel breakdown-panel">
      <div className="analysis-panel__header">
        <h2>Competitor Presence</h2>
      </div>
      <div className="competitor-list">
        <div>
          <p>
            <strong>Pepsi</strong>
            <span>3 FACINGS</span>
          </p>
          <i>
            <b style={{ width: '75%' }} />
          </i>
        </div>
        <div>
          <p>
            <strong>7Up</strong>
            <span>2 FACINGS</span>
          </p>
          <i>
            <b style={{ width: '50%' }} />
          </i>
        </div>
        <blockquote>
          "Competitor shelf share has increased by 5% compared to the previous visit
          on May 14th."
        </blockquote>
      </div>
    </section>
  )
}

export function AiAnalysisPage({ storeId }: AiAnalysisPageProps) {
  const [store, setStore] = useState<Store | null>(null)
  const [error, setError] = useState('')

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

  const storeName = useMemo(() => store?.storeName ?? 'Store', [store])

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
              <p>Visit #VIS-221 · Submitted: 21 May 2026 · 11:15 AM</p>
            </section>
          </div>
          <span className="analysis-status">
            <Icon name="check_circle" />
            Analysis Completed
          </span>
        </div>
      </header>

      <main className="analysis-main">
        {error ? <div className="store-state store-state--error">{error}</div> : null}

        <div className="analysis-stats">
          <AnalysisStat filled icon="task_alt" label="Analysis Status" value="Completed" />
          <AnalysisStat icon="neurology" label="Provider" value="Claude Sonnet" />
          <AnalysisStat icon="speed" label="Processing Time" value="2.3s" />
        </div>

        <div className="analysis-grid">
          <div className="analysis-left">
            <ShelfImagePanel />
            <section className="analysis-summary">
              <h2>AI Executive Summary</h2>
              <p>
                "Store shelf is <strong>mostly compliant</strong>. Two required SKUs
                are missing. Competitor products occupy one section of visible shelf
                space."
              </p>
            </section>
          </div>

          <aside className="analysis-right">
            <ComplianceScore />
            <IssuesFound />
            <PosmStatus />
          </aside>
        </div>

        <div className="analysis-breakdown">
          <ProductBreakdown />
          <MissingSkuPanel />
          <CompetitorPanel />
        </div>
      </main>

      <footer className="analysis-footer">
        <span>RetailOS Intelligence</span>
        <span>Claude-3-Sonnet · 2310ms processing</span>
      </footer>
    </div>
  )
}
