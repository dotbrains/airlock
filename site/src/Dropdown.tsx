import { type ReactNode, useEffect, useRef, useState } from 'react'

export type Option = { value: string; name: string; label?: string }

// A custom listbox shared by every dropdown on the page, so each option can
// show a logo (browsers) or read uniformly (TTL) — a native <select> can only
// render plain text and can't be themed consistently across platforms.
export default function Dropdown({
  value,
  onChange,
  options,
  renderIcon,
}: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  renderIcon?: (value: string) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(() =>
    Math.max(0, options.findIndex((o) => o.value === value)),
  )
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const choose = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(options[active].value)
    }
  }

  return (
    <div className="adrop" ref={ref}>
      <button
        type="button"
        className="adrop-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
      >
        {renderIcon?.(selected.value)}
        <span className="adrop-name">
          {selected.name}
          {selected.label ? <span className="adrop-label"> — {selected.label}</span> : null}
        </span>
        <span className="adrop-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul className="adrop-list" role="listbox" tabIndex={-1}>
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={
                'adrop-opt' +
                (o.value === value ? ' sel' : '') +
                (i === active ? ' active' : '')
              }
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
            >
              {renderIcon?.(o.value)}
              <span className="adrop-name">
                {o.name}
                {o.label ? <span className="adrop-label"> — {o.label}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
