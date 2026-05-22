import type { ReactNode } from 'react'
import { Icon } from './Icon'

type DashboardButtonProps = {
  children: ReactNode
  icon?: string
  tone?: 'primary' | 'secondary' | 'danger'
  href?: string
}

export function DashboardButton({
  children,
  icon,
  tone = 'secondary',
  href,
}: DashboardButtonProps) {
  if (href) {
    return (
      <a className={`dashboard-button dashboard-button--${tone}`} href={href}>
        <span>{children}</span>
        {icon ? <Icon name={icon} /> : null}
      </a>
    )
  }

  return (
    <button className={`dashboard-button dashboard-button--${tone}`} type="button">
      <span>{children}</span>
      {icon ? <Icon name={icon} /> : null}
    </button>
  )
}
