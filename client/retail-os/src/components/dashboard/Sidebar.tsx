import { Icon } from './Icon'

const primaryItems = [
  { label: 'Dashboard', icon: 'dashboard', href: '/' },
  { label: 'Store List', icon: 'storefront', href: '/stores' },
  { label: 'Visit Feed', icon: 'assignment', href: '/visits' },
  { label: 'Fraud Panel', icon: 'gavel', href: '/fraud' },
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
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar__brand">
        <h1>RetailOS</h1>
        <p>Execution Hub</p>
      </div>

      <nav className="dashboard-sidebar__section" aria-label="Main navigation">
        {primaryItems.map((item) => (
          <SidebarLink item={item} key={item.label} />
        ))}
      </nav>

      <div className="dashboard-sidebar__footer">
        {secondaryItems.map((item) => (
          <SidebarLink item={item} key={item.label} />
        ))}
      </div>
    </aside>
  )
}
