import { useEffect, useMemo, useState } from 'react'
import { DashboardButton } from '../components/dashboard/DashboardButton'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { Icon } from '../components/dashboard/Icon'
import { getStoreById, type Store, type StoreSku } from '../services/stores'

type SingleShopPageProps = {
  storeId: string
}

function SkuTile({ sku }: { sku: StoreSku }) {
  return (
    <article className="sku-tile">
      <div className="sku-tile__icon">
        <Icon name={sku.isPosm ? 'campaign' : 'local_drink'} />
      </div>
      <div>
        <h4>{sku.skuName}</h4>
        <p>
          {sku.brand} · Facing {sku.minFacing}
        </p>
      </div>
    </article>
  )
}

function GpsStatusCard({ radiusM }: { radiusM: number }) {
  return (
    <section className="detail-card gps-card">
      <div className="gps-card__copy">
        <h3>Distance from store</h3>
        <div className="gps-card__distance">
          <span />
          <strong>
            YOU ARE <b>120M</b> AWAY
          </strong>
        </div>
        <p>
          Radius allowed: <b>{radiusM}m</b>
        </p>
      </div>
      <div className="gps-card__map">
        <img
          alt="Map"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDik1aT8p9hjnJSRalEoaPuv8TemT6uSGfxaX4P6PO2oq_hbAhgAE0AIX5NaLejcFSy-ioSqRjoHiI0GoxnUv2kCKCZs7KR4lM2Z2lonnMOCb8i5QmQM7k8ubumZBAYGORmgjiP0iUNdqqUE_nTLWIX6yytPMRxIzLpowv6h4-HlgCKqejuG6MZesAVBY0f5YY5QMrJP7dJLbRjz_R6c9i_Dabc8zhehJa1Tv4W-m3Xus-f24mj3EoIRWcx-H9fgJK7s7DDQJarQru4"
        />
        <div className="gps-card__pin">
          <span />
          <Icon filled name="location_on" />
        </div>
      </div>
    </section>
  )
}

function TargetProducts({ skus }: { skus: StoreSku[] }) {
  const requiredCount = skus.filter((sku) => sku.isRequired).length

  return (
    <section className="detail-card target-products">
      <div className="detail-section-header">
        <h3>
          Target Products
          <span>{requiredCount} Required</span>
        </h3>
        <button type="button">View All</button>
      </div>
      <div className="sku-grid">
        {skus.map((sku) => (
          <SkuTile key={sku._id} sku={sku} />
        ))}
      </div>
    </section>
  )
}

function CheckInPanel({ createdAt, storeId }: { createdAt: string; storeId: string }) {
  const lastVisitLabel = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(createdAt))

  return (
    <aside className="detail-card checkin-panel">
      <h3>Visit Check-In</h3>
      <div className="last-visit-card">
        <div>
          <span>Last Visit</span>
          <strong>{lastVisitLabel.toUpperCase()}</strong>
        </div>
        <div>
          <span>Compliance</span>
          <strong>82%</strong>
        </div>
      </div>
      <label className="visit-notes" htmlFor="visit-notes">
        <span>Optional Notes</span>
        <textarea id="visit-notes" placeholder="Arrived on time..." rows={4} />
      </label>
      <DashboardButton href={`/stores/${storeId}/visit`} icon="login" tone="primary">
        Check In
      </DashboardButton>
      <p>Data will be synced upon check-in.</p>
    </aside>
  )
}

export function SingleShopPage({ storeId }: SingleShopPageProps) {
  const [store, setStore] = useState<Store | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setError('')

    getStoreById(storeId)
      .then((item) => {
        if (isMounted) {
          setStore(item)
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(
            requestError instanceof Error ? requestError.message : 'Failed to fetch store'
          )
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
  }, [storeId])

  const address = useMemo(
    () => store?.address ?? store?.region ?? 'Location unavailable',
    [store]
  )

  return (
    <DashboardLayout>
      <div className="shop-detail">
        {isLoading ? <div className="store-state">Loading store...</div> : null}
        {error ? <div className="store-state store-state--error">{error}</div> : null}

        {store ? (
          <>
            <nav className="shop-detail__crumb" aria-label="Breadcrumb">
              <a href="/stores">Assigned Stores</a>
              <Icon name="chevron_right" />
              <span>{store.storeName}</span>
            </nav>

            <div className="shop-detail__grid">
              <div className="shop-detail__main">
                <header className="shop-detail__header">
                  <div>
                    <h1>{store.storeName}</h1>
                    <span>#{store.storeCode}</span>
                  </div>
                  <p>
                    <Icon name="location_on" />
                    {address}
                  </p>
                </header>

                <GpsStatusCard radiusM={store.gpsRadiusM} />
                <TargetProducts skus={store.skus} />
              </div>

              <CheckInPanel createdAt={store.createdAt} storeId={store._id} />
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
