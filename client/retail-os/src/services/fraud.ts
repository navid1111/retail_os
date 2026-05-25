import { API_BASE_URL } from './apiBase'

export type FraudResolution = 'pending' | 'confirmed' | 'dismissed'

export type FraudFlag = {
  _id: string
  visitId: string
  imageId?: string
  fraudType: string
  confidence: number
  detail?: Record<string, unknown>
  duplicateOfImageId?: string
  reviewedBy?: string
  resolution: FraudResolution
  createdAt: string
}

export type FraudVisitImage = {
  _id: string
  imageUrl?: string
  publicId?: string
  blurScore?: number
  isRejected?: boolean
  rejectionReason?: string
  uploadedAt?: string
}

export type FraudVisit = {
  _id: string
  repId: string
  storeId: string
  status: string
  checkInTime: string
  checkOutTime?: string
  gpsLat?: number
  gpsLng?: number
  gpsAccuracyM?: number
  overallScore?: number
  repNotes?: string
  fraudFlags: FraudFlag[]
  fraudFlagCount: number
  pendingFraudFlagCount: number
  images: FraudVisitImage[]
  store?: {
    _id?: string
    storeCode?: string
    storeName?: string
    address?: string
    region?: string
  }
}

export type ResolveFraudVisitInput = {
  resolution: Exclude<FraudResolution, 'pending'>
  notes?: string
}

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = await response.json()

    if (typeof data?.error === 'string') {
      return data.error
    }

    if (typeof data?.message === 'string') {
      return data.message
    }
  } catch {
    // Fall through to status text.
  }

  return response.statusText || 'Request failed'
}

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.json()
}

export const getMyFraudVisits = async (): Promise<FraudVisit[]> =>
  requestJson('/api/fraud/visits')

export const getAdminFraudVisits = async (): Promise<FraudVisit[]> =>
  requestJson('/api/admin/fraud/visits')

export const resolveAdminFraudVisit = async (
  visitId: string,
  input: ResolveFraudVisitInput
): Promise<FraudVisit> =>
  requestJson(`/api/admin/fraud/visits/${visitId}/resolution`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
