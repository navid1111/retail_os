import { BrandMark } from '../components/BrandMark'
import { Footer } from '../components/Footer'
import { LoginForm } from '../components/LoginForm'
import { VisualPanel } from '../components/VisualPanel'

export function LoginPage() {
  return (
    <main className="login-page">
      <VisualPanel />
      <section className="workspace" aria-labelledby="login-title">
        <div className="workspace__body">
          <div className="login-card">
            <BrandMark />
            <div className="login-heading">
              <h1 id="login-title">Sign in to Ops Control</h1>
              <p>Enter your credentials to manage your flagship environment.</p>
            </div>
            <LoginForm />
          </div>
        </div>
        <Footer />
      </section>
    </main>
  )
}
