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

export const getMyVisits = async (): Promise<VisitRecord[]> => {
  const response = await fetch(`${API_BASE_URL}/api/visits/mine`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch visits')
  }

  return response.json()
}
