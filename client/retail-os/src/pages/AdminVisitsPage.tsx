import { useEffect, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { Icon } from '../components/dashboard/Icon'
import { getAdminVisits, type AdminVisit } from '../services/adminVisits'

const formatDate = (value?: string): string =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '-'

const formatScore = (value?: number): string =>
  typeof value === 'number' ? `${Math.round(value * 10) / 10}/100` : '-'

function scoreClass(score?: number): string {
  if (score === undefined) return 'admin-visit-score'
  if (score >= 80) return 'admin-visit-score admin-visit-score--good'
  if (score >= 60) return 'admin-visit-score admin-visit-score--warn'
  return 'admin-visit-score admin-visit-score--bad'
}

export function AdminVisitsPage() {
  const [visits, setVisits] = useState<AdminVisit[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [aiFilter, setAiFilter] = useState<'all' | 'with' | 'missing'>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    getAdminVisits({
      page,
      limit,
      status: statusFilter,
      ai: aiFilter,
      search,
    })
      .then((result) => {
        if (isMounted) {
          setVisits(result.items)
          setTotal(result.total)
          setTotalPages(result.totalPages)
          setSelectedId((current) =>
            result.items.some((visit) => visit._id === current)
              ? current
              : result.items[0]?._id ?? ''
          )
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to fetch visits')
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
  }, [aiFilter, limit, page, search, statusFilter])

  const selectedVisit =
    visits.find((visit) => visit._id === selectedId) ?? visits[0]
  const analysis = selectedVisit?.aiAnalysis
  const totalCompetitorFacings =
    analysis?.competitorsDetected?.reduce((sum, competitor) => sum + competitor.count, 0) ?? 0

  return (
    <AdminLayout title="Visit Intelligence">
      <section className="admin-visits-page">
        <section className="admin-users-panel">
          <div className="admin-users-toolbar">
            <label>
              <Icon name="search" />
              <input
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search visits, stores, reps..."
                type="text"
                value={search}
              />
            </label>
            <select
              className="admin-visits-filter"
              onChange={(event) => {
                setStatusFilter(event.target.value)
                setPage(1)
              }}
              value={statusFilter}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="flagged">Flagged</option>
            </select>
            <select
              className="admin-visits-filter"
              onChange={(event) => {
                setAiFilter(event.target.value as typeof aiFilter)
                setPage(1)
              }}
              value={aiFilter}
            >
              <option value="all">All AI</option>
              <option value="with">With AI</option>
              <option value="missing">Missing AI</option>
            </select>
            <select
              className="admin-visits-filter"
              onChange={(event) => {
                setLimit(Number(event.target.value))
                setPage(1)
              }}
              value={limit}
            >
              <option value={10}>10/page</option>
              <option value={25}>25/page</option>
              <option value={50}>50/page</option>
            </select>
            <span className="admin-visits-count">{total} visits</span>
          </div>

          {isLoading ? <div className="admin-users-state">Loading visits</div> : null}
          {!isLoading && error ? <div className="admin-users-state admin-users-state--error">{error}</div> : null}

          <div className="admin-visits-workspace">
            <div className="admin-users-table admin-visits-table">
              <table>
                <thead>
                  <tr>
                    <th>Visit</th>
                    <th>Store</th>
                    <th>Rep</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>AI</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr
                      className={visit._id === selectedVisit?._id ? 'admin-visits-row--active' : ''}
                      key={visit._id}
                      onClick={() => setSelectedId(visit._id)}
                    >
                      <td>
                        <strong>{formatDate(visit.checkInTime)}</strong>
                        <small>{visit._id}</small>
                      </td>
                      <td>{visit.store?.storeName ?? 'Unknown Store'}</td>
                      <td>{visit.rep?.fullName ?? visit.rep?.email ?? '-'}</td>
                      <td>
                        <span className="admin-role">{visit.status}</span>
                      </td>
                      <td>{formatScore(visit.overallScore)}</td>
                      <td>
                        <span className={visit.aiAnalysis ? 'admin-user-status' : 'admin-user-status admin-user-status--muted'}>
                          <i />
                          {visit.aiAnalysis ? 'Saved' : 'Missing'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="admin-visit-detail">
              {selectedVisit ? (
                <>
                  <header>
                    <div>
                      <p>{selectedVisit.store?.storeCode ?? 'Visit'}</p>
                      <h2>{selectedVisit.store?.storeName ?? 'Unknown Store'}</h2>
                      <span>{selectedVisit.rep?.fullName ?? selectedVisit.rep?.email ?? 'Unknown rep'}</span>
                    </div>
                    <strong className={scoreClass(analysis?.complianceScore ?? selectedVisit.overallScore)}>
                      {formatScore(analysis?.complianceScore ?? selectedVisit.overallScore)}
                    </strong>
                  </header>

                  {analysis ? (
                    <>
                      {analysis.annotatedImageUrl ? (
                        <img
                          alt="AI annotated shelf"
                          className="admin-visit-detail__image"
                          src={analysis.annotatedImageUrl}
                        />
                      ) : selectedVisit.images[0]?.imageUrl ? (
                        <img
                          alt="Visit shelf"
                          className="admin-visit-detail__image"
                          src={selectedVisit.images[0].imageUrl}
                        />
                      ) : null}

                      <section className="admin-visit-metrics">
                        <div>
                          <span>Products</span>
                          <strong>{analysis.productsDetected?.length ?? 0}</strong>
                        </div>
                        <div>
                          <span>Competitor Facings</span>
                          <strong>{totalCompetitorFacings}</strong>
                        </div>
                        <div>
                          <span>Missing SKUs</span>
                          <strong>{analysis.missingSkus?.length ?? 0}</strong>
                        </div>
                      </section>

                      <section className="admin-visit-ai-section">
                        <h3>AI Summary</h3>
                        <p>{analysis.supervisorSummary ?? 'No summary saved.'}</p>
                      </section>

                      <section className="admin-visit-ai-section">
                        <h3>Detected Products</h3>
                        {(analysis.productsDetected ?? []).length > 0 ? (
                          <ul>
                            {analysis.productsDetected?.map((product, index) => (
                              <li key={`${product.name}-${index}`}>
                                <span>{product.name}</span>
                                <strong>{Math.round(product.confidence * 100)}%</strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>No products detected.</p>
                        )}
                      </section>

                      <section className="admin-visit-ai-section">
                        <h3>Competitors And Issues</h3>
                        <p>
                          {(analysis.competitorsDetected ?? [])
                            .map((competitor) => `${competitor.brand}: ${competitor.count}`)
                            .join(', ') || 'No competitors detected.'}
                        </p>
                        <p>{(analysis.issues ?? []).join(', ') || 'No issues saved.'}</p>
                      </section>
                    </>
                  ) : (
                    <div className="admin-users-state">No AI analysis has been saved for this visit.</div>
                  )}
                </>
              ) : (
                <div className="admin-users-state">No visits matched your search.</div>
              )}
            </aside>
          </div>

          <footer className="admin-visits-pagination">
            <span>
              Page {page} of {totalPages}
            </span>
            <div>
              <button
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                <Icon name="chevron_left" />
                Previous
              </button>
              <button
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                type="button"
              >
                Next
                <Icon name="chevron_right" />
              </button>
            </div>
          </footer>
        </section>
      </section>
    </AdminLayout>
  )
}
