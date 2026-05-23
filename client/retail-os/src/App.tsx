import './App.css'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { ShopDashboardPage } from './pages/ShopDashboardPage'
import { SingleShopPage } from './pages/SingleShopPage'
import { VisitPage } from './pages/VisitPage'
import { AiAnalysisPage } from './pages/AiAnalysisPage'
import { VisitFeedPage } from './pages/VisitFeedPage'
import { ImageHistoryPage } from './pages/ImageHistoryPage'
import { AdminAssistantPage } from './pages/AdminAssistantPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AdminGuard } from './components/admin/AdminGuard'
import { RepGuard } from './components/dashboard/RepGuard'

function App() {
  const path = window.location.pathname

  if (path === '/login') {
    return <LoginPage />
  }

  if (path === '/visits') {
    return (
      <RepGuard>
        <VisitFeedPage />
      </RepGuard>
    )
  }

  if (path === '/image-history') {
    return (
      <RepGuard>
        <ImageHistoryPage />
      </RepGuard>
    )
  }

  if (path === '/admin/users') {
    return (
      <AdminGuard>
        <AdminUsersPage />
      </AdminGuard>
    )
  }

  if (path === '/admin' || path === '/admin/assistant') {
    return (
      <AdminGuard>
        <AdminAssistantPage />
      </AdminGuard>
    )
  }

  if (/^\/stores\/[^/]+\/analysis$/.test(path)) {
    const storeId = path.split('/')[2]
    return (
      <RepGuard>
        <AiAnalysisPage storeId={storeId} />
      </RepGuard>
    )
  }

  if (/^\/stores\/[^/]+\/visit$/.test(path)) {
    const storeId = path.split('/')[2]
    return (
      <RepGuard>
        <VisitPage storeId={storeId} />
      </RepGuard>
    )
  }

  if (/^\/stores\/[^/]+$/.test(path)) {
    const storeId = path.split('/')[2]
    return (
      <RepGuard>
        <SingleShopPage storeId={storeId} />
      </RepGuard>
    )
  }

  if (path === '/shop-dashboard' || path === '/stores') {
    return (
      <RepGuard>
        <ShopDashboardPage />
      </RepGuard>
    )
  }

  return (
    <RepGuard>
      <HomePage />
    </RepGuard>
  )
}

export default App
