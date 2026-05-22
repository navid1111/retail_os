import { DashboardButton } from './DashboardButton'
import { Icon } from './Icon'

export type StoreStatus = 'idle' | 'active' | 'done' | 'action' | 'processing'

export type StoreCardData = {
  code: string
  name: string
  location: string
  status: StoreStatus
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
      {store.status === 'action' ? (
        <Icon className="store-card__flag" name="priority_high" />
      ) : null}

      <div className="store-card__top">
        <StatusBadge status={store.status} />
        <span className="store-card__code">#{store.code}</span>
      </div>

      <h3>{store.name}</h3>
      <p className="store-card__location">
        <Icon name="location_on" />
        {store.location}
      </p>

      {store.status === 'idle' ? (
        <>
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
          <DashboardButton icon="arrow_forward" tone="primary">
            Initiate Visit
          </DashboardButton>
        </>
      ) : null}

      {store.status === 'active' ? (
        <>
          <div className="capture-status">
            <Icon name="sync" />
            <span>Capture in progress</span>
          </div>
          <DashboardButton icon="shortcut">Resume Tasks</DashboardButton>
        </>
      ) : null}

      {store.status === 'done' ? (
        <div className="verified-status">
          <Icon name="check_circle" />
          <span>Verified &amp; Synced</span>
        </div>
      ) : null}

      {store.status === 'action' ? (
        <>
          <div className="alert-block">
            <strong>{store.alertTitle}</strong>
            <p>{store.alertBody}</p>
          </div>
          <DashboardButton icon="warning" tone="danger">
            Review Flags
          </DashboardButton>
        </>
      ) : null}

      {store.status === 'processing' ? (
        <>
          <div className="processing-meter">
            <div />
          </div>
          <div className="processing-label">Analyzing Frame 142/200</div>
          <div className="ai-health">
            <span>Shelf AI Health</span>
            <div>
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </>
      ) : null}
    </article>
  )
}
