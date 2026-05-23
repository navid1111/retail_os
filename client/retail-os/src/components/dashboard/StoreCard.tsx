import { DashboardButton } from './DashboardButton'
import { Icon } from './Icon'

export type StoreStatus = 'idle' | 'active' | 'done' | 'action' | 'processing'

export type StoreCardData = {
  id: string
  code: string
  name: string
  location: string
  status: StoreStatus
  region?: string
  lastSync?: string
  skuCount?: string
  alertTitle?: string
  alertBody?: string
}

const statusLabels: Record<StoreStatus, string> = {
  idle: 'Idle',
  active: 'Active',
  done: 'Done',
  action: 'Action',
  processing: 'Processing',
}

function StatusBadge({ status }: { status: StoreStatus }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {statusLabels[status]}
    </span>
  )
}

export function StoreCard({ store }: { store: StoreCardData }) {
  const className = `store-card store-card--${store.status}`

  return (
    <article className={className}>
      <div className="store-card__top">
        <StatusBadge status={store.status} />
        <span className="store-card__code">#{store.code}</span>
      </div>

      <h3>{store.name}</h3>
      <p className="store-card__location">
        <Icon name="location_on" />
        {store.location}
      </p>

      {store.region ? <div className="store-card__region">{store.region}</div> : null}

      <div className="store-card__stats">
        <div>
          <span>Last Sync</span>
          <strong>{store.lastSync}</strong>
        </div>
        <div>
          <span>SKU Count</span>
          <strong>{store.skuCount}</strong>
        </div>
      </div>

      <DashboardButton href={`/stores/${store.id}`} icon="arrow_forward" tone="primary">
        Initiate Visit
      </DashboardButton>
    </article>
  )
}
