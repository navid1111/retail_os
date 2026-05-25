import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, IconButton } from './Button'
import { TextField } from './TextField'
import { getCurrentUser, signInWithEmail } from '../services/auth'

const demoCredentials = [
  {
    role: 'Admin',
    email: 'admin@retailos.local',
    password: 'Admin#m88uqqFDZG24',
  },
  {
    role: 'Rep',
    email: 'demo_user@gmail.com',
    password: 'pass@123',
  },
]

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFeedback('')
    setIsSubmitting(true)

    try {
      const result = await signInWithEmail({ email, password })
      const user = result.user?.role ? result.user : await getCurrentUser()
      window.location.assign(user?.role === 'admin' ? '/admin' : '/')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid credentials. Please try again.'
      setFeedback(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const useDemoCredential = (credential: (typeof demoCredentials)[number]) => {
    setEmail(credential.email)
    setPassword(credential.password)
    setFeedback('')
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <section className="demo-credentials" aria-label="Demo credentials">
        {demoCredentials.map((credential) => (
          <article className="demo-credential" key={credential.role}>
            <div>
              <strong>{credential.role}</strong>
              <span>{credential.email}</span>
              <span>{credential.password}</span>
            </div>
            <button
              disabled={isSubmitting}
              onClick={() => useDemoCredential(credential)}
              type="button"
            >
              Use
            </button>
          </article>
        ))}
      </section>

      <TextField
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        disabled={isSubmitting}
        onChange={setEmail}
        placeholder="name@retailos.com"
        required
        type="email"
        value={email}
      />

      <TextField
        action={
          <a className="field__link" href="#forgot-password">
            Forgot Password?
          </a>
        }
        id="password"
        label="Password"
        name="password"
        autoComplete="current-password"
        disabled={isSubmitting}
        onChange={setPassword}
        placeholder="••••••••"
        required
        trailing={
          <IconButton
            ariaLabel={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? '◌' : '●'}
          </IconButton>
        }
        type={showPassword ? 'text' : 'password'}
        value={password}
      />

      <label className="remember">
        <input name="remember" type="checkbox" />
        <span>Keep me signed in</span>
      </label>

      <Button className="button--primary" disabled={isSubmitting} icon="→" type="submit">
        {isSubmitting ? 'Signing In' : 'Sign In'}
      </Button>

      <p className={`feedback ${feedback ? 'feedback--visible' : ''}`} role="alert">
        <span aria-hidden="true">!</span>
        {feedback || 'Invalid credentials. Please try again.'}
      </p>
    </form>
  )
}
