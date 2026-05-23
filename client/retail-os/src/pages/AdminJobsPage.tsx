import { useEffect, useMemo, useState } from 'react'
import { AdminLayout } from '../components/admin/AdminLayout'
import { Icon } from '../components/dashboard/Icon'
import { getAdminJobs, type AdminJobDashboard, type AdminJobSummary } from '../services/adminJobs'

const queueLabels: Record<string, string> = {
  'send-email': 'Email',
  'process-image': 'Image Processing',
  'generate-report': 'Reports',
  'cleanup-tasks': 'Cleanup',
  'write-audit-log': 'Audit Logs',
}

const formatDateTime = (value?: number | string): string =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(value))
    : '-'

const formatJson = (value: unknown): string => {
  if (value === undefined || value === null) return '-'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function stateClass(state: string): string {
  if (state === 'active') return 'admin-job-state admin-job-state--active'
  if (state === 'failed') return 'admin-job-state admin-job-state--failed'
  if (state === 'completed') return 'admin-job-state admin-job-state--completed'
  if (state === 'delayed') return 'admin-job-state admin-job-state--delayed'
  return 'admin-job-state'
}

function JobDetail({ job }: { job?: AdminJobSummary }) {
  if (!job) {
    return <aside className="admin-job-detail">Select a job to inspect its payload and status.</aside>
  }

  return (
    <aside className="admin-job-detail">
      <header>
        <div>
          <p>{job.queue}</p>
          <h2>{job.name}</h2>
          <span>Job ID: {job.id ?? '-'}</span>
        </div>
        <span className={stateClass(job.state)}>{job.state}</span>
      </header>

      <section className="admin-job-meta">
        <div>
          <span>Attempts</span>
          <strong>{job.attemptsMade}</strong>
        </div>
        <div>
          <span>Created</span>
          <strong>{formatDateTime(job.timestamp)}</strong>
        </div>
        <div>
          <span>Started</span>
          <strong>{formatDateTime(job.processedOn)}</strong>
        </div>
        <div>
          <span>Finished</span>
          <strong>{formatDateTime(job.finishedOn)}</strong>
        </div>
      </section>

      {job.failedReason ? (
        <section className="admin-job-error">
          <h3>Failure</h3>
          <p>{job.failedReason}</p>
        </section>
      ) : null}

      <section className="admin-job-payload">
        <h3>Payload</h3>
        <pre>{formatJson(job.data)}</pre>
      </section>

      <section className="admin-job-payload">
        <h3>Result</h3>
        <pre>{formatJson(job.returnvalue)}</pre>
      </section>
    </aside>
  )
}

export function AdminJobsPage() {
  const [dashboard, setDashboard] = useState<AdminJobDashboard | null>(null)
  const [selectedQueue, setSelectedQueue] = useState('all')
  const [selectedState, setSelectedState] = useState('all')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadJobs = () => {
    setIsLoading(true)
    setError('')
    getAdminJobs()
      .then((result) => {
        setDashboard(result)
        setSelectedJobId((current) => {
          const allJobs = result.queues.flatMap((queue) => queue.jobs)
          return allJobs.some((job) => job.id === current) ? current : allJobs[0]?.id ?? ''
        })
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : 'Failed to fetch jobs')
      })
      .finally(() => setIsLoading(false))
  }

  useEffect(() => {
    loadJobs()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = window.setInterval(loadJobs, 5000)
    return () => window.clearInterval(id)
  }, [autoRefresh])

  const queues = dashboard?.queues ?? []
  const jobs = useMemo(
    () =>
      queues
        .flatMap((queue) => queue.jobs)
        .filter((job) => selectedQueue === 'all' || job.queue === selectedQueue)
        .filter((job) => selectedState === 'all' || job.state === selectedState),
    [queues, selectedQueue, selectedState]
  )
  const selectedJob = jobs.find((job) => job.id === selectedJobId) ?? jobs[0]

  const totals = queues.reduce(
    (acc, queue) => {
      acc.active += queue.counts.active ?? 0
      acc.waiting += queue.counts.waiting ?? 0
      acc.failed += queue.counts.failed ?? 0
      acc.completed += queue.counts.completed ?? 0
      return acc
    },
    { active: 0, waiting: 0, failed: 0, completed: 0 }
  )

  return (
    <AdminLayout title="Background Jobs">
      <section className="admin-jobs-page">
        <section className="admin-jobs-summary">
          <div>
            <span>Active</span>
            <strong>{totals.active}</strong>
          </div>
          <div>
            <span>Waiting</span>
            <strong>{totals.waiting}</strong>
          </div>
          <div>
            <span>Failed</span>
            <strong>{totals.failed}</strong>
          </div>
          <div>
            <span>Completed</span>
            <strong>{totals.completed}</strong>
          </div>
        </section>

        <section className="admin-users-panel">
          <div className="admin-users-toolbar">
            <select className="admin-visits-filter" onChange={(event) => setSelectedQueue(event.target.value)} value={selectedQueue}>
              <option value="all">All queues</option>
              {queues.map((queue) => (
                <option key={queue.name} value={queue.name}>
                  {queueLabels[queue.name] ?? queue.name}
                </option>
              ))}
            </select>
            <select className="admin-visits-filter" onChange={(event) => setSelectedState(event.target.value)} value={selectedState}>
              <option value="all">All states</option>
              <option value="active">Active</option>
              <option value="waiting">Waiting</option>
              <option value="delayed">Delayed</option>
              <option value="failed">Failed</option>
              <option value="completed">Completed</option>
            </select>
            <button onClick={loadJobs} type="button">
              <Icon name="refresh" />
              Refresh
            </button>
            <label className="admin-jobs-toggle">
              <input checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} type="checkbox" />
              Auto refresh
            </label>
            <span className="admin-visits-count">
              Updated {dashboard ? formatDateTime(dashboard.generatedAt) : '-'}
            </span>
          </div>

          {isLoading ? <div className="admin-users-state">Loading jobs</div> : null}
          {!isLoading && error ? <div className="admin-users-state admin-users-state--error">{error}</div> : null}

          <div className="admin-jobs-workspace">
            <div className="admin-jobs-main">
              <section className="admin-queue-grid">
                {queues.map((queue) => (
                  <article className="admin-queue-card" key={queue.name}>
                    <header>
                      <h3>{queueLabels[queue.name] ?? queue.name}</h3>
                      <span>{queue.name}</span>
                    </header>
                    <div>
                      <span>Active <b>{queue.counts.active ?? 0}</b></span>
                      <span>Waiting <b>{queue.counts.waiting ?? 0}</b></span>
                      <span>Failed <b>{queue.counts.failed ?? 0}</b></span>
                      <span>Done <b>{queue.counts.completed ?? 0}</b></span>
                    </div>
                  </article>
                ))}
              </section>

              <div className="admin-users-table admin-jobs-table">
                <table>
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Queue</th>
                      <th>State</th>
                      <th>Attempts</th>
                      <th>Started</th>
                      <th>Finished</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr
                        className={job.id === selectedJob?.id ? 'admin-visits-row--active' : ''}
                        key={`${job.queue}-${job.id}`}
                        onClick={() => setSelectedJobId(job.id ?? '')}
                      >
                        <td>
                          <strong>{job.name}</strong>
                          <small>{job.id}</small>
                        </td>
                        <td>{queueLabels[job.queue] ?? job.queue}</td>
                        <td><span className={stateClass(job.state)}>{job.state}</span></td>
                        <td>{job.attemptsMade}</td>
                        <td>{formatDateTime(job.processedOn)}</td>
                        <td>{formatDateTime(job.finishedOn)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!isLoading && jobs.length === 0 ? <div className="admin-users-state">No jobs matched your filters.</div> : null}
              </div>
            </div>

            <JobDetail job={selectedJob} />
          </div>
        </section>
      </section>
    </AdminLayout>
  )
}
