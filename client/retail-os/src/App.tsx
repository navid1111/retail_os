import './App.css'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ShopDashboardPage } from './pages/ShopDashboardPage'

function App() {
  const path = window.location.pathname

  if (path === '/login') {
    return <LoginPage />
  }

  if (path === '/shop-dashboard' || path === '/stores') {
    return <ShopDashboardPage />
  }

  return <HomePage />
}

export default App
