import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { Icon } from '../components/dashboard/Icon'
import { getMyFraudVisits, type FraudFlag, type FraudVisit } from '../services/fraud'

const formatDate = (value?: string): string =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '-'

const formatLabel = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatDetailValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '-'
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }

  return String(value)
}

function ResolutionBadge({ resolution }: { resolution: string }) {
  return (
    <span className={`fraud-resolution fraud-resolution--${resolution}`}>
      {formatLabel(resolution)}
    </span>
  )
}

function FraudReason({ flag }: { flag: FraudFlag }) {
  const detailEntries = Object.entries(flag.detail ?? {})

  return (
    <article className="fraud-reason">
      <header>
        <div>
          <h4>{formatLabel(flag.fraudType)}</h4>
          <p>{Math.round(flag.confidence * 100)}% confidence</p>
        </div>
        <ResolutionBadge resolution={flag.resolution} />
      </header>

      {detailEntries.length > 0 ? (
        <dl>
          {detailEntries.map(([key, value]) => (
            <div key={key}>
              <dt>{formatLabel(key)}</dt>
              <dd>{formatDetailValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="fraud-reason__empty">No extra evidence was attached.</p>
      )}
    </article>
  )
}

function FraudVisitList({
  selectedId,
  visits,
  onSelect,
}: {
  selectedId?: string
  visits: FraudVisit[]
  onSelect: (visit: FraudVisit) => void
}) {
  return (
    <div className="fraud-list">
      {visits.map((visit) => (
        <button
          className={`fraud-list__item ${visit._id === selectedId ? 'fraud-list__item--active' : ''}`}
          key={visit._id}
          onClick={() => onSelect(visit)}
          type="button"
        >
          <span>
            <strong>{visit.store?.storeName ?? 'Unknown Store'}</strong>
            <small>{formatDate(visit.checkInTime)}</small>
          </span>
          <ResolutionBadge
            resolution={visit.pendingFraudFlagCount > 0 ? 'pending' : visit.fraudFlags[0]?.resolution ?? 'pending'}
          />
        </button>
      ))}
    </div>
  )
}

function FraudVisitDetail({ visit }: { visit?: FraudVisit }) {
  if (!visit) {
    return (
      <section className="fraud-detail fraud-detail--empty">
        <Icon name="gavel" />
        <h2>Select a flagged visit</h2>
        <p>Review the reason, status, image evidence, and visit context.</p>
      </section>
    )
  }

  return (
    <section className="fraud-detail">
      <header className="fraud-detail__header">
        <div>
          <p>{visit.store?.storeCode ?? 'Store'}</p>
          <h2>{visit.store?.storeName ?? 'Unknown Store'}</h2>
          <span>{visit.store?.address ?? visit.store?.region ?? 'No location recorded'}</span>
        </div>
        <ResolutionBadge
          resolution={visit.pendingFraudFlagCount > 0 ? 'pending' : visit.fraudFlags[0]?.resolution ?? 'pending'}
        />
      </header>

      <div className="fraud-detail__meta">
        <span>
          <Icon name="schedule" />
          {formatDate(visit.checkInTime)}
        </span>
        <span>
          <Icon name="pin_drop" />
          {visit.gpsLat && visit.gpsLng ? `${visit.gpsLat.toFixed(4)}, ${visit.gpsLng.toFixed(4)}` : 'No GPS'}
        </span>
        <span>
          <Icon name="fact_check" />
          {visit.status}
        </span>
      </div>

      <div className="fraud-reasons">
        {visit.fraudFlags.map((flag) => (
          <FraudReason flag={flag} key={flag._id} />
        ))}
      </div>

      <div className="fraud-images">
        {visit.images.map((image) => (
          <article className="fraud-image" key={image._id}>
            {image.imageUrl ? (
              <img alt={visit.store?.storeName ?? 'Visit evidence'} src={image.imageUrl} />
            ) : (
              <div className="fraud-image__placeholder">
                <Icon name="image" />
              </div>
            )}
            <div>
              <strong>{image.rejectionReason ? formatLabel(image.rejectionReason) : 'Visit image'}</strong>
              <span>{formatDate(image.uploadedAt)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export function FraudPanelPage() {
  const [visits, setVisits] = useState<FraudVisit[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [status, setStatus] = useState<'all' | 'pending' | 'confirmed' | 'dismissed'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    getMyFraudVisits()
      .then((items) => {
        if (isMounted) {
          setVisits(items)
          setSelectedId(items[0]?._id ?? '')
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to fetch fraud visits')
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

  const filteredVisits = useMemo(
    () =>
      visits.filter((visit) => {
        if (status === 'all') {
          return true
        }

        return visit.fraudFlags.some((flag) => flag.resolution === status)
      }),
    [status, visits]
  )

  const selectedVisit =
    filteredVisits.find((visit) => visit._id === selectedId) ?? filteredVisits[0]

  return (
    <DashboardLayout>
      <section className="fraud-page">
        <header className="fraud-page__header">
          <div>
            <h1>Fraud Panel</h1>
            <p>Flagged visits, review reasons, and resolution status.</p>
          </div>
          <label>
            <Icon name="tune" />
            <select onChange={(event) => setStatus(event.target.value as typeof status)} value={status}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </label>
        </header>

        {error ? <div className="store-state store-state--error">{error}</div> : null}
        {isLoading ? <div className="store-state">Loading fraud visits...</div> : null}

        {!isLoading && !error ? (
          <div className="fraud-workspace">
            <FraudVisitList
              onSelect={(visit) => setSelectedId(visit._id)}
              selectedId={selectedVisit?._id}
              visits={filteredVisits}
            />
            <FraudVisitDetail visit={selectedVisit} />
          </div>
        ) : null}
      </section>
    </DashboardLayout>
  )
}
