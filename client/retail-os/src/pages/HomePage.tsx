import { useEffect, useState } from 'react'
import { BrandMark } from '../components/BrandMark'
import { getCurrentUser, type CurrentUser } from '../services/auth'

const getDisplayName = (user: CurrentUser): string =>
  user.name ?? user.fullName ?? user.email ?? 'User'

export function HomePage() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    getCurrentUser()
      .then((currentUser) => {
        if (isMounted) {
          setUser(currentUser)
        }
      })
      .catch(() => {
        if (isMounted) {
          setUser(null)
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

  return (
    <main className="home-page">
      <section className="home-shell" aria-labelledby="home-title">
        <BrandMark />
        <div className="home-heading">
          <h1 id="home-title">
            {isLoading
              ? 'RetailOS'
              : user
                ? `Hello, ${getDisplayName(user)}`
                : 'RetailOS'}
          </h1>
          <p>{user ? 'Welcome back to Ops Control.' : 'Operations workspace'}</p>
        </div>
        {!user && !isLoading ? (
          <a className="home-login-link" href="/login">
            Go to login
          </a>
        ) : null}
      </section>
    </main>
  )
}
