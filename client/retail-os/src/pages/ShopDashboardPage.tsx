import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { DailyProgress } from '../components/dashboard/DailyProgress'
import { SearchControls } from '../components/dashboard/SearchControls'
import { StoreCard, type StoreCardData } from '../components/dashboard/StoreCard'
import { getStores, type Store } from '../services/stores'

const storeStatuses = ['idle', 'active', 'done', 'action', 'processing'] as const

const getStoreStatus = (index: number): StoreCardData['status'] =>
  storeStatuses[index % storeStatuses.length]

const storeMatchesSearch = (store: Store, search: string): boolean => {
  const term = search.trim().toLowerCase()

  if (!term) {
    return true
  }

  const storeValues = [
    store.storeName,
    store.storeCode,
    store.address,
    store.region,
  ].filter(Boolean)

  return (
    storeValues.some((value) => value?.toLowerCase().includes(term)) ||
    store.skus.some((sku) =>
      [sku.skuName, sku.brand].some((value) => value.toLowerCase().includes(term))
    )
  )
}

const storeMatchesRegion = (store: Store, region: string): boolean =>
  region === 'all' || store.region === region

const formatStoreLocation = (store: Store): string =>
  store.address ?? store.region ?? 'Location unavailable'

const mapStoreToCard = (store: Store, index: number): StoreCardData => {
  const status = getStoreStatus(index)

  return {
    code: store.storeCode,
    name: store.storeName,
    location: formatStoreLocation(store),
    region: store.region,
    status,
    lastSync: '24H AGO',
    skuCount: `${store.skus.length} Items`,
    alertTitle: status === 'action' ? 'Alert: Stock Discrepancy' : undefined,
    alertBody:
      status === 'action'
        ? 'Inventory mismatch detected in SKU category: Beverages. Urgent verification required.'
        : undefined,
  }
}

export function ShopDashboardPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    setIsLoading(true)
    setError('')

    getStores()
      .then((items) => {
        setStores(items)
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Failed to fetch stores'
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [])

  const filteredStores = useMemo(
    () =>
      stores.filter(
        (store) => storeMatchesRegion(store, region) && storeMatchesSearch(store, search)
      ),
    [stores, region, search]
  )

  const regions = useMemo(
    () =>
      Array.from(
        new Set(stores.map((store) => store.region).filter(Boolean) as string[])
      ).sort(),
    [stores]
  )

  const cards = filteredStores.map(mapStoreToCard)

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

        <SearchControls
          onRegionChange={setRegion}
          onSearchChange={setSearch}
          region={region}
          regions={regions}
          search={search}
        />

        {error ? <div className="store-state store-state--error">{error}</div> : null}

        {isLoading ? (
          <div className="store-state">Loading stores...</div>
        ) : cards.length > 0 ? (
          <section className="store-grid" aria-label="Assigned stores">
            {cards.map((store) => (
              <StoreCard key={store.code} store={store} />
            ))}
          </section>
        ) : (
          <div className="store-state">No stores matched your filters.</div>
        )}
      </div>
    </DashboardLayout>
  )
}
