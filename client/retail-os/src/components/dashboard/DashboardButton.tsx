import type { ReactNode } from 'react'
import { Icon } from './Icon'

type DashboardButtonProps = {
  children: ReactNode
  icon?: string
  tone?: 'primary' | 'secondary' | 'danger'
}

export function DashboardButton({
  children,
  icon,
  tone = 'secondary',
}: DashboardButtonProps) {
  return (
    <button className={`dashboard-button dashboard-button--${tone}`} type="button">
      <span>{children}</span>
      {icon ? <Icon name={icon} /> : null}
    </button>
  )
}
