export type RepImageFraudFlag = {
  _id: string
  fraudType: string
  confidence?: number
  detail?: Record<string, unknown>
  resolution?: string
}

export type RepImage = {
  _id: string
  visitId: string
  imageUrl: string
  publicId?: string
  isRejected: boolean
  rejectionReason?: 'blurry' | 'duplicate' | 'exif_old'
  uploadedAt: string
  blurScore?: number
  fileSizeKb?: number
  heightPx?: number
  widthPx?: number
  imageHash?: string
  hasFraudFlag: boolean
  fraudFlags: RepImageFraudFlag[]
  visit?: {
    _id: string
    repId: string
    storeId: string
    status: string
    checkInTime?: string
  }
  store?: {
    _id: string
    storeCode?: string
    storeName?: string
    address?: string
    region?: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const getMyImages = async (): Promise<RepImage[]> => {
  const response = await fetch(`${API_BASE_URL}/api/images/mine`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch images')
  }

  return response.json()
}
