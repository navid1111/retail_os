import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { DailyProgress } from '../components/dashboard/DailyProgress'
import { SearchControls } from '../components/dashboard/SearchControls'
import { StoreCard, type StoreCardData } from '../components/dashboard/StoreCard'

const stores: StoreCardData[] = [
  {
    code: 'DHK-001',
    name: 'Dhaka Outlet',
    location: 'Gulshan-1, Dhaka',
    status: 'idle',
    lastSync: '24H AGO',
    skuCount: '128 Items',
  },
  {
    code: 'DHK-002',
    name: 'Jamuna Store',
    location: 'Banani Main Rd.',
    status: 'active',
  },
  {
    code: 'DHK-003',
    name: 'Metro Retail',
    location: 'Dhanmondi 27',
    status: 'done',
  },
  {
    code: 'DHK-005',
    name: 'City Center',
    location: 'Motijheel Commercial',
    status: 'action',
    alertTitle: 'Alert: Stock Discrepancy',
    alertBody:
      'Inventory mismatch detected in SKU category: Beverages. Urgent verification required.',
  },
  {
    code: 'DHK-004',
    name: 'Plaza Mart',
    location: 'Mirpur Section 10',
    status: 'processing',
  },
]

export function ShopDashboardPage() {
  return (
    <DashboardLayout>
      <div className="dashboard-content">
        <section className="dashboard-hero">
          <div>
            <h1>Good Morning, Navid</h1>
            <p>Review and execute your store route for today.</p>
          </div>
          <DailyProgress />
        </section>

        <SearchControls />

        <section className="store-grid" aria-label="Assigned stores">
          {stores.map((store) => (
            <StoreCard key={store.code} store={store} />
          ))}
        </section>
      </div>
    </DashboardLayout>
  )
}
