import type { ReactNode } from 'react'

type TextFieldProps = {
  id: string
  label: string
  name: string
  placeholder: string
  type?: string
  value?: string
  onChange?: (value: string) => void
  action?: ReactNode
  trailing?: ReactNode
  autoComplete?: string
  disabled?: boolean
  required?: boolean
}

export function TextField({
  id,
  label,
  name,
  placeholder,
  type = 'text',
  value,
  onChange,
  action,
  trailing,
  autoComplete,
  disabled = false,
  required = false,
}: TextFieldProps) {
  return (
    <div className="field">
      <div className="field__label-row">
        <label className="field__label" htmlFor={id}>
          {label}
        </label>
        {action}
      </div>
      <div className="field__control-wrap">
        <input
          className="field__control"
          autoComplete={autoComplete}
          disabled={disabled}
          id={id}
          name={name}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          required={required}
          type={type}
          value={value}
        />
        {trailing ? <div className="field__trailing">{trailing}</div> : null}
      </div>
    </div>
  )
}
