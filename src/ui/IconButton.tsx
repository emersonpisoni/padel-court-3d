import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  className?: string
  /** Mostra o texto ao lado do ícone. */
  showLabel?: boolean
  text?: string
}

export function IconButton({ icon: Icon, label, onClick, active, disabled, className = '', showLabel, text }: Props) {
  return (
    <button
      type="button"
      className={`icon-btn ${active ? 'active' : ''} ${showLabel ? 'with-label' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon size={18} strokeWidth={2} />
      {showLabel && <span>{text ?? label}</span>}
    </button>
  )
}
