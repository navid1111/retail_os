import './App.css'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ShopDashboardPage } from './pages/ShopDashboardPage'
import { SingleShopPage } from './pages/SingleShopPage'
import { VisitPage } from './pages/VisitPage'
import { AiAnalysisPage } from './pages/AiAnalysisPage'

function App() {
  const path = window.location.pathname

  if (path === '/login') {
    return <LoginPage />
  }

  if (/^\/stores\/[^/]+\/analysis$/.test(path)) {
    const storeId = path.split('/')[2]
    return <AiAnalysisPage storeId={storeId} />
  }

  if (/^\/stores\/[^/]+\/visit$/.test(path)) {
    const storeId = path.split('/')[2]
    return <VisitPage storeId={storeId} />
  }

  if (/^\/stores\/[^/]+$/.test(path)) {
    const storeId = path.split('/')[2]
    return <SingleShopPage storeId={storeId} />
  }

  if (path === '/shop-dashboard' || path === '/stores') {
    return <ShopDashboardPage />
  }

  return <HomePage />
}

export default App
