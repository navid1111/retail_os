import type { ReactNode } from 'react'
import { Icon } from '../dashboard/Icon'

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', href: '/admin' },
  { label: 'AI Assistant', icon: 'smart_toy', href: '/admin/assistant' },
  { label: 'User Management', icon: 'group', href: '#' },
]

function AdminNavLink({ item }: { item: (typeof navItems)[number] }) {
  const isActive = window.location.pathname === item.href

  return (
    <a className={`admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`} href={item.href}>
      <Icon filled={isActive} name={item.icon} />
      <span>{item.label}</span>
    </a>
  )
}

export function AdminLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <h1>RetailOS</h1>
          <p>Management Console</p>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {navItems.map((item) => (
            <AdminNavLink item={item} key={item.label} />
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <a className="admin-nav__link" href="#">
            <Icon name="help" />
            <span>Support</span>
          </a>
          <a className="admin-nav__link" href="/login">
            <Icon name="logout" />
            <span>Log Out</span>
          </a>
        </div>
      </aside>

      <main className="admin-shell">
        <header className="admin-topbar">
          <h2>{title}</h2>
          <div className="admin-topbar__actions">
            <button type="button">
              <Icon name="notifications" />
            </button>
            <button type="button">
              <Icon name="settings" />
            </button>
            <div className="admin-avatar">
              <span>A</span>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
