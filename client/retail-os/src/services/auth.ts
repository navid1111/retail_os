type SignInInput = {
  email: string
  password: string
}

export type SignInResult = {
  user?: unknown
  token?: string
  redirect?: boolean
  url?: string
}

export type CurrentUser = {
  id?: string
  _id?: string
  name?: string
  fullName?: string
  email?: string
  role?: 'rep' | 'supervisor' | 'admin'
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = await response.json()

    if (typeof data?.message === 'string') {
      return data.message
    }

    if (typeof data?.error === 'string') {
      return data.error
    }
  } catch {
    // Fall back to the status text below when the response is not JSON.
  }

  return response.statusText || 'Unable to sign in'
}

export const signInWithEmail = async ({
  email,
  password,
}: SignInInput): Promise<SignInResult> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  return response.json()
}

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const response = await fetch(`${API_BASE_URL}/api/me`, {
    credentials: 'include',
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const data = await response.json()
  return data.user ?? null
}
