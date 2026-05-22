import './App.css'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'

function App() {
  const path = window.location.pathname

  if (path === '/login') {
    return <LoginPage />
  }

  return <HomePage />
}

export default App
