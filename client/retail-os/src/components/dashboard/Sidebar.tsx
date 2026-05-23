import { Icon } from './Icon'

const primaryItems = [
  { label: 'Dashboard', icon: 'dashboard', href: '/' },
  { label: 'Store List', icon: 'storefront', href: '/stores' },
  { label: 'Visit Feed', icon: 'assignment', href: '/visits' },
  { label: 'Fraud Panel', icon: 'gavel', href: '#' },
  { label: 'Image History', icon: 'image', href: '/image-history' },
]

const secondaryItems = [
  { label: 'Support', icon: 'contact_support', href: '#' },
  { label: 'Settings', icon: 'settings', href: '#' },
]

type NavItem = {
  label: string
  icon: string
  href: string
}

function SidebarLink({ item }: { item: NavItem }) {
  const path = window.location.pathname
  const isActive =
    item.href === '/stores'
      ? path === '/stores' || path === '/shop-dashboard' || path.startsWith('/stores/')
      : path === item.href

  return (
    <a
      className={`dashboard-sidebar__link ${
        isActive ? 'dashboard-sidebar__link--active' : ''
      }`}
      href={item.href}
    >
      <Icon filled={isActive} name={item.icon} />
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
