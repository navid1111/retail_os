export type AdminVisitImage = {
  _id: string
  imageUrl?: string
  uploadedAt?: string
  isRejected?: boolean
  rejectionReason?: string
}

export type AdminVisitAiAnalysis = {
  _id: string
  imageId?: string
  provider?: string
  modelName?: string
  complianceScore?: number
  productsDetected?: Array<{ name: string; brand: string; confidence: number }>
  competitorsDetected?: Array<{ brand: string; count: number }>
  posmPresent?: boolean
  missingSkus?: string[]
  issues?: string[]
  supervisorSummary?: string
  annotatedImageUrl?: string
  processingMs?: number
  createdAt?: string
}

export type AdminVisit = {
  _id: string
  repId: string
  storeId: string
  checkInTime?: string
  checkOutTime?: string
  status: string
  overallScore?: number
  store?: {
    _id?: string
    storeCode?: string
    storeName?: string
    address?: string
    region?: string
  }
  rep?: {
    _id?: string
    fullName?: string
    email?: string
    region?: string
  }
  images: AdminVisitImage[]
  aiAnalysis?: AdminVisitAiAnalysis | null
}

export type AdminVisitFilters = {
  page?: number
  limit?: number
  status?: string
  ai?: 'all' | 'with' | 'missing'
  search?: string
}

export type AdminVisitListResult = {
  items: AdminVisit[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function getAdminVisits(filters: AdminVisitFilters = {}): Promise<AdminVisitListResult> {
  const params = new URLSearchParams()
  params.set('page', String(filters.page ?? 1))
  params.set('limit', String(filters.limit ?? 25))
  if (filters.status && filters.status !== 'all') {
    params.set('status', filters.status)
  }
  if (filters.ai && filters.ai !== 'all') {
    params.set('ai', filters.ai)
  }
  if (filters.search?.trim()) {
    params.set('search', filters.search.trim())
  }

  const response = await fetch(`/api/admin/visits?${params.toString()}`, {
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch visits')
  }

  return data as AdminVisitListResult
}
