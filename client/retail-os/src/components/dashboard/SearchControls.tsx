import { DashboardButton } from './DashboardButton'
import { Icon } from './Icon'

export function SearchControls() {
  return (
    <section className="store-controls" aria-label="Store controls">
      <label className="store-search">
        <Icon name="search" />
        <input
          placeholder="Search stores, regions, or priority assets..."
          type="text"
        />
      </label>
      <div className="store-controls__actions">
        <DashboardButton icon="tune">Refine</DashboardButton>
        <DashboardButton icon="add" tone="primary">
          Add Store
        </DashboardButton>
      </div>
    </section>
  )
}
