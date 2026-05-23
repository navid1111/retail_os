import { useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, type CurrentUser } from '../../services/auth'
import { BrandMark } from '../BrandMark'

export function RepGuard({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    getCurrentUser()
      .then((currentUser) => {
        if (!isMounted) {
          return
        }

        if (!currentUser) {
          window.location.replace('/login')
          return
        }

        setUser(currentUser)
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError instanceof Error ? requestError.message : 'Failed to verify access')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <main className="admin-access-page">
        <section>
          <BrandMark />
          <h1>Checking access</h1>
          <p>Verifying your rep session.</p>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="admin-access-page">
        <section>
          <BrandMark />
          <h1>Access check failed</h1>
          <p>{error}</p>
          <a href="/login">Sign in</a>
        </section>
      </main>
    )
  }

  if (user?.role !== 'rep') {
    return (
      <main className="admin-access-page">
        <section>
          <BrandMark />
          <h1>Rep access required</h1>
          <p>This area is only available to sales representatives.</p>
          <a href="/login">Switch account</a>
        </section>
      </main>
    )
  }

  return children
}
