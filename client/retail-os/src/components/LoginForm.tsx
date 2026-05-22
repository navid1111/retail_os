import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button, IconButton } from './Button'
import { TextField } from './TextField'
import { signInWithEmail } from '../services/auth'

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
      await signInWithEmail({ email, password })
      window.location.assign('/')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid credentials. Please try again.'
      setFeedback(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
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
