import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { Icon } from '../components/dashboard/Icon'
import {
  getAdminFraudVisits,
  resolveAdminFraudVisit,
  type FraudVisit,
  type FraudResolution,
} from '../services/fraud'

const formatDate = (value?: string): string =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '-'

const labelize = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

function AdminFraudStatus({ resolution }: { resolution: FraudResolution }) {
  return <span className={`fraud-resolution fraud-resolution--${resolution}`}>{labelize(resolution)}</span>
}

export function AdminFraudPage() {
  const [visits, setVisits] = useState<FraudVisit[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [filter, setFilter] = useState<'all' | FraudResolution>('pending')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isResolving, setIsResolving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    getAdminFraudVisits()
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
        if (filter === 'all') {
          return true
        }

        return visit.fraudFlags.some((flag) => flag.resolution === filter)
      }),
    [filter, visits]
  )

  const selectedVisit =
    filteredVisits.find((visit) => visit._id === selectedId) ?? filteredVisits[0]

  const resolveVisit = async (resolution: Exclude<FraudResolution, 'pending'>) => {
    if (!selectedVisit || isResolving) {
      return
    }

    setIsResolving(true)
    setError('')

    try {
      const updatedVisit = await resolveAdminFraudVisit(selectedVisit._id, {
        resolution,
        notes: notes.trim() || undefined,
      })
      setVisits((current) =>
        current.map((visit) => (visit._id === updatedVisit._id ? updatedVisit : visit))
      )
      setSelectedId(updatedVisit._id)
      setNotes('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update fraud status')
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <AdminLayout title="Fraud Review">
      <section className="admin-fraud-page">
        <header className="admin-fraud-toolbar">
          <label>
            <Icon name="filter_list" />
            <select onChange={(event) => setFilter(event.target.value as typeof filter)} value={filter}>
              <option value="all">All reviews</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed fraud</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </label>
          <span>{filteredVisits.length} visits</span>
        </header>

        {error ? <div className="admin-users-state admin-users-state--error">{error}</div> : null}
        {isLoading ? <div className="admin-users-state">Loading fraud reviews</div> : null}

        {!isLoading ? (
          <div className="admin-fraud-workspace">
            <div className="admin-fraud-list">
              {filteredVisits.map((visit) => {
                const resolution =
                  visit.pendingFraudFlagCount > 0 ? 'pending' : visit.fraudFlags[0]?.resolution ?? 'pending'

                return (
                  <button
                    className={`admin-fraud-list__item ${visit._id === selectedVisit?._id ? 'admin-fraud-list__item--active' : ''}`}
                    key={visit._id}
                    onClick={() => setSelectedId(visit._id)}
                    type="button"
                  >
                    <span>
                      <strong>{visit.store?.storeName ?? 'Unknown Store'}</strong>
                      <small>{formatDate(visit.checkInTime)}</small>
                    </span>
                    <AdminFraudStatus resolution={resolution as FraudResolution} />
                  </button>
                )
              })}
            </div>

            <section className="admin-fraud-detail">
              {selectedVisit ? (
                <>
                  <header>
                    <div>
                      <p>{selectedVisit.store?.storeCode ?? 'Store'}</p>
                      <h2>{selectedVisit.store?.storeName ?? 'Unknown Store'}</h2>
                      <span>{selectedVisit.store?.address ?? selectedVisit.store?.region ?? 'No location'}</span>
                    </div>
                    <strong>{selectedVisit.fraudFlagCount} flags</strong>
                  </header>

                  <div className="admin-fraud-reasons">
                    {selectedVisit.fraudFlags.map((flag) => (
                      <article key={flag._id}>
                        <header>
                          <h3>{labelize(flag.fraudType)}</h3>
                          <AdminFraudStatus resolution={flag.resolution} />
                        </header>
                        <p>{Math.round(flag.confidence * 100)}% confidence</p>
                        <pre>{JSON.stringify(flag.detail ?? {}, null, 2)}</pre>
                      </article>
                    ))}
                  </div>

                  <div className="admin-fraud-images">
                    {selectedVisit.images.length > 0 ? (
                      selectedVisit.images.map((image) => (
                        <article key={image._id}>
                          {image.imageUrl ? (
                            <img
                              alt={selectedVisit.store?.storeName ?? 'Fraud evidence'}
                              src={image.imageUrl}
                            />
                          ) : (
                            <div className="admin-fraud-image__placeholder">
                              <Icon name="image" />
                            </div>
                          )}
                          <div>
                            <strong>
                              {image.rejectionReason ? labelize(image.rejectionReason) : 'Visit image'}
                            </strong>
                            <span>{formatDate(image.uploadedAt)}</span>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="admin-users-state">No images are attached to this visit.</div>
                    )}
                  </div>

                  <label className="admin-fraud-notes">
                    <span>Review notes</span>
                    <textarea
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Add resolution context..."
                      value={notes}
                    />
                  </label>

                  <div className="admin-fraud-actions">
                    <button
                      disabled={isResolving}
                      onClick={() => void resolveVisit('dismissed')}
                      type="button"
                    >
                      <Icon name="check_circle" />
                      Resolve
                    </button>
                    <button
                      disabled={isResolving}
                      onClick={() => void resolveVisit('confirmed')}
                      type="button"
                    >
                      <Icon name="block" />
                      Reject Visit
                    </button>
                  </div>
                </>
              ) : (
                <div className="admin-users-state">No fraud visits matched this filter.</div>
              )}
            </section>
          </div>
        ) : null}
      </section>
    </AdminLayout>
  )
}
