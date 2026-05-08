import type { ReactNode } from 'react'

export function SectionCard({
  title,
  subtitle,
  children,
  footer,
  action,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="plc-card">
      <div className="plc-card-head">
        <div>
          <h2 className="plc-card-title">{title}</h2>
          <p className="plc-card-sub">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="plc-card-body">{children}</div>
      {footer ? <div className="plc-card-footer">{footer}</div> : null}
    </div>
  )
}

export function FieldBox({
  width,
  children,
}: {
  width: number
  children: ReactNode
}) {
  return (
    <div className="plc-field-box" style={{ width, maxWidth: '100%' }}>
      {children}
    </div>
  )
}

export function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="plc-pill">
      <span className="plc-pill-label">{label}</span>
      <span className="plc-pill-value">{value}</span>
    </div>
  )
}

export function ToggleRow({
  title,
  value,
  onChange,
  disabled,
}: {
  title: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`plc-toggle-row ${disabled ? 'is-disabled' : ''}`}>
      <span>{title}</span>
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="plc-empty">
      <p className="plc-error-text">{message}</p>
      <button type="button" className="plc-btn plc-btn-primary" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

export function EmptyState({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <div className="plc-empty">
      <h3 className="plc-empty-title">{title}</h3>
      <p className="plc-empty-sub">{subtitle}</p>
    </div>
  )
}
