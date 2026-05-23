import type { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  icon?: ReactNode
  type?: 'button' | 'submit'
  onClick?: () => void
  className?: string
  ariaLabel?: string
  disabled?: boolean
}

export function Button({
  children,
  icon,
  type = 'button',
  onClick,
  className = '',
  ariaLabel,
  disabled = false,
}: ButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={`button ${className}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      <span>{children}</span>
      {icon ? <span className="button__icon">{icon}</span> : null}
    </button>
  )
}

type IconButtonProps = {
  ariaLabel: string
  children: ReactNode
  onClick: () => void
}

export function IconButton({ ariaLabel, children, onClick }: IconButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className="icon-button"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}
