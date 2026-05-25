export type AdminUserRole = 'rep' | 'supervisor' | 'admin'

export type AdminUser = {
  id: string
  fullName: string
  email: string
  role: AdminUserRole
  region: string
  phone?: string
  isActive: boolean
  createdAt?: string
}

export type CreateAdminUserInput = {
  fullName: string
  email: string
  password: string
  role: AdminUserRole
  region: string
  phone?: string
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    credentials: 'include',
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch users')
  }

  return data as AdminUser[]
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create user')
  }

  return data as AdminUser
}
