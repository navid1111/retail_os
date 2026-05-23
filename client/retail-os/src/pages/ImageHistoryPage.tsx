import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { Icon } from '../components/dashboard/Icon'
import { getMyImages, type RepImage } from '../services/images'

const formatImageDate = (value: string): string =>
  new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

const getFraudLabel = (fraudType: string): string => {
  if (fraudType.includes('duplicate')) {
    return 'Duplicate'
  }
  if (fraudType.includes('blur')) {
    return 'Blur'
  }
  if (fraudType.includes('gps')) {
    return 'GPS'
  }
  if (fraudType.includes('timestamp')) {
    return 'Timestamp'
  }
  return fraudType.replace(/_/g, ' ')
}

const getFraudIcon = (fraudType: string): string => {
  if (fraudType.includes('duplicate')) {
    return 'content_copy'
  }
  if (fraudType.includes('blur')) {
    return 'blur_on'
  }
  if (fraudType.includes('gps')) {
    return 'location_on'
  }
  if (fraudType.includes('timestamp')) {
    return 'schedule'
  }
  return 'warning'
}

const getComplianceScore = (image: RepImage): number =>
  image.isRejected || image.hasFraudFlag ? 45 : 91

function HistoryStat({
  label,
  value,
  danger,
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <section className={`image-history-stat ${danger ? 'image-history-stat--danger' : ''}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </section>
  )
}

function ImageHistoryCard({ image }: { image: RepImage }) {
  const flagged = image.isRejected || image.hasFraudFlag
  const score = getComplianceScore(image)

  return (
    <article className="image-history-card">
      <div className="image-history-card__media">
        {image.imageUrl ? (
          <img alt={image.store?.storeName ?? 'Visit image'} src={image.imageUrl} />
        ) : (
          <div className="image-history-card__placeholder">
            <Icon name="image" />
          </div>
        )}
        {flagged ? (
          <div className="image-history-card__badges">
            {image.fraudFlags.length > 0 ? (
              image.fraudFlags.map((flag) => (
                <span key={flag._id}>
                  <Icon name={getFraudIcon(flag.fraudType)} />
                  {getFraudLabel(flag.fraudType)}
                </span>
              ))
            ) : (
              <span>
                <Icon name="warning" />
                {image.rejectionReason ?? 'Flagged'}
              </span>
            )}
          </div>
        ) : null}
        <div className="image-history-card__overlay">
          <button type="button">Inspect Details</button>
        </div>
      </div>
      <div className="image-history-card__body">
        <div className="image-history-card__meta">
          <div>
            <h3>{formatImageDate(image.uploadedAt)}</h3>
            <p>{image.store?.storeName ?? 'Unknown Store'}</p>
          </div>
          <div>
            <strong className={flagged ? 'image-history-card__score--danger' : ''}>
              {score}%
            </strong>
            <p>Compliance</p>
          </div>
        </div>
        <div className="image-history-card__status">
          <i className={flagged ? 'image-history-card__dot--danger' : ''} />
          <span className={flagged ? 'image-history-card__status--danger' : ''}>
            {flagged ? 'Flagged' : 'Completed'}
          </span>
        </div>
      </div>
    </article>
  )
}

export function ImageHistoryPage() {
  const [images, setImages] = useState<RepImage[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'flagged' | 'completed'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')

    getMyImages()
      .then((items) => {
        if (isMounted) {
          setImages(items)
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(
            requestError instanceof Error ? requestError.message : 'Failed to fetch images'
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

  const filteredImages = useMemo(() => {
    const term = search.trim().toLowerCase()

    return images.filter((image) => {
      const flagged = image.isRejected || image.hasFraudFlag
      const matchesStatus =
        status === 'all' ||
        (status === 'flagged' && flagged) ||
        (status === 'completed' && !flagged)
      const values = [
        image.publicId,
        image.store?.storeName,
        image.store?.storeCode,
        image.rejectionReason,
        ...image.fraudFlags.map((flag) => flag.fraudType),
      ].filter(Boolean)

      const matchesSearch =
        !term || values.some((value) => value?.toLowerCase().includes(term))

      return matchesStatus && matchesSearch
    })
  }, [images, search, status])

  const flaggedCount = images.filter((image) => image.isRejected || image.hasFraudFlag).length
  const averageScore =
    images.length > 0
      ? Math.round(
          images.reduce((total, image) => total + getComplianceScore(image), 0) /
            images.length
        )
      : 0

  return (
    <DashboardLayout>
      <div className="image-history-page">
        <section className="image-history-stats">
          <HistoryStat label="Total Images" value={String(images.length)} />
          <HistoryStat label="Average Score" value={`${averageScore}%`} />
          <HistoryStat danger label="Fraud Flags" value={String(flaggedCount).padStart(2, '0')} />
          <HistoryStat label="Repeated Missing SKU" value="Diet Coke" />
        </section>

        <section className="image-history-controls">
          <div className="image-history-filter-group">
            <label>
              <Icon name="calendar_today" />
              <select>
                <option>Date: All Time</option>
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </label>
            <label>
              <Icon name="analytics" />
              <select
                onChange={(event) =>
                  setStatus(event.target.value as 'all' | 'flagged' | 'completed')
                }
                value={status}
              >
                <option value="all">Status: Any</option>
                <option value="completed">Completed</option>
                <option value="flagged">Flagged</option>
              </select>
            </label>
          </div>
          <div className="image-history-actions">
            <label className="image-history-search">
              <Icon name="search" />
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search images..."
                type="text"
                value={search}
              />
            </label>
            <div className="image-history-toggle">
              <button type="button">
                <Icon name="grid_view" />
              </button>
              <button type="button">
                <Icon name="view_timeline" />
              </button>
            </div>
            <button className="image-history-compare" type="button">
              <Icon name="compare_arrows" />
              Compare
            </button>
          </div>
        </section>

        {error ? <div className="store-state store-state--error">{error}</div> : null}
        {isLoading ? <div className="store-state">Loading images...</div> : null}

        {!isLoading && filteredImages.length > 0 ? (
          <section className="image-history-grid" aria-label="Image history">
            {filteredImages.map((image) => (
              <ImageHistoryCard image={image} key={image._id} />
            ))}
          </section>
        ) : null}

        {!isLoading && !error && filteredImages.length === 0 ? (
          <div className="store-state">No images matched your filters.</div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
