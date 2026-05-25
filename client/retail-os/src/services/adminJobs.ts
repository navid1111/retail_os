export type AdminJobSummary = {
  id?: string
  name: string
  queue: string
  state: string
  attemptsMade: number
  progress: unknown
  timestamp?: number
  processedOn?: number
  finishedOn?: number
  failedReason?: string
  data: unknown
  returnvalue?: unknown
}

export type AdminQueueSummary = {
  key: string
  name: string
  counts: Record<string, number>
  jobs: AdminJobSummary[]
}

export type AdminJobDashboard = {
  queues: AdminQueueSummary[]
  generatedAt: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export async function getAdminJobs(): Promise<AdminJobDashboard> {
  const response = await fetch(`${API_BASE_URL}/api/admin/jobs`, {
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch jobs')
  }

  return data as AdminJobDashboard
}
