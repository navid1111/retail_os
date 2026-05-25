import { API_BASE_URL } from './apiBase'

export type StoreSku = {
  _id: string
  skuName: string
  brand: string
  isRequired: boolean
  isPosm: boolean
  minFacing: number
}

export type Store = {
  _id: string
  storeCode: string
  storeName: string
  address?: string
  region?: string
  latitude?: number
  longitude?: number
  gpsRadiusM: number
  isActive: boolean
  skus: StoreSku[]
  createdAt: string
}

export type StoreFilters = {
  search?: string
  region?: string
  isActive?: boolean
}

export const getStores = async ({
  search,
  region,
  isActive = true,
}: StoreFilters = {}): Promise<Store[]> => {
  const params = new URLSearchParams()

  if (search?.trim()) {
    params.set('search', search.trim())
  }

  if (region && region !== 'all') {
    params.set('region', region)
  }

  params.set('isActive', String(isActive))

  const query = params.toString()
  const response = await fetch(`${API_BASE_URL}/api/stores${query ? `?${query}` : ''}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch stores')
  }

  return response.json()
}

export const getStoreById = async (storeId: string): Promise<Store> => {
  const response = await fetch(`${API_BASE_URL}/api/stores/${storeId}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch store')
  }

  return response.json()
}
