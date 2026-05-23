export type VisitStore = {
  _id?: string
  storeCode?: string
  storeName?: string
  address?: string
  region?: string
}

export type VisitRecord = {
  _id: string
  repId: string
  storeId: string
  checkInTime: string
  checkOutTime?: string
  status: 'pending' | 'processing' | 'completed' | 'flagged'
  overallScore?: number
  repNotes?: string
  images?: string[]
  fraudFlags?: string[]
  createdAt: string
  store?: VisitStore
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export type CheckInVisitInput = {
  storeId: string
  gpsLat?: number
  gpsLng?: number
  gpsAccuracyM?: number
  repNotes?: string
}

export const getMyVisits = async (): Promise<VisitRecord[]> => {
  const response = await fetch(`${API_BASE_URL}/api/visits/mine`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch visits')
  }

  return response.json()
}

export const checkInVisit = async (input: CheckInVisitInput): Promise<VisitRecord> => {
  const response = await fetch(`${API_BASE_URL}/api/visits/check-in`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('Failed to check in visit')
  }

  return response.json()
}

export const submitVisit = async (visitId: string): Promise<VisitRecord> => {
  const response = await fetch(`${API_BASE_URL}/api/visits/${visitId}/submit`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to submit visit')
  }

  return response.json()
}
