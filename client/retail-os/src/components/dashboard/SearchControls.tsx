import { DashboardButton } from './DashboardButton'
import { Icon } from './Icon'

type SearchControlsProps = {
  search: string
  region: string
  regions: string[]
  onSearchChange: (value: string) => void
  onRegionChange: (value: string) => void
}

export function SearchControls({
  search,
  region,
  regions,
  onSearchChange,
  onRegionChange,
}: SearchControlsProps) {
  return (
    <section className="store-controls" aria-label="Store controls">
      <label className="store-search">
        <Icon name="search" />
        <input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search stores, regions, or priority assets..."
          type="text"
          value={search}
        />
      </label>
      <div className="store-controls__actions">
        <label className="store-filter">
          <Icon name="tune" />
          <select
            aria-label="Filter stores by region"
            onChange={(event) => onRegionChange(event.target.value)}
            value={region}
          >
            <option value="all">All Regions</option>
            {regions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <DashboardButton icon="add" tone="primary">
          Add Store
        </DashboardButton>
      </div>
    </section>
  )
}
