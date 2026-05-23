import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { Icon } from '../components/dashboard/Icon'
import { getMyVisits, type VisitRecord } from '../services/visits'

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

const getVisitStoreName = (visit: VisitRecord): string =>
  visit.store?.storeName ?? 'Unknown Store'

const getVisitDetail = (visit: VisitRecord): string => {
  if (visit.status === 'flagged') {
    return visit.repNotes ?? 'Visit requires review'
  }

  if (visit.status === 'processing') {
    return 'Syncing encrypted data package...'
  }

  if (visit.status === 'completed') {
    return `Compliance: ${visit.overallScore ?? 82}%`
  }

  return 'Visit in progress'
}

function VisitFilterChip({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      className={`visit-filter-chip ${active ? 'visit-filter-chip--active' : ''}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}

function VisitHistoryCard({ visit }: { visit: VisitRecord }) {
  const storeId = visit.store?._id ?? visit.storeId
  const isFlagged = visit.status === 'flagged'
  const isProcessing = visit.status === 'processing'

  return (
    <a
      className={`visit-history-card ${
        isFlagged ? 'visit-history-card--flagged' : ''
      } ${isProcessing ? 'visit-history-card--processing' : ''}`}
      href={`/stores/${storeId}/analysis?visitId=${visit._id}`}
    >
      <div className="visit-history-card__main">
        <div className="visit-history-card__icon">
          <Icon name="store" />
        </div>
        <div>
          <h3>{getVisitStoreName(visit)}</h3>
          <div className="visit-history-card__meta">
            <span>
              <Icon name="calendar_today" />
              {formatDate(visit.checkInTime ?? visit.createdAt)}
            </span>
            <span className={isFlagged ? 'visit-history-card__danger' : ''}>
              <Icon name={isFlagged ? 'warning' : 'checklist'} />
              {getVisitDetail(visit)}
            </span>
          </div>
        </div>
      </div>
      <div className="visit-history-card__side">
        <span className={`visit-status-pill visit-status-pill--${visit.status}`}>
          <i />
          {visit.status}
        </span>
        <Icon name="arrow_forward" />
      </div>
    </a>
  )
}

export function VisitFeedPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [status, setStatus] = useState<'all' | VisitRecord['status']>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')

    getMyVisits()
      .then((items) => {
        if (isMounted) {
          setVisits(items)
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(
            requestError instanceof Error ? requestError.message : 'Failed to fetch visits'
          )
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredVisits = useMemo(() => {
    const term = search.trim().toLowerCase()

    return visits.filter((visit) => {
      const matchesStatus = status === 'all' || visit.status === status
      const values = [
        visit._id,
        visit.status,
        visit.store?.storeName,
        visit.store?.storeCode,
        visit.store?.region,
        visit.repNotes,
      ].filter(Boolean)

      const matchesSearch =
        !term || values.some((value) => value?.toLowerCase().includes(term))

      return matchesStatus && matchesSearch
    })
  }, [visits, status, search])

  return (
    <DashboardLayout>
      <div className="visit-feed">
        <header className="visit-feed__top">
          <div className="visit-feed__title">
            <a href="/stores">
              <Icon name="arrow_back" />
            </a>
            <h1>Visit History</h1>
          </div>
          <label className="visit-feed-search">
            <Icon name="search" />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search visits, stores, or audits..."
              type="text"
              value={search}
            />
          </label>
        </header>

        <div className="visit-feed__filters">
          <VisitFilterChip active={status === 'all'} onClick={() => setStatus('all')}>
            This Week
          </VisitFilterChip>
          <VisitFilterChip
            active={status === 'completed'}
            onClick={() => setStatus('completed')}
          >
            Completed
          </VisitFilterChip>
          <VisitFilterChip
            active={status === 'flagged'}
            onClick={() => setStatus('flagged')}
          >
            Flagged
          </VisitFilterChip>
          <VisitFilterChip
            active={status === 'processing'}
            onClick={() => setStatus('processing')}
          >
            Processing
          </VisitFilterChip>
        </div>

        {error ? <div className="store-state store-state--error">{error}</div> : null}
        {isLoading ? <div className="store-state">Loading visits...</div> : null}

        {!isLoading && filteredVisits.length > 0 ? (
          <section className="visit-history-list" aria-label="Visit history">
            {filteredVisits.map((visit) => (
              <VisitHistoryCard key={visit._id} visit={visit} />
            ))}
          </section>
        ) : null}

        {!isLoading && !error && filteredVisits.length === 0 ? (
          <div className="store-state">No visits matched your filters.</div>
        ) : null}

        <div className="visit-feed__footer-action">
          <button type="button">Load Previous Records</button>
        </div>
      </div>
    </DashboardLayout>
  )
}
