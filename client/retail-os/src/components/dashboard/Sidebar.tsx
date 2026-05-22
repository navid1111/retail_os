import { Icon } from './Icon'

const primaryItems = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Store List', icon: 'storefront', active: true },
  { label: 'Visit Feed', icon: 'assignment' },
  { label: 'Fraud Panel', icon: 'gavel' },
  { label: 'Image History', icon: 'image' },
]

const secondaryItems = [
  { label: 'Support', icon: 'contact_support' },
  { label: 'Settings', icon: 'settings' },
]

type NavItem = {
  label: string
  icon: string
  active?: boolean
}

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <a
      className={`dashboard-sidebar__link ${
        item.active ? 'dashboard-sidebar__link--active' : ''
      }`}
      href="#"
    >
      <Icon filled={item.active} name={item.icon} />
      <span>{item.label}</span>
    </a>
  )
}

export function Sidebar() {
  return (
    <nav className="dashboard-sidebar" aria-label="Main navigation">
      <div className="dashboard-sidebar__brand">
        <div className="dashboard-sidebar__mark">R</div>
        <div>
          <div className="dashboard-sidebar__name">RetailOS</div>
          <div className="dashboard-sidebar__eyebrow">Execution Hub</div>
        </div>
      </div>

      <div className="dashboard-sidebar__section">
        {primaryItems.map((item) => (
          <SidebarLink item={item} key={item.label} />
        ))}
      </div>

      <div className="dashboard-sidebar__footer">
        {secondaryItems.map((item) => (
          <SidebarLink item={item} key={item.label} />
        ))}
      </div>
    </nav>
  )
}
