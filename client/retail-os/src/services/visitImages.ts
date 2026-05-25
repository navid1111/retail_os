import { API_BASE_URL } from './apiBase'

export type UploadedVisitImage = {
  _id: string
  visitId: string
  imageUrl: string
  publicId?: string
  isRejected: boolean
  uploadedAt: string
}

export const uploadVisitImageFile = async (
  visitId: string,
  file: File
): Promise<UploadedVisitImage> => {
  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch(`${API_BASE_URL}/api/visits/${visitId}/images`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload visit image')
  }

  return response.json()
}
